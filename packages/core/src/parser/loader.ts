/**
 * YAML loader with import resolution and validation
 */

import { parse, YAMLParseError } from 'yaml';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import type { FurlowSpec } from '@furlow/schema';
import { validateFurlowSpec, formatValidationErrors } from '@furlow/schema';
import {
  YamlSyntaxError,
  ImportNotFoundError,
  CircularImportError,
  SchemaValidationError,
} from '../errors/index.js';
import { resolveEnvVariables } from './env.js';

export interface LoaderOptions {
  /** Base directory for resolving relative imports */
  baseDir?: string;
  /** Whether to validate against schema */
  validate?: boolean;
  /** Whether to resolve environment variables */
  resolveEnv?: boolean;
  /** Custom environment variables (defaults to process.env) */
  env?: Record<string, string | undefined>;
}

export interface LoadResult {
  spec: FurlowSpec;
  files: string[];
}

const FURLOW_EXTENSIONS = ['.furlow.yaml', '.furlow.yml', '.bolt.yaml', '.bolt.yml', '.yaml', '.yml'];

async function fileExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function resolveImportPath(
  importPath: string,
  fromDir: string
): Promise<string | null> {
  // If it's an absolute path or has extension, try directly
  const fullPath = resolve(fromDir, importPath);

  if (await fileExists(fullPath)) {
    return fullPath;
  }

  // Try adding extensions
  for (const ext of FURLOW_EXTENSIONS) {
    const pathWithExt = fullPath + ext;
    if (await fileExists(pathWithExt)) {
      return pathWithExt;
    }
  }

  // If no extension in original path, try as directory with index
  if (!extname(importPath)) {
    for (const ext of FURLOW_EXTENSIONS) {
      const indexPath = resolve(fullPath, `index${ext}`);
      if (await fileExists(indexPath)) {
        return indexPath;
      }
    }
  }

  return null;
}

async function loadYamlFile(
  filePath: string,
  options: LoaderOptions
): Promise<unknown> {
  let content: string;

  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new ImportNotFoundError(filePath);
  }

  // Resolve environment variables before parsing
  if (options.resolveEnv !== false) {
    content = resolveEnvVariables(content, options.env ?? process.env, filePath);
  }

  try {
    return parse(content, {
      prettyErrors: true,
    });
  } catch (err) {
    if (err instanceof YAMLParseError) {
      throw new YamlSyntaxError(
        err.message,
        filePath,
        err.linePos?.[0]?.line,
        err.linePos?.[0]?.col
      );
    }
    throw err;
  }
}

function mergeSpecs(base: FurlowSpec, imported: FurlowSpec): FurlowSpec {
  return {
    ...base,
    // Merge arrays
    commands: [...(base.commands ?? []), ...(imported.commands ?? [])],
    context_menus: [...(base.context_menus ?? []), ...(imported.context_menus ?? [])],
    events: [...(base.events ?? []), ...(imported.events ?? [])],
    flows: [...(base.flows ?? []), ...(imported.flows ?? [])],
    builtins: [...(base.builtins ?? []), ...(imported.builtins ?? [])],
    // Merge objects
    pipes: { ...base.pipes, ...imported.pipes },
    components: {
      buttons: { ...base.components?.buttons, ...imported.components?.buttons },
      selects: { ...base.components?.selects, ...imported.components?.selects },
      modals: { ...base.components?.modals, ...imported.components?.modals },
    },
    embeds: {
      theme: imported.embeds?.theme ?? base.embeds?.theme,
      templates: { ...base.embeds?.templates, ...imported.embeds?.templates },
    },
    state: {
      ...base.state,
      ...imported.state,
      variables: { ...base.state?.variables, ...imported.state?.variables },
      tables: { ...base.state?.tables, ...imported.state?.tables },
    },
    // Override scalar values if present in imported
    identity: imported.identity ?? base.identity,
    presence: imported.presence ?? base.presence,
    intents: imported.intents ?? base.intents,
    gateway: imported.gateway ?? base.gateway,
    permissions: imported.permissions ?? base.permissions,
    voice: imported.voice ?? base.voice,
    video: imported.video ?? base.video,
    automod: imported.automod ?? base.automod,
    scheduler: imported.scheduler ?? base.scheduler,
    locale: imported.locale ?? base.locale,
    canvas: imported.canvas ?? base.canvas,
    analytics: imported.analytics ?? base.analytics,
    dashboard: imported.dashboard ?? base.dashboard,
    errors: imported.errors ?? base.errors,
    theme: imported.theme ?? base.theme,
  };
}

async function loadWithImports(
  filePath: string,
  options: LoaderOptions,
  visited: Set<string>,
  importStack: string[]
): Promise<{ spec: FurlowSpec; files: string[] }> {
  const resolvedPath = resolve(filePath);

  // Check for circular imports
  if (visited.has(resolvedPath)) {
    throw new CircularImportError([...importStack, resolvedPath]);
  }

  visited.add(resolvedPath);
  importStack.push(resolvedPath);

  const data = await loadYamlFile(resolvedPath, options);
  let spec = data as FurlowSpec;
  const files = [resolvedPath];
  const fileDir = dirname(resolvedPath);

  // Process imports
  if (spec.imports && Array.isArray(spec.imports)) {
    for (const imp of spec.imports) {
      const importPath = typeof imp === 'string' ? imp : imp.path;
      const resolved = await resolveImportPath(importPath, fileDir);

      if (!resolved) {
        throw new ImportNotFoundError(importPath, resolvedPath);
      }

      const { spec: importedSpec, files: importedFiles } = await loadWithImports(
        resolved,
        options,
        visited,
        importStack
      );

      spec = mergeSpecs(spec, importedSpec);
      files.push(...importedFiles);
    }
  }

  importStack.pop();

  // Remove imports from final spec
  delete (spec as { imports?: unknown }).imports;

  return { spec, files };
}

/**
 * Load a FURLOW specification from a file
 */
export async function loadSpec(
  filePath: string,
  options: LoaderOptions = {}
): Promise<LoadResult> {
  const baseDir = options.baseDir ?? dirname(resolve(filePath));
  const resolvedPath = resolve(baseDir, filePath);

  const { spec, files } = await loadWithImports(
    resolvedPath,
    options,
    new Set(),
    []
  );

  // Validate if requested
  if (options.validate !== false) {
    const result = validateFurlowSpec(spec);
    if (!result.valid) {
      throw new SchemaValidationError(
        result.errors.map((e) => ({ path: e.path, message: e.message })),
        resolvedPath
      );
    }
  }

  return { spec, files };
}

/**
 * Load a FURLOW specification from a YAML string
 */
export function loadSpecFromString(
  content: string,
  options: Omit<LoaderOptions, 'baseDir'> = {}
): FurlowSpec {
  // Resolve environment variables
  if (options.resolveEnv !== false) {
    content = resolveEnvVariables(content, options.env ?? process.env);
  }

  let spec: FurlowSpec;
  try {
    spec = parse(content) as FurlowSpec;
  } catch (err) {
    if (err instanceof YAMLParseError) {
      throw new YamlSyntaxError(
        err.message,
        undefined,
        err.linePos?.[0]?.line,
        err.linePos?.[0]?.col
      );
    }
    throw err;
  }

  // Validate if requested
  if (options.validate !== false) {
    const result = validateFurlowSpec(spec);
    if (!result.valid) {
      throw new SchemaValidationError(
        result.errors.map((e) => ({ path: e.path, message: e.message }))
      );
    }
  }

  return spec;
}
