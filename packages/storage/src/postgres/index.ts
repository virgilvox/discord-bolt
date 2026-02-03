/**
 * PostgreSQL storage adapter
 */

import { Pool, type PoolConfig } from 'pg';
import type { StorageAdapter, StoredValue, QueryOptions, TableDefinition, TableColumn } from '../types.js';

export interface PostgresOptions extends PoolConfig {
  url?: string;
}

export class PostgresAdapter implements StorageAdapter {
  private pool: Pool;
  private tables: Set<string> = new Set();
  private initialized = false;

  constructor(options: PostgresOptions = {}) {
    if (options.url) {
      this.pool = new Pool({ connectionString: options.url });
    } else {
      this.pool = new Pool(options);
    }
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS furlow_kv (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        type TEXT NOT NULL,
        expires_at BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_furlow_kv_expires
      ON furlow_kv(expires_at)
      WHERE expires_at IS NOT NULL
    `);

    this.initialized = true;
  }

  async get(key: string): Promise<StoredValue | null> {
    await this.init();

    const result = await this.pool.query(
      'SELECT * FROM furlow_kv WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    // Check expiration
    if (row.expires_at && row.expires_at < Date.now()) {
      await this.pool.query('DELETE FROM furlow_kv WHERE key = $1', [key]);
      return null;
    }

    return {
      value: row.value,
      type: row.type,
      expiresAt: row.expires_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async set(key: string, value: StoredValue): Promise<void> {
    await this.init();

    await this.pool.query(
      `
      INSERT INTO furlow_kv (key, value, type, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        type = EXCLUDED.type,
        expires_at = EXCLUDED.expires_at,
        updated_at = EXCLUDED.updated_at
      `,
      [
        key,
        JSON.stringify(value.value),
        value.type,
        value.expiresAt ?? null,
        value.createdAt,
        value.updatedAt,
      ]
    );
  }

  async delete(key: string): Promise<boolean> {
    await this.init();

    const result = await this.pool.query(
      'DELETE FROM furlow_kv WHERE key = $1',
      [key]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async has(key: string): Promise<boolean> {
    await this.init();

    const result = await this.pool.query(
      'SELECT 1 FROM furlow_kv WHERE key = $1 AND (expires_at IS NULL OR expires_at > $2)',
      [key, Date.now()]
    );
    return result.rows.length > 0;
  }

  async keys(pattern?: string): Promise<string[]> {
    await this.init();

    let query = 'SELECT key FROM furlow_kv WHERE (expires_at IS NULL OR expires_at > $1)';
    const params: (string | number)[] = [Date.now()];

    if (pattern) {
      // Convert glob to SQL LIKE
      const sqlPattern = pattern.replace(/\*/g, '%').replace(/\?/g, '_');
      query += ' AND key LIKE $2';
      params.push(sqlPattern);
    }

    const result = await this.pool.query(query, params);
    return result.rows.map((r) => r.key);
  }

  async clear(): Promise<void> {
    await this.init();
    await this.pool.query('DELETE FROM furlow_kv');
  }

  async createTable(name: string, definition: TableDefinition): Promise<void> {
    if (this.tables.has(name)) return;

    const columns: string[] = [];
    const indexes: string[] = [];

    for (const [colName, columnDef] of Object.entries(definition.columns)) {
      const col = columnDef as TableColumn;
      let sqlType: string;
      switch (col.type) {
        case 'string':
          sqlType = 'TEXT';
          break;
        case 'number':
          sqlType = 'DOUBLE PRECISION';
          break;
        case 'boolean':
          sqlType = 'BOOLEAN';
          break;
        case 'json':
          sqlType = 'JSONB';
          break;
        case 'timestamp':
          sqlType = 'BIGINT';
          break;
        default:
          sqlType = 'TEXT';
      }

      let colStr = `${colName} ${sqlType}`;

      if (col.primary) {
        colStr += ' PRIMARY KEY';
      }

      if (!col.nullable) {
        colStr += ' NOT NULL';
      }

      if (col.unique) {
        colStr += ' UNIQUE';
      }

      if (col.default !== undefined) {
        colStr += ` DEFAULT '${JSON.stringify(col.default)}'`;
      }

      columns.push(colStr);

      if (col.index && !col.primary && !col.unique) {
        indexes.push(`CREATE INDEX IF NOT EXISTS idx_${name}_${colName} ON ${name}(${colName})`);
      }
    }

    if (definition.indexes) {
      for (const idx of definition.indexes) {
        const idxName = `idx_${name}_${idx.join('_')}`;
        indexes.push(`CREATE INDEX IF NOT EXISTS ${idxName} ON ${name}(${idx.join(', ')})`);
      }
    }

    await this.pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${columns.join(', ')})`);

    for (const idx of indexes) {
      await this.pool.query(idx);
    }

    this.tables.add(name);
  }

  async insert(table: string, data: Record<string, unknown>): Promise<void> {
    const columns = Object.keys(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(data).map((v) =>
      typeof v === 'object' && v !== null ? JSON.stringify(v) : v
    );

    await this.pool.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }

  async update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<number> {
    const dataEntries = Object.entries(data);
    const whereEntries = Object.entries(where);

    const setClauses = dataEntries.map(([col], i) => `${col} = $${i + 1}`);
    const whereClauses = whereEntries.map(
      ([col], i) => `${col} = $${dataEntries.length + i + 1}`
    );

    const values = [
      ...dataEntries.map(([, v]) =>
        typeof v === 'object' && v !== null ? JSON.stringify(v) : v
      ),
      ...whereEntries.map(([, v]) => v),
    ];

    const result = await this.pool.query(
      `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`,
      values
    );

    return result.rowCount ?? 0;
  }

  async deleteRows(table: string, where: Record<string, unknown>): Promise<number> {
    const whereEntries = Object.entries(where);
    const whereClauses = whereEntries.map(([col], i) => `${col} = $${i + 1}`);
    const values = whereEntries.map(([, v]) => v);

    const result = await this.pool.query(
      `DELETE FROM ${table} WHERE ${whereClauses.join(' AND ')}`,
      values
    );

    return result.rowCount ?? 0;
  }

  async query(table: string, options: QueryOptions): Promise<Record<string, unknown>[]> {
    const columns = options.select?.join(', ') ?? '*';
    let query = `SELECT ${columns} FROM ${table}`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.where && Object.keys(options.where).length > 0) {
      const whereClauses = Object.keys(options.where).map(
        (col) => `${col} = $${paramIndex++}`
      );
      query += ` WHERE ${whereClauses.join(' AND ')}`;
      params.push(...Object.values(options.where));
    }

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get the underlying pool
   */
  getPool(): Pool {
    return this.pool;
  }
}

/**
 * Create a PostgreSQL storage adapter
 */
export function createPostgresAdapter(options?: PostgresOptions): PostgresAdapter {
  return new PostgresAdapter(options);
}
