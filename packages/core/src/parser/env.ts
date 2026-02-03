/**
 * Environment variable resolution
 */

import { EnvNotFoundError } from '../errors/index.js';

const ENV_PATTERN = /\$env\.([A-Z_][A-Z0-9_]*)/gi;

/**
 * Resolve environment variable references in a string
 */
export function resolveEnvVariables(
  content: string,
  env: Record<string, string | undefined>,
  file?: string
): string {
  let lineNumber = 1;
  let lastNewlineIndex = 0;

  return content.replace(ENV_PATTERN, (match, varName, offset) => {
    // Calculate line number for error reporting
    const contentUpToMatch = content.slice(0, offset);
    lineNumber = (contentUpToMatch.match(/\n/g) ?? []).length + 1;

    const value = env[varName];
    if (value === undefined) {
      throw new EnvNotFoundError(varName, file, lineNumber);
    }
    return value;
  });
}

/**
 * Check if a string contains environment variable references
 */
export function hasEnvReferences(content: string): boolean {
  return ENV_PATTERN.test(content);
}

/**
 * Extract all environment variable names from a string
 */
export function extractEnvVarNames(content: string): string[] {
  const matches = content.matchAll(ENV_PATTERN);
  return [...new Set([...matches].map((m) => m[1] as string))];
}
