import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionRegistry, createActionRegistry, getActionRegistry } from '../registry.js';
import type { ActionHandler, ActionContext, ActionResult } from '../types.js';
import type { Action } from '@furlow/schema';

// Mock action type for testing
interface TestAction extends Action {
  action: 'test_action';
  value: string;
}

interface AnotherAction extends Action {
  action: 'another_action';
  count: number;
}

// Create mock context
function createMockContext(): ActionContext {
  return {
    guildId: '123456789',
    channelId: '987654321',
    userId: '111222333',
    client: {},
    stateManager: {},
    evaluator: {},
    flowExecutor: {},
    user: { id: '111222333', username: 'test' },
    guild: { id: '123456789', name: 'Test Guild' },
    channel: { id: '987654321', name: 'test-channel' },
    message: null,
    member: null,
    interaction: null,
    event: {},
    args: {},
    options: {},
    vars: {},
  };
}

// Create mock handlers
function createTestHandler(): ActionHandler<TestAction, string> {
  return {
    name: 'test_action',
    execute: vi.fn().mockResolvedValue({ success: true, data: 'test result' }),
    validate: vi.fn().mockReturnValue(true),
  };
}

function createAnotherHandler(): ActionHandler<AnotherAction, number> {
  return {
    name: 'another_action',
    execute: vi.fn().mockResolvedValue({ success: true, data: 42 }),
  };
}

describe('ActionRegistry', () => {
  let registry: ActionRegistry;

  beforeEach(() => {
    registry = createActionRegistry();
  });

  describe('register()', () => {
    it('should register an action handler', () => {
      const handler = createTestHandler();
      registry.register(handler);

      expect(registry.has('test_action')).toBe(true);
    });

    it('should allow overwriting existing handler with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const handler1 = createTestHandler();
      const handler2 = createTestHandler();
      handler2.execute = vi.fn().mockResolvedValue({ success: true, data: 'new result' });

      registry.register(handler1);
      registry.register(handler2);

      expect(consoleSpy).toHaveBeenCalledWith('Action handler "test_action" is being overwritten');
      expect(registry.get('test_action')).toBe(handler2);

      consoleSpy.mockRestore();
    });
  });

  describe('registerAll()', () => {
    it('should register multiple handlers', () => {
      const handlers = [createTestHandler(), createAnotherHandler()];
      registry.registerAll(handlers);

      expect(registry.has('test_action')).toBe(true);
      expect(registry.has('another_action')).toBe(true);
    });

    it('should register empty array without error', () => {
      expect(() => registry.registerAll([])).not.toThrow();
    });
  });

  describe('get()', () => {
    it('should return registered handler', () => {
      const handler = createTestHandler();
      registry.register(handler);

      expect(registry.get('test_action')).toBe(handler);
    });

    it('should throw ActionNotFoundError for unknown action', () => {
      expect(() => registry.get('unknown_action')).toThrow();

      try {
        registry.get('unknown_action');
      } catch (err) {
        expect((err as Error).message).toContain('unknown_action');
      }
    });
  });

  describe('has()', () => {
    it('should return true for registered handlers', () => {
      registry.register(createTestHandler());
      expect(registry.has('test_action')).toBe(true);
    });

    it('should return false for unregistered handlers', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('getNames()', () => {
    it('should return all registered action names', () => {
      registry.register(createTestHandler());
      registry.register(createAnotherHandler());

      const names = registry.getNames();
      expect(names).toContain('test_action');
      expect(names).toContain('another_action');
      expect(names).toHaveLength(2);
    });

    it('should return empty array when no handlers registered', () => {
      expect(registry.getNames()).toEqual([]);
    });
  });

  describe('getAll()', () => {
    it('should return all registered handlers', () => {
      const handler1 = createTestHandler();
      const handler2 = createAnotherHandler();

      registry.register(handler1);
      registry.register(handler2);

      const handlers = registry.getAll();
      expect(handlers).toContain(handler1);
      expect(handlers).toContain(handler2);
      expect(handlers).toHaveLength(2);
    });

    it('should return empty array when no handlers registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('unregister()', () => {
    it('should remove registered handler', () => {
      registry.register(createTestHandler());
      expect(registry.has('test_action')).toBe(true);

      const result = registry.unregister('test_action');

      expect(result).toBe(true);
      expect(registry.has('test_action')).toBe(false);
    });

    it('should return false for non-existent handler', () => {
      expect(registry.unregister('nonexistent')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should remove all registered handlers', () => {
      registry.register(createTestHandler());
      registry.register(createAnotherHandler());

      expect(registry.getNames()).toHaveLength(2);

      registry.clear();

      expect(registry.getNames()).toHaveLength(0);
    });
  });

  describe('action execution', () => {
    it('should execute registered handler', async () => {
      const handler = createTestHandler();
      registry.register(handler);

      const config: TestAction = { action: 'test_action', value: 'hello' };
      const context = createMockContext();

      const registeredHandler = registry.get('test_action');
      const result = await registeredHandler.execute(config, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test result');
      expect(handler.execute).toHaveBeenCalledWith(config, context);
    });

    it('should validate action config', () => {
      const handler = createTestHandler();
      registry.register(handler);

      const config: TestAction = { action: 'test_action', value: 'test' };
      const registeredHandler = registry.get('test_action');

      const isValid = registeredHandler.validate?.(config);
      expect(isValid).toBe(true);
      expect(handler.validate).toHaveBeenCalledWith(config);
    });

    it('should handle handlers without validate method', () => {
      const handler = createAnotherHandler(); // No validate method
      registry.register(handler);

      const registeredHandler = registry.get('another_action');
      expect(registeredHandler.validate).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle execution errors', async () => {
      const handler: ActionHandler<TestAction> = {
        name: 'error_action',
        execute: vi.fn().mockResolvedValue({
          success: false,
          error: new Error('Test error'),
        }),
      };

      registry.register(handler);
      const context = createMockContext();

      const result = await registry.get('error_action').execute(
        { action: 'test_action', value: 'test' } as TestAction,
        context
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Test error');
    });

    it('should handle async rejection', async () => {
      const handler: ActionHandler<TestAction> = {
        name: 'reject_action',
        execute: vi.fn().mockRejectedValue(new Error('Async error')),
      };

      registry.register(handler);
      const context = createMockContext();

      await expect(
        registry.get('reject_action').execute(
          { action: 'test_action', value: 'test' } as TestAction,
          context
        )
      ).rejects.toThrow('Async error');
    });
  });
});

describe('Global Registry', () => {
  it('getActionRegistry() returns singleton', () => {
    const registry1 = getActionRegistry();
    const registry2 = getActionRegistry();

    expect(registry1).toBe(registry2);
  });

  it('createActionRegistry() creates new instance', () => {
    const registry1 = createActionRegistry();
    const registry2 = createActionRegistry();

    expect(registry1).not.toBe(registry2);
  });
});
