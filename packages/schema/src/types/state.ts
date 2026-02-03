/**
 * State and Storage types
 */

import type { StateScope, Duration } from './common.js';

/** Variable definition */
export interface VariableDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: unknown;
  scope?: StateScope;
  persist?: boolean;
  ttl?: Duration;
}

/** Table column definition */
export interface TableColumn {
  type: 'string' | 'number' | 'boolean' | 'json' | 'timestamp';
  primary?: boolean;
  nullable?: boolean;
  default?: unknown;
  unique?: boolean;
  index?: boolean;
}

/** Table definition */
export interface TableDefinition {
  columns: Record<string, TableColumn>;
  indexes?: string[][];
}

/** Cache configuration */
export interface CacheConfig {
  enabled?: boolean;
  max_size?: number;
  ttl?: Duration;
}

/** Storage backend configuration */
export interface StorageConfig {
  type: 'sqlite' | 'postgres' | 'memory';
  path?: string;
  url?: string;
  pool?: {
    min?: number;
    max?: number;
  };
}

/** State configuration */
export interface StateConfig {
  variables?: Record<string, VariableDefinition>;
  tables?: Record<string, TableDefinition>;
  cache?: CacheConfig;
  storage?: StorageConfig;
}
