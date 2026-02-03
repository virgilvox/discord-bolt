/**
 * Database pipe for reactive database operations
 */

import type {
  Pipe,
  PipeResponse,
  DatabasePipeConfig,
  DatabaseEvent,
  DatabaseEventType,
} from '../types.js';

export interface DatabasePipeOptions {
  name: string;
  config: DatabasePipeConfig;
}

export type DatabaseEventHandler = (event: DatabaseEvent) => void | Promise<void>;

export class DatabasePipe implements Pipe {
  public readonly name: string;
  public readonly type = 'database';
  private config: DatabasePipeConfig;
  private connected = false;
  private db: any = null;
  private eventHandlers: Map<string, DatabaseEventHandler[]> = new Map();

  constructor(options: DatabasePipeOptions) {
    this.name = options.name;
    this.config = options.config;
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      if (this.config.adapter === 'sqlite') {
        // Dynamic import to avoid bundling issues
        const BetterSqlite3 = (await import('better-sqlite3')).default;
        const connectionString =
          typeof this.config.connection === 'string'
            ? this.config.connection
            : ':memory:';
        this.db = new BetterSqlite3(connectionString);
      } else if (this.config.adapter === 'memory') {
        // In-memory storage using a simple object
        this.db = new MemoryDatabase();
      } else {
        throw new Error(`Unsupported adapter: ${this.config.adapter}`);
      }

      this.connected = true;
      this.emit('connected', {
        type: 'insert',
        table: '',
        data: {},
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to database: ${message}`);
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (this.config.adapter === 'sqlite' && this.db) {
        this.db.close();
      }
      this.db = null;
      this.connected = false;
      this.emit('disconnected', {
        type: 'delete',
        table: '',
        data: {},
      });
    } catch {
      // Ignore close errors
      this.db = null;
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = Record<string, unknown>[]>(
    sql: string,
    params: unknown[] = []
  ): Promise<PipeResponse<T>> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    try {
      if (this.config.adapter === 'sqlite') {
        const stmt = this.db.prepare(sql);
        // Check if it's a SELECT query
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const rows = stmt.all(...params);
          return { success: true, data: rows as T };
        } else {
          const result = stmt.run(...params);
          return { success: true, data: result as T };
        }
      } else if (this.config.adapter === 'memory') {
        const result = this.db.query(sql, params);
        return { success: true, data: result as T };
      }

      return { success: false, error: 'Unsupported adapter' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Insert a row into a table
   */
  async insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<PipeResponse<{ lastInsertRowid?: number | bigint }>> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

      let result: { lastInsertRowid?: number | bigint } = {};

      if (this.config.adapter === 'sqlite') {
        const stmt = this.db.prepare(sql);
        result = stmt.run(...values);
      } else if (this.config.adapter === 'memory') {
        result = this.db.insert(table, data);
      }

      // Emit insert event
      const event: DatabaseEvent = {
        type: 'insert',
        table,
        data,
      };
      this.emit('insert', event);
      this.emit('change', event);

      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Update rows in a table
   */
  async update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<PipeResponse<{ changes?: number }>> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const setClauses = Object.keys(data)
        .map((key) => `${key} = ?`)
        .join(', ');
      const whereClauses = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      const sql = `UPDATE ${table} SET ${setClauses} WHERE ${whereClauses}`;
      const params = [...Object.values(data), ...Object.values(where)];

      let result: { changes?: number } = {};

      if (this.config.adapter === 'sqlite') {
        const stmt = this.db.prepare(sql);
        result = stmt.run(...params);
      } else if (this.config.adapter === 'memory') {
        result = this.db.update(table, where, data);
      }

      // Emit update event
      const event: DatabaseEvent = {
        type: 'update',
        table,
        data,
        oldData: where,
      };
      this.emit('update', event);
      this.emit('change', event);

      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete rows from a table
   */
  async delete(
    table: string,
    where: Record<string, unknown>
  ): Promise<PipeResponse<{ changes?: number }>> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const whereClauses = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      const sql = `DELETE FROM ${table} WHERE ${whereClauses}`;
      const params = Object.values(where);

      let result: { changes?: number } = {};

      if (this.config.adapter === 'sqlite') {
        const stmt = this.db.prepare(sql);
        result = stmt.run(...params);
      } else if (this.config.adapter === 'memory') {
        result = this.db.delete(table, where);
      }

      // Emit delete event
      const event: DatabaseEvent = {
        type: 'delete',
        table,
        data: where,
      };
      this.emit('delete', event);
      this.emit('change', event);

      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Register an event handler
   */
  on(event: DatabaseEventType | 'change' | 'connected' | 'disconnected', handler: DatabaseEventHandler): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * Remove an event handler
   */
  off(event: DatabaseEventType | 'change' | 'connected' | 'disconnected', handler: DatabaseEventHandler): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event
   */
  private emit(event: string, data: DatabaseEvent): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Database handler error for "${event}":`, error);
      }
    }
  }
}

/**
 * Simple in-memory database for testing
 */
class MemoryDatabase {
  private tables: Map<string, Record<string, unknown>[]> = new Map();
  private autoIncrements: Map<string, number> = new Map();

  query(sql: string, _params: unknown[]): Record<string, unknown>[] {
    // Very basic SQL parsing for memory adapter
    const selectMatch = sql.match(/SELECT \* FROM (\w+)/i);
    if (selectMatch) {
      const table = selectMatch[1]!;
      return this.tables.get(table) ?? [];
    }
    return [];
  }

  insert(table: string, data: Record<string, unknown>): { lastInsertRowid: number } {
    if (!this.tables.has(table)) {
      this.tables.set(table, []);
    }

    const id = (this.autoIncrements.get(table) ?? 0) + 1;
    this.autoIncrements.set(table, id);

    const row = { id, ...data };
    this.tables.get(table)!.push(row);

    return { lastInsertRowid: id };
  }

  update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): { changes: number } {
    const rows = this.tables.get(table) ?? [];
    let changes = 0;

    for (const row of rows) {
      if (this.matchesWhere(row, where)) {
        Object.assign(row, data);
        changes++;
      }
    }

    return { changes };
  }

  delete(table: string, where: Record<string, unknown>): { changes: number } {
    const rows = this.tables.get(table) ?? [];
    const initialLength = rows.length;

    const remaining = rows.filter((row) => !this.matchesWhere(row, where));
    this.tables.set(table, remaining);

    return { changes: initialLength - remaining.length };
  }

  private matchesWhere(
    row: Record<string, unknown>,
    where: Record<string, unknown>
  ): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (row[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Create a database pipe
 */
export function createDatabasePipe(options: DatabasePipeOptions): DatabasePipe {
  return new DatabasePipe(options);
}
