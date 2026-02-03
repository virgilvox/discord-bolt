/**
 * Memory Storage Adapter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAdapter, createMemoryAdapter } from '../memory/index.js';
import type { StoredValue, TableDefinition } from '../types.js';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = createMemoryAdapter();
  });

  // ==========================================
  // Key-Value Operations
  // ==========================================

  describe('Key-Value Operations', () => {
    describe('get/set', () => {
      it('should set and get a value', async () => {
        const value: StoredValue = {
          value: 'test',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await adapter.set('key1', value);
        const result = await adapter.get('key1');

        expect(result).toEqual(value);
      });

      it('should return null for non-existent key', async () => {
        const result = await adapter.get('nonexistent');
        expect(result).toBeNull();
      });

      it('should overwrite existing value', async () => {
        const value1: StoredValue = {
          value: 'first',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const value2: StoredValue = {
          value: 'second',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await adapter.set('key1', value1);
        await adapter.set('key1', value2);
        const result = await adapter.get('key1');

        expect(result?.value).toBe('second');
      });

      it('should handle different value types', async () => {
        const values = [
          { value: 123, type: 'number' },
          { value: true, type: 'boolean' },
          { value: { foo: 'bar' }, type: 'object' },
          { value: [1, 2, 3], type: 'array' },
          { value: null, type: 'null' },
        ];

        for (const v of values) {
          const stored: StoredValue = {
            value: v.value,
            type: v.type,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await adapter.set(`key_${v.type}`, stored);
          const result = await adapter.get(`key_${v.type}`);
          expect(result?.value).toEqual(v.value);
        }
      });
    });

    describe('expiration', () => {
      it('should return null for expired values', async () => {
        const value: StoredValue = {
          value: 'expired',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() - 1000, // Already expired
        };

        await adapter.set('expired_key', value);
        const result = await adapter.get('expired_key');

        expect(result).toBeNull();
      });

      it('should return value that has not expired', async () => {
        const value: StoredValue = {
          value: 'not_expired',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() + 60000, // Expires in 1 minute
        };

        await adapter.set('not_expired_key', value);
        const result = await adapter.get('not_expired_key');

        expect(result?.value).toBe('not_expired');
      });
    });

    describe('delete', () => {
      it('should delete an existing key', async () => {
        const value: StoredValue = {
          value: 'test',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await adapter.set('key1', value);
        const deleted = await adapter.delete('key1');
        const result = await adapter.get('key1');

        expect(deleted).toBe(true);
        expect(result).toBeNull();
      });

      it('should return false for non-existent key', async () => {
        const deleted = await adapter.delete('nonexistent');
        expect(deleted).toBe(false);
      });
    });

    describe('has', () => {
      it('should return true for existing key', async () => {
        const value: StoredValue = {
          value: 'test',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await adapter.set('key1', value);
        const exists = await adapter.has('key1');

        expect(exists).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        const exists = await adapter.has('nonexistent');
        expect(exists).toBe(false);
      });

      it('should return false for expired key', async () => {
        const value: StoredValue = {
          value: 'expired',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() - 1000,
        };

        await adapter.set('expired_key', value);
        const exists = await adapter.has('expired_key');

        expect(exists).toBe(false);
      });
    });

    describe('keys', () => {
      beforeEach(async () => {
        const now = Date.now();
        await adapter.set('user:1', { value: 'a', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('user:2', { value: 'b', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('guild:1', { value: 'c', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('settings', { value: 'd', type: 'string', createdAt: now, updatedAt: now });
      });

      it('should return all keys without pattern', async () => {
        const keys = await adapter.keys();
        expect(keys).toHaveLength(4);
        expect(keys).toContain('user:1');
        expect(keys).toContain('user:2');
        expect(keys).toContain('guild:1');
        expect(keys).toContain('settings');
      });

      it('should filter keys with wildcard pattern', async () => {
        const keys = await adapter.keys('user:*');
        expect(keys).toHaveLength(2);
        expect(keys).toContain('user:1');
        expect(keys).toContain('user:2');
      });

      it('should filter keys with single character wildcard', async () => {
        const keys = await adapter.keys('user:?');
        expect(keys).toHaveLength(2);
      });

      it('should exclude expired keys', async () => {
        await adapter.set('expired', {
          value: 'expired',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() - 1000,
        });

        const keys = await adapter.keys();
        expect(keys).not.toContain('expired');
      });
    });

    describe('clear', () => {
      it('should clear all data', async () => {
        const now = Date.now();
        await adapter.set('key1', { value: 'a', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('key2', { value: 'b', type: 'string', createdAt: now, updatedAt: now });

        await adapter.clear();

        const keys = await adapter.keys();
        expect(keys).toHaveLength(0);
      });
    });
  });

  // ==========================================
  // Table Operations
  // ==========================================

  describe('Table Operations', () => {
    const userTableDef: TableDefinition = {
      columns: {
        id: { type: 'number', primary: true },
        name: { type: 'string' },
        email: { type: 'string', unique: true },
        active: { type: 'boolean', default: true },
      },
    };

    describe('createTable', () => {
      it('should create a table', async () => {
        await adapter.createTable('users', userTableDef);
        // Should not throw
        const result = await adapter.query('users', {});
        expect(result).toEqual([]);
      });

      it('should not overwrite existing table', async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com' });

        // Creating again should not clear data
        await adapter.createTable('users', userTableDef);
        const result = await adapter.query('users', {});
        expect(result).toHaveLength(1);
      });
    });

    describe('insert', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
      });

      it('should insert a row', async () => {
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com' });
        const result = await adapter.query('users', {});

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: 1, name: 'Alice' });
      });

      it('should insert multiple rows', async () => {
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com' });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@example.com' });

        const result = await adapter.query('users', {});
        expect(result).toHaveLength(2);
      });

      it('should throw error for non-existent table', async () => {
        await expect(
          adapter.insert('nonexistent', { id: 1 })
        ).rejects.toThrow('Table not found');
      });
    });

    describe('update', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com', active: true });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@example.com', active: true });
      });

      it('should update matching rows', async () => {
        const count = await adapter.update('users', { id: 1 }, { name: 'Alice Updated' });

        expect(count).toBe(1);
        const result = await adapter.query('users', { where: { id: 1 } });
        expect(result[0]?.name).toBe('Alice Updated');
      });

      it('should update multiple matching rows', async () => {
        const count = await adapter.update('users', { active: true }, { active: false });

        expect(count).toBe(2);
        const result = await adapter.query('users', { where: { active: false } });
        expect(result).toHaveLength(2);
      });

      it('should return 0 for no matches', async () => {
        const count = await adapter.update('users', { id: 999 }, { name: 'Nobody' });
        expect(count).toBe(0);
      });

      it('should throw error for non-existent table', async () => {
        await expect(
          adapter.update('nonexistent', { id: 1 }, { name: 'test' })
        ).rejects.toThrow('Table not found');
      });
    });

    describe('deleteRows', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com' });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@example.com' });
        await adapter.insert('users', { id: 3, name: 'Charlie', email: 'charlie@example.com' });
      });

      it('should delete matching rows', async () => {
        const count = await adapter.deleteRows('users', { id: 1 });

        expect(count).toBe(1);
        const result = await adapter.query('users', {});
        expect(result).toHaveLength(2);
      });

      it('should delete multiple matching rows', async () => {
        await adapter.update('users', { id: 1 }, { active: false });
        await adapter.update('users', { id: 2 }, { active: false });

        const count = await adapter.deleteRows('users', { active: false });

        expect(count).toBe(2);
        const result = await adapter.query('users', {});
        expect(result).toHaveLength(1);
      });

      it('should return 0 for no matches', async () => {
        const count = await adapter.deleteRows('users', { id: 999 });
        expect(count).toBe(0);
      });

      it('should throw error for non-existent table', async () => {
        await expect(
          adapter.deleteRows('nonexistent', { id: 1 })
        ).rejects.toThrow('Table not found');
      });
    });

    describe('query', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com', score: 100 });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@example.com', score: 200 });
        await adapter.insert('users', { id: 3, name: 'Charlie', email: 'charlie@example.com', score: 150 });
      });

      it('should return all rows without options', async () => {
        const result = await adapter.query('users', {});
        expect(result).toHaveLength(3);
      });

      it('should filter with where clause', async () => {
        const result = await adapter.query('users', { where: { id: 2 } });
        expect(result).toHaveLength(1);
        expect(result[0]?.name).toBe('Bob');
      });

      it('should order by field ascending', async () => {
        const result = await adapter.query('users', { orderBy: 'score' });
        expect(result[0]?.name).toBe('Alice');
        expect(result[2]?.name).toBe('Bob');
      });

      it('should order by field descending', async () => {
        const result = await adapter.query('users', { orderBy: 'score desc' });
        expect(result[0]?.name).toBe('Bob');
        expect(result[2]?.name).toBe('Alice');
      });

      it('should limit results', async () => {
        const result = await adapter.query('users', { limit: 2 });
        expect(result).toHaveLength(2);
      });

      it('should offset results', async () => {
        const result = await adapter.query('users', { offset: 1 });
        expect(result).toHaveLength(2);
      });

      it('should combine limit and offset', async () => {
        const result = await adapter.query('users', { offset: 1, limit: 1 });
        expect(result).toHaveLength(1);
      });

      it('should select specific columns', async () => {
        const result = await adapter.query('users', { select: ['name', 'email'] });
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('email');
        expect(result[0]).not.toHaveProperty('id');
        expect(result[0]).not.toHaveProperty('score');
      });

      it('should combine where, orderBy, limit, and offset', async () => {
        await adapter.insert('users', { id: 4, name: 'Dave', email: 'dave@example.com', score: 180 });
        await adapter.insert('users', { id: 5, name: 'Eve', email: 'eve@example.com', score: 160 });

        const result = await adapter.query('users', {
          where: {},
          orderBy: 'score desc',
          offset: 1,
          limit: 2,
        });

        expect(result).toHaveLength(2);
        expect(result[0]?.name).toBe('Dave'); // Second highest (180)
        expect(result[1]?.name).toBe('Eve');  // Third highest (160)
      });

      it('should throw error for non-existent table', async () => {
        await expect(
          adapter.query('nonexistent', {})
        ).rejects.toThrow('Table not found');
      });
    });
  });

  // ==========================================
  // Utility Methods
  // ==========================================

  describe('Utility Methods', () => {
    describe('close', () => {
      it('should clear all data on close', async () => {
        const now = Date.now();
        await adapter.set('key1', { value: 'a', type: 'string', createdAt: now, updatedAt: now });
        await adapter.createTable('test', { columns: { id: { type: 'number' } } });

        await adapter.close();

        const keys = await adapter.keys();
        expect(keys).toHaveLength(0);
      });
    });

    describe('getAllData', () => {
      it('should return all internal data', async () => {
        const now = Date.now();
        await adapter.set('key1', { value: 'a', type: 'string', createdAt: now, updatedAt: now });
        await adapter.createTable('users', { columns: { id: { type: 'number' } } });
        await adapter.insert('users', { id: 1 });

        const data = adapter.getAllData();

        expect(data.store).toHaveProperty('key1');
        expect(data.tables).toHaveProperty('users');
        expect(data.tables.users).toHaveLength(1);
      });
    });
  });
});
