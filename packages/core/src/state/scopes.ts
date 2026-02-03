/**
 * State scope utilities
 */

import type { StateScope } from '@furlow/schema';
import type { StateKey } from './types.js';

/**
 * Build a storage key from scope and identifiers
 */
export function buildStorageKey(key: StateKey): string {
  const parts = [key.scope, key.name];

  switch (key.scope) {
    case 'global':
      break;
    case 'guild':
      if (!key.guildId) throw new Error('guildId required for guild scope');
      parts.push(key.guildId);
      break;
    case 'channel':
      if (!key.channelId) throw new Error('channelId required for channel scope');
      parts.push(key.channelId);
      break;
    case 'user':
      if (!key.userId) throw new Error('userId required for user scope');
      parts.push(key.userId);
      break;
    case 'member':
      if (!key.guildId) throw new Error('guildId required for member scope');
      if (!key.userId) throw new Error('userId required for member scope');
      parts.push(key.guildId, key.userId);
      break;
    default:
      throw new Error(`Unknown scope: ${key.scope}`);
  }

  return parts.join(':');
}

/**
 * Parse a storage key back to StateKey
 */
export function parseStorageKey(storageKey: string): StateKey {
  const parts = storageKey.split(':');
  const scope = parts[0] as StateScope;
  const name = parts[1] ?? '';

  const key: StateKey = { name, scope };

  switch (scope) {
    case 'global':
      break;
    case 'guild':
      key.guildId = parts[2];
      break;
    case 'channel':
      key.channelId = parts[2];
      break;
    case 'user':
      key.userId = parts[2];
      break;
    case 'member':
      key.guildId = parts[2];
      key.userId = parts[3];
      break;
  }

  return key;
}

/**
 * Get the default scope for a variable if not specified
 */
export function getDefaultScope(varName: string): StateScope {
  // Convention: variables starting with _ are global
  if (varName.startsWith('_')) {
    return 'global';
  }
  // Default to guild scope
  return 'guild';
}

/**
 * Validate scope requirements
 */
export function validateScopeContext(
  scope: StateScope,
  context: { guildId?: string; channelId?: string; userId?: string }
): boolean {
  switch (scope) {
    case 'global':
      return true;
    case 'guild':
      return !!context.guildId;
    case 'channel':
      return !!context.channelId;
    case 'user':
      return !!context.userId;
    case 'member':
      return !!context.guildId && !!context.userId;
    default:
      return false;
  }
}
