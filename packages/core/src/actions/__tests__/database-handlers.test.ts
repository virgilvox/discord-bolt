/**
 * Database action handler tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionRegistry } from '../registry.js';
import { registerDatabaseHandlers } from '../handlers/database.js';
import {
  createMockEvaluator,
  createMockStateManager,
  createHandlerContext,
  expectSuccess,
  expectFailure,
} from './test-utils.js';
import type { ActionRegistry } from '../registry.js';
import type {
  DbInsertAction,
  DbUpdateAction,
  DbDeleteAction,
  DbQueryAction,
} from '@furlow/schema';

describe('Database Handlers', () => {
  let registry: ActionRegistry;
  let mockEvaluator: ReturnType<typeof createMockEvaluator>;
  let mockStateManager: ReturnType<typeof createMockStateManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createActionRegistry();
    mockEvaluator = createMockEvaluator();
    mockStateManager = createMockStateManager();
    registerDatabaseHandlers(registry, {
      client: {} as any,
      evaluator: mockEvaluator as any,
      stateManager: mockStateManager as any,
    });
  });

  describe('Handler Registration', () => {
    it('should register all database handlers', () => {
      expect(registry.has('db_insert')).toBe(true);
      expect(registry.has('db_update')).toBe(true);
      expect(registry.has('db_delete')).toBe(true);
      expect(registry.has('db_query')).toBe(true);
    });
  });

  describe('db_insert', () => {
    it('should insert data into a table', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_insert');
      const action: DbInsertAction = {
        action: 'db_insert',
        table: 'users',
        data: {
          name: 'Alice',
          level: 1,
        },
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.insert).toHaveBeenCalledWith('users', { name: 'Alice', level: 1 });
    });

    it('should evaluate expression values', async () => {
      mockEvaluator.evaluate = vi.fn().mockImplementation(async (expr) => {
        if (expr === 'user.id') return '123456789';
        if (expr === 'now()') return Date.now();
        return expr;
      });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_insert');
      const action: DbInsertAction = {
        action: 'db_insert',
        table: 'logs',
        data: {
          user_id: 'user.id',
          timestamp: 'now()',
        },
      };

      await handler.execute(action, context);
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('user.id', context);
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('now()', context);
    });

    it('should store result with as', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_insert');
      const action: DbInsertAction = {
        action: 'db_insert',
        table: 'items',
        data: { name: 'Item 1' },
        as: 'insertedData',
      };

      await handler.execute(action, context);
      expect((context as any).insertedData).toEqual({ name: 'Item 1' });
    });

    it('should fail without state manager', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('db_insert');
      const action: DbInsertAction = {
        action: 'db_insert',
        table: 'users',
        data: { name: 'Test' },
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'State manager not available');
    });

    it('should handle insert errors', async () => {
      mockStateManager.insert = vi.fn().mockRejectedValue(new Error('Insert failed'));
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_insert');
      const action: DbInsertAction = {
        action: 'db_insert',
        table: 'users',
        data: { name: 'Test' },
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Insert failed');
    });

    it('should handle non-string values', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_insert');
      const action: DbInsertAction = {
        action: 'db_insert',
        table: 'users',
        data: {
          count: 42,
          active: true,
          tags: ['a', 'b'],
        },
      };

      await handler.execute(action, context);
      expect(mockStateManager.insert).toHaveBeenCalledWith('users', {
        count: 42,
        active: true,
        tags: ['a', 'b'],
      });
    });
  });

  describe('db_update', () => {
    it('should update rows in a table', async () => {
      mockStateManager.update = vi.fn().mockResolvedValue(1);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_update');
      const action: DbUpdateAction = {
        action: 'db_update',
        table: 'users',
        where: { id: 'user123' }, // Use non-numeric string to avoid integer parsing
        data: { level: 5 },
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.update).toHaveBeenCalledWith('users', { id: 'user123' }, { level: 5 });
      expect(result.data).toBe(1);
    });

    it('should evaluate where clause values', async () => {
      mockStateManager.update = vi.fn().mockResolvedValue(1);
      mockEvaluator.evaluate = vi.fn().mockImplementation(async (expr) => {
        if (expr === 'user.id') return '999';
        return expr;
      });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_update');
      const action: DbUpdateAction = {
        action: 'db_update',
        table: 'users',
        where: { id: 'user.id' },
        data: { active: true },
      };

      await handler.execute(action, context);
      expect(mockStateManager.update).toHaveBeenCalledWith('users', { id: '999' }, { active: true });
    });

    it('should handle data as expression', async () => {
      mockStateManager.update = vi.fn().mockResolvedValue(1);
      // The evaluator is called for both where clause values AND the data string
      mockEvaluator.evaluate = vi.fn().mockImplementation(async (expr) => {
        if (expr === 'updateData') return { name: 'Updated', score: 100 };
        return expr; // Return expression as-is for where clause
      });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_update');
      const action: DbUpdateAction = {
        action: 'db_update',
        table: 'users',
        where: { id: 'user1' }, // Use non-numeric to avoid parsing
        data: 'updateData',
      };

      await handler.execute(action, context);
      expect(mockStateManager.update).toHaveBeenCalledWith(
        'users',
        { id: 'user1' },
        { name: 'Updated', score: 100 }
      );
    });

    it('should store count with as', async () => {
      mockStateManager.update = vi.fn().mockResolvedValue(3);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_update');
      const action: DbUpdateAction = {
        action: 'db_update',
        table: 'users',
        where: { status: 'pending' },
        data: { status: 'active' },
        as: 'updatedCount',
      };

      await handler.execute(action, context);
      expect((context as any).updatedCount).toBe(3);
    });

    it('should handle upsert mode', async () => {
      mockStateManager.query = vi.fn().mockResolvedValue([]);
      mockStateManager.insert = vi.fn().mockResolvedValue(undefined);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_update');
      const action: DbUpdateAction = {
        action: 'db_update',
        table: 'settings',
        where: { key: 'theme' },
        data: { value: 'dark' },
        upsert: true,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.query).toHaveBeenCalledWith('settings', { where: { key: 'theme' }, limit: 1 });
      expect(mockStateManager.insert).toHaveBeenCalledWith('settings', { key: 'theme', value: 'dark' });
    });

    it('should update existing on upsert if found', async () => {
      mockStateManager.query = vi.fn().mockResolvedValue([{ key: 'theme', value: 'light' }]);
      mockStateManager.update = vi.fn().mockResolvedValue(1);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_update');
      const action: DbUpdateAction = {
        action: 'db_update',
        table: 'settings',
        where: { key: 'theme' },
        data: { value: 'dark' },
        upsert: true,
      };

      await handler.execute(action, context);
      expect(mockStateManager.update).toHaveBeenCalled();
      expect(mockStateManager.insert).not.toHaveBeenCalled();
    });

    it('should fail without state manager', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('db_update');
      const action: DbUpdateAction = {
        action: 'db_update',
        table: 'users',
        where: { id: '1' },
        data: { name: 'Test' },
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'State manager not available');
    });
  });

  describe('db_delete', () => {
    it('should delete rows from a table', async () => {
      mockStateManager.deleteRows = vi.fn().mockResolvedValue(2);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_delete');
      const action: DbDeleteAction = {
        action: 'db_delete',
        table: 'logs',
        where: { type: 'debug' },
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.deleteRows).toHaveBeenCalledWith('logs', { type: 'debug' });
      expect(result.data).toBe(2);
    });

    it('should evaluate where clause values', async () => {
      mockStateManager.deleteRows = vi.fn().mockResolvedValue(1);
      mockEvaluator.evaluate = vi.fn().mockResolvedValue('user-123');
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_delete');
      const action: DbDeleteAction = {
        action: 'db_delete',
        table: 'sessions',
        where: { user_id: 'user.id' },
      };

      await handler.execute(action, context);
      expect(mockStateManager.deleteRows).toHaveBeenCalledWith('sessions', { user_id: 'user-123' });
    });

    it('should handle delete errors', async () => {
      mockStateManager.deleteRows = vi.fn().mockRejectedValue(new Error('Delete failed'));
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_delete');
      const action: DbDeleteAction = {
        action: 'db_delete',
        table: 'users',
        where: { id: '1' },
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Delete failed');
    });

    it('should fail without state manager', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('db_delete');
      const action: DbDeleteAction = {
        action: 'db_delete',
        table: 'users',
        where: { id: '1' },
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'State manager not available');
    });
  });

  describe('db_query', () => {
    it('should query rows from a table', async () => {
      const mockData = [
        { id: '1', name: 'Alice', level: 5 },
        { id: '2', name: 'Bob', level: 3 },
      ];
      mockStateManager.query = vi.fn().mockResolvedValue(mockData);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_query');
      const action: DbQueryAction = {
        action: 'db_query',
        table: 'users',
        as: 'users',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.query).toHaveBeenCalledWith('users', {
        where: undefined,
        select: undefined,
        orderBy: undefined,
        limit: undefined,
        offset: undefined,
      });
      expect((context as any).users).toEqual(mockData);
    });

    it('should query with where clause', async () => {
      mockStateManager.query = vi.fn().mockResolvedValue([]);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_query');
      const action: DbQueryAction = {
        action: 'db_query',
        table: 'users',
        where: { level: 5, active: true },
        as: 'results',
      };

      await handler.execute(action, context);
      expect(mockStateManager.query).toHaveBeenCalledWith('users', expect.objectContaining({
        where: { level: 5, active: true },
      }));
    });

    it('should query with select fields', async () => {
      mockStateManager.query = vi.fn().mockResolvedValue([]);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_query');
      const action: DbQueryAction = {
        action: 'db_query',
        table: 'users',
        select: ['id', 'name'],
        as: 'results',
      };

      await handler.execute(action, context);
      expect(mockStateManager.query).toHaveBeenCalledWith('users', expect.objectContaining({
        select: ['id', 'name'],
      }));
    });

    it('should query with order_by', async () => {
      mockStateManager.query = vi.fn().mockResolvedValue([]);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_query');
      const action: DbQueryAction = {
        action: 'db_query',
        table: 'users',
        order_by: 'level DESC',
        as: 'results',
      };

      await handler.execute(action, context);
      expect(mockStateManager.query).toHaveBeenCalledWith('users', expect.objectContaining({
        orderBy: 'level DESC',
      }));
    });

    it('should query with limit and offset', async () => {
      mockStateManager.query = vi.fn().mockResolvedValue([]);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_query');
      const action: DbQueryAction = {
        action: 'db_query',
        table: 'users',
        limit: 10,
        offset: 20,
        as: 'results',
      };

      await handler.execute(action, context);
      expect(mockStateManager.query).toHaveBeenCalledWith('users', expect.objectContaining({
        limit: 10,
        offset: 20,
      }));
    });

    it('should evaluate expression limit and offset', async () => {
      mockStateManager.query = vi.fn().mockResolvedValue([]);
      mockEvaluator.evaluate = vi.fn().mockImplementation(async (expr) => {
        if (expr === 'pageSize') return 25;
        if (expr === 'pageOffset') return 50;
        return expr;
      });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_query');
      const action: DbQueryAction = {
        action: 'db_query',
        table: 'users',
        limit: 'pageSize',
        offset: 'pageOffset',
        as: 'results',
      };

      await handler.execute(action, context);
      expect(mockStateManager.query).toHaveBeenCalledWith('users', expect.objectContaining({
        limit: 25,
        offset: 50,
      }));
    });

    it('should return results data', async () => {
      const mockData = [{ id: '1' }];
      mockStateManager.query = vi.fn().mockResolvedValue(mockData);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_query');
      const action: DbQueryAction = {
        action: 'db_query',
        table: 'users',
        as: 'data',
      };

      const result = await handler.execute(action, context);
      expect(result.data).toEqual(mockData);
    });

    it('should fail without state manager', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('db_query');
      const action: DbQueryAction = {
        action: 'db_query',
        table: 'users',
        as: 'results',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'State manager not available');
    });

    it('should handle query errors', async () => {
      mockStateManager.query = vi.fn().mockRejectedValue(new Error('Query failed'));
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_query');
      const action: DbQueryAction = {
        action: 'db_query',
        table: 'invalid',
        as: 'results',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Query failed');
    });

    it('should evaluate where clause expressions', async () => {
      mockStateManager.query = vi.fn().mockResolvedValue([]);
      mockEvaluator.evaluate = vi.fn().mockResolvedValue('guild-123');
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('db_query');
      const action: DbQueryAction = {
        action: 'db_query',
        table: 'settings',
        where: { guild_id: 'guild.id' },
        as: 'settings',
      };

      await handler.execute(action, context);
      expect(mockStateManager.query).toHaveBeenCalledWith('settings', expect.objectContaining({
        where: { guild_id: 'guild-123' },
      }));
    });
  });
});
