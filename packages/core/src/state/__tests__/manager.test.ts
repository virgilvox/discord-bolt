import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager, createStateManager } from '../manager.js';
import type { StorageAdapter, StoredValue } from '../types.js';
import type { VariableDefinition, TableDefinition } from '@furlow/schema';

// Create a mock storage adapter
function createMockStorage(): StorageAdapter {
  const store = new Map<string, StoredValue>();
  const tables = new Map<string, Record<string, unknown>[]>();

  return {
    get: vi.fn().mockImplementation(async (key: string) => {
      return store.get(key) ?? null;
    }),
    set: vi.fn().mockImplementation(async (key: string, value: StoredValue) => {
      store.set(key, value);
    }),
    delete: vi.fn().mockImplementation(async (key: string) => {
      return store.delete(key);
    }),
    has: vi.fn().mockImplementation(async (key: string) => {
      return store.has(key);
    }),
    keys: vi.fn().mockImplementation(async (pattern?: string) => {
      const allKeys = [...store.keys()];
      if (!pattern) return allKeys;
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return allKeys.filter((k) => regex.test(k));
    }),
    clear: vi.fn().mockImplementation(async () => {
      store.clear();
    }),
    createTable: vi.fn().mockImplementation(async (name: string) => {
      if (!tables.has(name)) {
        tables.set(name, []);
      }
    }),
    insert: vi.fn().mockImplementation(async (table: string, data: Record<string, unknown>) => {
      const rows = tables.get(table) ?? [];
      rows.push(data);
      tables.set(table, rows);
    }),
    update: vi.fn().mockImplementation(async (
      table: string,
      where: Record<string, unknown>,
      data: Record<string, unknown>
    ) => {
      const rows = tables.get(table) ?? [];
      let updated = 0;
      for (const row of rows) {
        const matches = Object.entries(where).every(([k, v]) => row[k] === v);
        if (matches) {
          Object.assign(row, data);
          updated++;
        }
      }
      return updated;
    }),
    deleteRows: vi.fn().mockImplementation(async (
      table: string,
      where: Record<string, unknown>
    ) => {
      const rows = tables.get(table) ?? [];
      const before = rows.length;
      const filtered = rows.filter((row) => {
        return !Object.entries(where).every(([k, v]) => row[k] === v);
      });
      tables.set(table, filtered);
      return before - filtered.length;
    }),
    query: vi.fn().mockImplementation(async (
      table: string,
      options: {
        where?: Record<string, unknown>;
        select?: string[];
        orderBy?: string;
        limit?: number;
        offset?: number;
      } = {}
    ) => {
      let rows = tables.get(table) ?? [];

      // Apply where
      if (options.where) {
        rows = rows.filter((row) => {
          return Object.entries(options.where!).every(([k, v]) => row[k] === v);
        });
      }

      // Apply select
      if (options.select) {
        rows = rows.map((row) => {
          const selected: Record<string, unknown> = {};
          for (const key of options.select!) {
            selected[key] = row[key];
          }
          return selected;
        });
      }

      // Apply offset and limit
      if (options.offset) {
        rows = rows.slice(options.offset);
      }
      if (options.limit) {
        rows = rows.slice(0, options.limit);
      }

      return rows;
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('StateManager', () => {
  let storage: StorageAdapter;
  let manager: StateManager;

  beforeEach(() => {
    storage = createMockStorage();
    manager = createStateManager(storage);
  });

  describe('variable registration', () => {
    it('should register variables', () => {
      const variables: Record<string, VariableDefinition> = {
        counter: { scope: 'guild', type: 'number', default: 0 },
        enabled: { scope: 'guild', type: 'boolean', default: true },
      };

      manager.registerVariables(variables);

      const names = manager.getVariableNames();
      expect(names).toContain('counter');
      expect(names).toContain('enabled');
    });

    it('should filter variables by scope', () => {
      const variables: Record<string, VariableDefinition> = {
        guildVar: { scope: 'guild' },
        userVar: { scope: 'user' },
        channelVar: { scope: 'channel' },
      };

      manager.registerVariables(variables);

      expect(manager.getVariableNames('guild')).toEqual(['guildVar']);
      expect(manager.getVariableNames('user')).toEqual(['userVar']);
      expect(manager.getVariableNames('channel')).toEqual(['channelVar']);
    });
  });

  describe('table registration', () => {
    it('should register tables', async () => {
      const tables: Record<string, TableDefinition> = {
        users: {
          columns: {
            id: { type: 'string', primary: true },
            name: { type: 'string' },
          },
        },
      };

      await manager.registerTables(tables);

      expect(manager.getTableNames()).toContain('users');
      expect(storage.createTable).toHaveBeenCalledWith('users', tables.users);
    });
  });

  describe('get() and set()', () => {
    it('should get and set guild-scoped variables', async () => {
      manager.registerVariables({
        testVar: { scope: 'guild' },
      });

      const context = { guildId: 'guild123' };

      await manager.set('testVar', 'value123', context);
      const value = await manager.get('testVar', context);

      expect(value).toBe('value123');
    });

    it('should get and set user-scoped variables', async () => {
      manager.registerVariables({
        userPref: { scope: 'user' },
      });

      const context = { userId: 'user123' };

      await manager.set('userPref', 'dark', context);
      const value = await manager.get('userPref', context);

      expect(value).toBe('dark');
    });

    it('should get and set member-scoped variables', async () => {
      manager.registerVariables({
        memberScore: { scope: 'member' },
      });

      const context = { guildId: 'guild123', userId: 'user123' };

      await manager.set('memberScore', 100, context);
      const value = await manager.get('memberScore', context);

      expect(value).toBe(100);
    });

    it('should get and set channel-scoped variables', async () => {
      manager.registerVariables({
        channelSetting: { scope: 'channel' },
      });

      const context = { channelId: 'channel123' };

      await manager.set('channelSetting', 'enabled', context);
      const value = await manager.get('channelSetting', context);

      expect(value).toBe('enabled');
    });

    it('should return default value for missing variable', async () => {
      manager.registerVariables({
        withDefault: { scope: 'guild', default: 42 },
      });

      const value = await manager.get('withDefault', { guildId: 'guild123' });

      expect(value).toBe(42);
    });

    it('should throw for invalid scope context', async () => {
      manager.registerVariables({
        guildVar: { scope: 'guild' },
      });

      await expect(
        manager.get('guildVar', {}) // Missing guildId
      ).rejects.toThrow();
    });

    it('should handle TTL for variables', async () => {
      manager.registerVariables({
        tempVar: { scope: 'guild', ttl: 100 }, // 100ms TTL
      });

      const context = { guildId: 'guild123' };
      await manager.set('tempVar', 'temporary', context);

      // Value should exist immediately
      expect(await manager.get('tempVar', context)).toBe('temporary');

      // Note: Testing actual expiration would require mocking Date.now()
    });
  });

  describe('delete()', () => {
    it('should delete variable', async () => {
      manager.registerVariables({
        toDelete: { scope: 'guild' },
      });

      const context = { guildId: 'guild123' };

      await manager.set('toDelete', 'value', context);
      expect(await manager.get('toDelete', context)).toBe('value');

      await manager.delete('toDelete', context);
      expect(await manager.get('toDelete', context)).toBeUndefined();
    });
  });

  describe('increment() and decrement()', () => {
    it('should increment numeric value', async () => {
      manager.registerVariables({
        counter: { scope: 'guild', default: 0 },
      });

      const context = { guildId: 'guild123' };

      const result1 = await manager.increment('counter', 1, context);
      expect(result1).toBe(1);

      const result2 = await manager.increment('counter', 5, context);
      expect(result2).toBe(6);
    });

    it('should decrement numeric value', async () => {
      manager.registerVariables({
        counter: { scope: 'guild', default: 10 },
      });

      const context = { guildId: 'guild123' };

      const result1 = await manager.decrement('counter', 3, context);
      expect(result1).toBe(7);

      const result2 = await manager.decrement('counter', 2, context);
      expect(result2).toBe(5);
    });

    it('should handle increment from undefined', async () => {
      manager.registerVariables({
        newCounter: { scope: 'guild' },
      });

      const context = { guildId: 'guild123' };
      const result = await manager.increment('newCounter', 1, context);

      expect(result).toBe(1);
    });
  });

  describe('table operations', () => {
    beforeEach(async () => {
      await manager.registerTables({
        items: {
          columns: {
            id: { type: 'string', primary: true },
            name: { type: 'string' },
            count: { type: 'number' },
          },
        },
      });
    });

    it('should insert rows', async () => {
      await manager.insert('items', { id: '1', name: 'apple', count: 5 });

      const rows = await manager.query('items');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ id: '1', name: 'apple', count: 5 });
    });

    it('should update rows', async () => {
      await manager.insert('items', { id: '1', name: 'apple', count: 5 });
      await manager.update('items', { id: '1' }, { count: 10 });

      const rows = await manager.query('items');
      expect(rows[0]?.count).toBe(10);
    });

    it('should delete rows', async () => {
      await manager.insert('items', { id: '1', name: 'apple', count: 5 });
      await manager.insert('items', { id: '2', name: 'banana', count: 3 });

      const deleted = await manager.deleteRows('items', { id: '1' });
      expect(deleted).toBe(1);

      const rows = await manager.query('items');
      expect(rows).toHaveLength(1);
      expect(rows[0]?.id).toBe('2');
    });

    it('should query with where clause', async () => {
      await manager.insert('items', { id: '1', name: 'apple', count: 5 });
      await manager.insert('items', { id: '2', name: 'banana', count: 3 });
      await manager.insert('items', { id: '3', name: 'apple', count: 2 });

      const rows = await manager.query('items', { where: { name: 'apple' } });
      expect(rows).toHaveLength(2);
    });

    it('should query with select', async () => {
      await manager.insert('items', { id: '1', name: 'apple', count: 5 });

      const rows = await manager.query('items', { select: ['name'] });
      expect(rows[0]).toEqual({ name: 'apple' });
    });

    it('should query with limit and offset', async () => {
      await manager.insert('items', { id: '1', name: 'a' });
      await manager.insert('items', { id: '2', name: 'b' });
      await manager.insert('items', { id: '3', name: 'c' });

      const rows = await manager.query('items', { limit: 2, offset: 1 });
      expect(rows).toHaveLength(2);
    });

    it('should throw for unknown table', async () => {
      await expect(
        manager.insert('unknown', { id: '1' })
      ).rejects.toThrow('Table not found: unknown');
    });
  });

  describe('cache operations', () => {
    it('should cache and retrieve values', () => {
      manager.cacheSet('key1', 'value1');

      expect(manager.cacheGet('key1')).toBe('value1');
    });

    it('should return undefined for missing cache key', () => {
      expect(manager.cacheGet('missing')).toBeUndefined();
    });

    it('should delete cache entry', () => {
      manager.cacheSet('key1', 'value1');
      expect(manager.cacheGet('key1')).toBe('value1');

      const result = manager.cacheDelete('key1');
      expect(result).toBe(true);
      expect(manager.cacheGet('key1')).toBeUndefined();
    });

    it('should clear all cache entries', () => {
      manager.cacheSet('key1', 'value1');
      manager.cacheSet('key2', 'value2');

      manager.cacheClear();

      expect(manager.cacheGet('key1')).toBeUndefined();
      expect(manager.cacheGet('key2')).toBeUndefined();
    });

    it('should respect cache TTL', () => {
      // Set TTL to 1ms for testing
      manager.cacheSet('shortLived', 'value', 1);

      // Value should exist immediately
      expect(manager.cacheGet('shortLived')).toBe('value');

      // Note: Testing actual expiration would require mocking Date.now()
      // or using vi.useFakeTimers()
    });

    it('should evict oldest entry when cache is full', () => {
      const smallCacheManager = createStateManager(storage, {
        maxCacheSize: 2,
        defaultCacheTTL: 60000,
      });

      smallCacheManager.cacheSet('key1', 'value1');
      smallCacheManager.cacheSet('key2', 'value2');
      smallCacheManager.cacheSet('key3', 'value3'); // Should evict key1

      expect(smallCacheManager.cacheGet('key1')).toBeUndefined();
      expect(smallCacheManager.cacheGet('key2')).toBe('value2');
      expect(smallCacheManager.cacheGet('key3')).toBe('value3');
    });
  });

  describe('close()', () => {
    it('should close storage and clear cache', async () => {
      manager.cacheSet('key', 'value');

      await manager.close();

      expect(storage.close).toHaveBeenCalled();
      expect(manager.cacheGet('key')).toBeUndefined();
    });
  });

  describe('createStateManager()', () => {
    it('should create manager with default options', () => {
      const manager = createStateManager(storage);
      expect(manager).toBeInstanceOf(StateManager);
    });

    it('should create manager with custom options', () => {
      const manager = createStateManager(storage, {
        defaultCacheTTL: 60000,
        maxCacheSize: 5000,
      });
      expect(manager).toBeInstanceOf(StateManager);
    });
  });
});
