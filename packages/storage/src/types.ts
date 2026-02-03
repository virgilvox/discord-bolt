/**
 * Storage adapter types
 */

import type { TableDefinition } from '@furlow/schema';

export interface StoredValue {
  value: unknown;
  type: string;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface StorageAdapter {
  /** Get a value */
  get(key: string): Promise<StoredValue | null>;
  /** Set a value */
  set(key: string, value: StoredValue): Promise<void>;
  /** Delete a value */
  delete(key: string): Promise<boolean>;
  /** Check if a key exists */
  has(key: string): Promise<boolean>;
  /** Get all keys matching a pattern */
  keys(pattern?: string): Promise<string[]>;
  /** Clear all data */
  clear(): Promise<void>;

  // Table operations
  /** Create a table */
  createTable(name: string, definition: TableDefinition): Promise<void>;
  /** Insert a row */
  insert(table: string, data: Record<string, unknown>): Promise<void>;
  /** Update rows */
  update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<number>;
  /** Delete rows */
  deleteRows(table: string, where: Record<string, unknown>): Promise<number>;
  /** Query rows */
  query(
    table: string,
    options: QueryOptions
  ): Promise<Record<string, unknown>[]>;

  /** Close the connection */
  close(): Promise<void>;
}

export interface QueryOptions {
  where?: Record<string, unknown>;
  select?: string[];
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export interface TableColumn {
  type: 'string' | 'number' | 'boolean' | 'json' | 'timestamp';
  primary?: boolean;
  nullable?: boolean;
  default?: unknown;
  unique?: boolean;
  index?: boolean;
}

export type { TableDefinition };
