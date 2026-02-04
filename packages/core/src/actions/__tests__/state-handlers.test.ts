/**
 * State action handler tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionRegistry } from '../registry.js';
import { registerStateHandlers } from '../handlers/state.js';
import {
  createMockEvaluator,
  createMockStateManager,
  createHandlerContext,
  expectSuccess,
  expectFailure,
} from './test-utils.js';
import type { ActionRegistry } from '../registry.js';
import type {
  SetAction,
  IncrementAction,
  DecrementAction,
  ListPushAction,
  ListRemoveAction,
  SetMapAction,
  DeleteMapAction,
} from '@furlow/schema';

describe('State Handlers', () => {
  let registry: ActionRegistry;
  let mockEvaluator: ReturnType<typeof createMockEvaluator>;
  let mockStateManager: ReturnType<typeof createMockStateManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createActionRegistry();
    mockEvaluator = createMockEvaluator();
    mockStateManager = createMockStateManager();
    registerStateHandlers(registry, {
      client: {} as any,
      evaluator: mockEvaluator as any,
      stateManager: mockStateManager as any,
    });
  });

  describe('Handler Registration', () => {
    it('should register all state handlers', () => {
      expect(registry.has('set')).toBe(true);
      expect(registry.has('increment')).toBe(true);
      expect(registry.has('decrement')).toBe(true);
      expect(registry.has('list_push')).toBe(true);
      expect(registry.has('list_remove')).toBe(true);
      expect(registry.has('set_map')).toBe(true);
      expect(registry.has('delete_map')).toBe(true);
    });
  });

  describe('set', () => {
    it('should set a value with key', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set');
      const action: SetAction = {
        action: 'set',
        key: 'myVar',
        value: 'hello',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.set).toHaveBeenCalledWith('myVar', 'hello', expect.any(Object));
      expect(result.data).toBe('hello');
    });

    it('should set a value with var (alias)', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set');
      const action: SetAction = {
        action: 'set',
        var: 'myVar',
        value: 'world',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.set).toHaveBeenCalledWith('myVar', 'world', expect.any(Object));
    });

    it('should fail without key or var', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set');
      const action = {
        action: 'set',
        value: 'hello',
      } as SetAction;

      const result = await handler.execute(action, context);
      expectFailure(result, 'Variable name');
    });

    it('should interpolate template strings', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });
      (context as any).name = 'Alice';

      const handler = registry.get('set');
      const action: SetAction = {
        action: 'set',
        key: 'greeting',
        value: 'Hello, ${name}!',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('Hello, ${name}!', context);
    });

    it('should evaluate expressions', async () => {
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(42);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set');
      const action: SetAction = {
        action: 'set',
        key: 'count',
        value: '1 + 1',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.evaluate).toHaveBeenCalled();
    });

    it('should set value in context.state with scope', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set');
      const action: SetAction = {
        action: 'set',
        key: 'counter',
        value: 10,
        scope: 'guild',
      };

      await handler.execute(action, context);
      expect((context as any).state.guild.counter).toBe(10);
    });

    it('should store result in variable with as', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set');
      const action: SetAction = {
        action: 'set',
        key: 'data',
        value: 'test',
        as: 'result',
      };

      await handler.execute(action, context);
      expect((context as any).result).toBe('test');
    });

    it('should handle different scopes', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set');

      // Global scope
      await handler.execute({ action: 'set', key: 'a', value: 1, scope: 'global' }, context);
      expect(mockStateManager.set).toHaveBeenCalledWith('a', 1, {});

      // Guild scope
      await handler.execute({ action: 'set', key: 'b', value: 2, scope: 'guild' }, context);
      expect(mockStateManager.set).toHaveBeenCalledWith('b', 2, { guildId: expect.any(String) });

      // Channel scope
      await handler.execute({ action: 'set', key: 'c', value: 3, scope: 'channel' }, context);
      expect(mockStateManager.set).toHaveBeenCalledWith('c', 3, { guildId: expect.any(String), channelId: expect.any(String) });

      // User scope
      await handler.execute({ action: 'set', key: 'd', value: 4, scope: 'user' }, context);
      expect(mockStateManager.set).toHaveBeenCalledWith('d', 4, { userId: expect.any(String) });

      // Member scope
      await handler.execute({ action: 'set', key: 'e', value: 5, scope: 'member' }, context);
      expect(mockStateManager.set).toHaveBeenCalledWith('e', 5, { guildId: expect.any(String), userId: expect.any(String) });
    });

    it('should work without state manager (context only)', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('set');
      const action: SetAction = {
        action: 'set',
        key: 'local',
        value: 'value',
        scope: 'guild',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect((context as any).state.guild.local).toBe('value');
    });
  });

  describe('increment', () => {
    it('should increment a value', async () => {
      mockStateManager.increment = vi.fn().mockResolvedValue(1);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('increment');
      const action: IncrementAction = {
        action: 'increment',
        var: 'counter',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.increment).toHaveBeenCalledWith('counter', 1, expect.any(Object));
      expect(result.data).toBe(1);
    });

    it('should increment by specified amount', async () => {
      mockStateManager.increment = vi.fn().mockResolvedValue(10);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('increment');
      const action: IncrementAction = {
        action: 'increment',
        var: 'counter',
        by: 10,
      };

      const result = await handler.execute(action, context);
      expect(mockStateManager.increment).toHaveBeenCalledWith('counter', 10, expect.any(Object));
      expect(result.data).toBe(10);
    });

    it('should update context.state', async () => {
      mockStateManager.increment = vi.fn().mockResolvedValue(5);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('increment');
      const action: IncrementAction = {
        action: 'increment',
        var: 'counter',
        scope: 'guild',
      };

      await handler.execute(action, context);
      expect((context as any).state.guild.counter).toBe(5);
    });

    it('should work without state manager (fallback)', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });
      (context as any).state = { global: { counter: 5 } };

      const handler = registry.get('increment');
      const action: IncrementAction = {
        action: 'increment',
        var: 'counter',
        scope: 'global',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toBe(6);
      expect((context as any).state.global.counter).toBe(6);
    });
  });

  describe('decrement', () => {
    it('should decrement a value', async () => {
      mockStateManager.decrement = vi.fn().mockResolvedValue(9);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('decrement');
      const action: DecrementAction = {
        action: 'decrement',
        var: 'counter',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.decrement).toHaveBeenCalledWith('counter', 1, expect.any(Object));
      expect(result.data).toBe(9);
    });

    it('should decrement by specified amount', async () => {
      mockStateManager.decrement = vi.fn().mockResolvedValue(0);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('decrement');
      const action: DecrementAction = {
        action: 'decrement',
        var: 'counter',
        by: 5,
      };

      const result = await handler.execute(action, context);
      expect(mockStateManager.decrement).toHaveBeenCalledWith('counter', 5, expect.any(Object));
      expect(result.data).toBe(0);
    });

    it('should work without state manager (fallback)', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });
      (context as any).state = { global: { counter: 10 } };

      const handler = registry.get('decrement');
      const action: DecrementAction = {
        action: 'decrement',
        var: 'counter',
        scope: 'global',
        by: 3,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toBe(7);
    });
  });

  describe('list_push', () => {
    it('should push a value to a list', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue([1, 2]);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_push');
      const action: ListPushAction = {
        action: 'list_push',
        key: 'items',
        value: 3,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.set).toHaveBeenCalledWith('items', [1, 2, 3], expect.any(Object));
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('should create list if not exists', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue(undefined);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_push');
      const action: ListPushAction = {
        action: 'list_push',
        key: 'newList',
        value: 'first',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.set).toHaveBeenCalledWith('newList', ['first'], expect.any(Object));
    });

    it('should use var alias', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue([]);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_push');
      const action: ListPushAction = {
        action: 'list_push',
        var: 'items',
        value: 'item',
      };

      await handler.execute(action, context);
      expect(mockStateManager.get).toHaveBeenCalledWith('items', expect.any(Object));
    });

    it('should evaluate expression values', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue([]);
      mockEvaluator.evaluate = vi.fn().mockResolvedValue({ name: 'test' });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_push');
      const action: ListPushAction = {
        action: 'list_push',
        key: 'objects',
        value: '{ name: "test" }',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.evaluate).toHaveBeenCalled();
    });

    it('should fail without key or var', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_push');
      const action = {
        action: 'list_push',
        value: 'item',
      } as ListPushAction;

      const result = await handler.execute(action, context);
      expectFailure(result, 'Variable name');
    });

    it('should update context.state', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue([1]);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_push');
      const action: ListPushAction = {
        action: 'list_push',
        key: 'items',
        value: 2,
        scope: 'guild',
      };

      await handler.execute(action, context);
      expect((context as any).state.guild.items).toEqual([1, 2]);
    });
  });

  describe('list_remove', () => {
    it('should remove by index', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue(['a', 'b', 'c']);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_remove');
      const action: ListRemoveAction = {
        action: 'list_remove',
        key: 'items',
        index: 1,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.set).toHaveBeenCalledWith('items', ['a', 'c'], expect.any(Object));
    });

    it('should remove by value', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue(['x', 'y', 'z']);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_remove');
      const action: ListRemoveAction = {
        action: 'list_remove',
        key: 'items',
        value: 'y',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.set).toHaveBeenCalledWith('items', ['x', 'z'], expect.any(Object));
    });

    it('should handle value not found', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue(['a', 'b']);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_remove');
      const action: ListRemoveAction = {
        action: 'list_remove',
        key: 'items',
        value: 'notfound',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toEqual(['a', 'b']); // Unchanged
    });

    it('should evaluate index expression', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue([1, 2, 3]);
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(0);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_remove');
      const action: ListRemoveAction = {
        action: 'list_remove',
        key: 'items',
        index: 'selectedIndex',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('selectedIndex', context);
    });

    it('should create empty list if not exists', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue(undefined);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('list_remove');
      const action: ListRemoveAction = {
        action: 'list_remove',
        key: 'items',
        index: 0,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toEqual([]);
    });
  });

  describe('set_map', () => {
    it('should set a value in a map', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue({});
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set_map');
      const action: SetMapAction = {
        action: 'set_map',
        key: 'settings',
        map_key: 'theme',
        value: 'dark',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.set).toHaveBeenCalledWith('settings', { theme: 'dark' }, expect.any(Object));
    });

    it('should add to existing map', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue({ existing: 'value' });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set_map');
      const action: SetMapAction = {
        action: 'set_map',
        key: 'settings',
        map_key: 'new_key',
        value: 'new_value',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toEqual({ existing: 'value', new_key: 'new_value' });
    });

    it('should interpolate map_key', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue({});
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });
      (context as any).keyName = 'dynamic_key';

      const handler = registry.get('set_map');
      const action: SetMapAction = {
        action: 'set_map',
        key: 'data',
        map_key: '${keyName}',
        value: 'value',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('${keyName}', context);
    });

    it('should update existing key', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue({ count: 5 });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set_map');
      const action: SetMapAction = {
        action: 'set_map',
        key: 'data',
        map_key: 'count',
        value: 10,
      };

      const result = await handler.execute(action, context);
      expect(result.data).toEqual({ count: 10 });
    });

    it('should fail without key or var', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set_map');
      const action = {
        action: 'set_map',
        map_key: 'key',
        value: 'value',
      } as SetMapAction;

      const result = await handler.execute(action, context);
      expectFailure(result, 'Variable name');
    });

    it('should update context.state', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue({});
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('set_map');
      const action: SetMapAction = {
        action: 'set_map',
        key: 'config',
        map_key: 'setting',
        value: true,
        scope: 'user',
      };

      await handler.execute(action, context);
      expect((context as any).state.user.config).toEqual({ setting: true });
    });
  });

  describe('delete_map', () => {
    it('should delete a key from a map', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue({ a: 1, b: 2, c: 3 });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('delete_map');
      const action: DeleteMapAction = {
        action: 'delete_map',
        key: 'data',
        map_key: 'b',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockStateManager.set).toHaveBeenCalledWith('data', { a: 1, c: 3 }, expect.any(Object));
    });

    it('should handle non-existent key', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue({ a: 1 });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('delete_map');
      const action: DeleteMapAction = {
        action: 'delete_map',
        key: 'data',
        map_key: 'notexists',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toEqual({ a: 1 });
    });

    it('should handle empty/null map', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('delete_map');
      const action: DeleteMapAction = {
        action: 'delete_map',
        key: 'data',
        map_key: 'key',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toEqual({});
    });

    it('should interpolate map_key', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue({ key1: 'a', key2: 'b' });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });
      (context as any).deleteKey = 'key1';

      const handler = registry.get('delete_map');
      const action: DeleteMapAction = {
        action: 'delete_map',
        key: 'data',
        map_key: '${deleteKey}',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('${deleteKey}', context);
    });

    it('should update context.state', async () => {
      mockStateManager.get = vi.fn().mockResolvedValue({ x: 1, y: 2 });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, stateManager: mockStateManager } as any,
      });

      const handler = registry.get('delete_map');
      const action: DeleteMapAction = {
        action: 'delete_map',
        key: 'coords',
        map_key: 'x',
        scope: 'member',
      };

      await handler.execute(action, context);
      expect((context as any).state.member.coords).toEqual({ y: 2 });
    });
  });
});
