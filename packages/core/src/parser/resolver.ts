/**
 * Path and reference resolver
 */

import { resolve, dirname, isAbsolute } from 'node:path';

/**
 * Resolve a path relative to a base directory
 */
export function resolvePath(path: string, baseDir: string): string {
  if (isAbsolute(path)) {
    return path;
  }
  return resolve(baseDir, path);
}

/**
 * Get the directory containing a file
 */
export function getFileDir(filePath: string): string {
  return dirname(filePath);
}

/**
 * Check if a path is a URL
 */
export function isUrl(path: string): boolean {
  try {
    const url = new URL(path);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Resolve a reference that could be a path, URL, or asset reference
 */
export function resolveReference(
  ref: string,
  baseDir: string
): { type: 'path' | 'url'; value: string } {
  if (isUrl(ref)) {
    return { type: 'url', value: ref };
  }
  return { type: 'path', value: resolvePath(ref, baseDir) };
}
