/**
 * Flow control action handler tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionRegistry } from '../registry.js';
import { registerFlowHandlers } from '../handlers/flow.js';
import {
  createMockEvaluator,
  createMockFlowEngine,
  createHandlerContext,
  expectSuccess,
  expectFailure,
} from './test-utils.js';
import type { ActionRegistry } from '../registry.js';
import type {
  CallFlowAction,
  AbortAction,
  ReturnAction,
  FlowIfAction,
  FlowSwitchAction,
  FlowWhileAction,
  RepeatAction,
  ParallelAction,
  BatchAction,
  TryAction,
  WaitAction,
  LogAction,
  EmitAction,
} from '@furlow/schema';

describe('Flow Handlers', () => {
  let registry: ActionRegistry;
  let mockEvaluator: ReturnType<typeof createMockEvaluator>;
  let mockFlowEngine: ReturnType<typeof createMockFlowEngine>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createActionRegistry();
    mockEvaluator = createMockEvaluator();
    mockFlowEngine = createMockFlowEngine();
    registerFlowHandlers(registry, {
      client: {} as any,
      evaluator: mockEvaluator as any,
      flowEngine: mockFlowEngine as any,
    });
  });

  describe('Handler Registration', () => {
    it('should register all flow handlers', () => {
      expect(registry.has('call_flow')).toBe(true);
      expect(registry.has('abort')).toBe(true);
      expect(registry.has('return')).toBe(true);
      expect(registry.has('flow_if')).toBe(true);
      expect(registry.has('flow_switch')).toBe(true);
      expect(registry.has('flow_while')).toBe(true);
      expect(registry.has('repeat')).toBe(true);
      expect(registry.has('parallel')).toBe(true);
      expect(registry.has('batch')).toBe(true);
      expect(registry.has('try')).toBe(true);
      expect(registry.has('wait')).toBe(true);
      expect(registry.has('log')).toBe(true);
      expect(registry.has('emit')).toBe(true);
    });
  });

  describe('call_flow', () => {
    it('should call a flow', async () => {
      const mockActionExecutor = { executeOne: vi.fn() };
      mockFlowEngine.execute = vi.fn().mockResolvedValue({ success: true, value: 'result' });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, flowEngine: mockFlowEngine } as any,
        _actionExecutor: mockActionExecutor,
      });

      const handler = registry.get('call_flow');
      const action: CallFlowAction = {
        action: 'call_flow',
        flow: 'my_flow',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockFlowEngine.execute).toHaveBeenCalledWith(
        'my_flow',
        {},
        context,
        mockActionExecutor,
        mockEvaluator,
        undefined
      );
    });

    it('should pass arguments to flow', async () => {
      const mockActionExecutor = { executeOne: vi.fn() };
      mockFlowEngine.execute = vi.fn().mockResolvedValue({ success: true });
      mockEvaluator.evaluate = vi.fn().mockImplementation(async (expr) => {
        if (expr === '42') return 42;
        if (expr === '"hello"') return 'hello';
        return expr;
      });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, flowEngine: mockFlowEngine } as any,
        _actionExecutor: mockActionExecutor,
      });

      const handler = registry.get('call_flow');
      const action: CallFlowAction = {
        action: 'call_flow',
        flow: 'my_flow',
        args: {
          num: '42',
          str: '"hello"',
        },
      };

      await handler.execute(action, context);
      expect(mockFlowEngine.execute).toHaveBeenCalledWith(
        'my_flow',
        { num: 42, str: 'hello' },
        context,
        mockActionExecutor,
        mockEvaluator,
        undefined
      );
    });

    it('should store result with as', async () => {
      const mockActionExecutor = { executeOne: vi.fn() };
      mockFlowEngine.execute = vi.fn().mockResolvedValue({ success: true, value: 'flow_result' });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, flowEngine: mockFlowEngine } as any,
        _actionExecutor: mockActionExecutor,
      });

      const handler = registry.get('call_flow');
      const action: CallFlowAction = {
        action: 'call_flow',
        flow: 'my_flow',
        as: 'flowResult',
      };

      await handler.execute(action, context);
      expect((context as any).flowResult).toBe('flow_result');
    });

    it('should fail without flow engine', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('call_flow');
      const action: CallFlowAction = {
        action: 'call_flow',
        flow: 'my_flow',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'FlowEngine not available');
    });

    it('should fail without action executor', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, flowEngine: mockFlowEngine } as any,
      });

      const handler = registry.get('call_flow');
      const action: CallFlowAction = {
        action: 'call_flow',
        flow: 'my_flow',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'ActionExecutor not available');
    });

    it('should propagate flow errors', async () => {
      const mockActionExecutor = { executeOne: vi.fn() };
      mockFlowEngine.execute = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Flow failed')
      });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator, flowEngine: mockFlowEngine } as any,
        _actionExecutor: mockActionExecutor,
      });

      const handler = registry.get('call_flow');
      const action: CallFlowAction = {
        action: 'call_flow',
        flow: 'failing_flow',
      };

      const result = await handler.execute(action, context);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Flow failed');
    });
  });

  describe('abort', () => {
    it('should set abort flag in flow context', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        flowContext: {},
      });

      const handler = registry.get('abort');
      const action: AbortAction = {
        action: 'abort',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect((context.flowContext as any).aborted).toBe(true);
      expect(result.data).toEqual({ aborted: true, reason: undefined });
    });

    it('should set abort reason', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        flowContext: {},
      });

      const handler = registry.get('abort');
      const action: AbortAction = {
        action: 'abort',
        reason: 'User cancelled',
      };

      await handler.execute(action, context);
      expect((context.flowContext as any).abortReason).toBe('User cancelled');
    });

    it('should interpolate reason', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        flowContext: {},
      });
      (context as any).errorMessage = 'Critical error';

      const handler = registry.get('abort');
      const action: AbortAction = {
        action: 'abort',
        reason: '${errorMessage}',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('${errorMessage}', context);
    });
  });

  describe('return', () => {
    it('should set return value in flow context', async () => {
      mockEvaluator.evaluate = vi.fn().mockResolvedValue('returned_value');
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        flowContext: {},
      });

      const handler = registry.get('return');
      const action: ReturnAction = {
        action: 'return',
        value: '"returned_value"',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect((context.flowContext as any).returnValue).toBe('returned_value');
      expect(result.data).toBe('returned_value');
    });

    it('should handle no value', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        flowContext: {},
      });

      const handler = registry.get('return');
      const action: ReturnAction = {
        action: 'return',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toBeUndefined();
    });
  });

  describe('flow_if', () => {
    it('should evaluate condition with condition field', async () => {
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(true);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('flow_if');
      const action: FlowIfAction = {
        action: 'flow_if',
        condition: 'user.id == "123"',
        then: [],
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('user.id == "123"', context);
      expect(result.data).toEqual({ condition: true });
    });

    it('should evaluate condition with if field', async () => {
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(false);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('flow_if');
      const action = {
        action: 'flow_if',
        if: 'count > 10',
        then: [],
      } as FlowIfAction;

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toEqual({ condition: false });
    });

    it('should fail without condition', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('flow_if');
      const action = {
        action: 'flow_if',
        then: [],
      } as FlowIfAction;

      const result = await handler.execute(action, context);
      expectFailure(result, 'Condition is required');
    });
  });

  describe('flow_switch', () => {
    it('should evaluate switch value', async () => {
      mockEvaluator.evaluate = vi.fn().mockResolvedValue('option_a');
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('flow_switch');
      const action: FlowSwitchAction = {
        action: 'flow_switch',
        value: 'selectedOption',
        cases: {},
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('selectedOption', context);
      expect(result.data).toEqual({ value: 'option_a' });
    });
  });

  describe('flow_while', () => {
    it('should return success (execution handled by FlowEngine)', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('flow_while');
      const action: FlowWhileAction = {
        action: 'flow_while',
        condition: 'count < 10',
        do: [],
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
    });
  });

  describe('repeat', () => {
    it('should return success (execution handled by FlowEngine)', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('repeat');
      const action: RepeatAction = {
        action: 'repeat',
        times: 5,
        do: [],
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
    });
  });

  describe('parallel', () => {
    it('should return success (execution handled by ActionExecutor)', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('parallel');
      const action: ParallelAction = {
        action: 'parallel',
        actions: [],
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
    });
  });

  describe('batch', () => {
    it('should evaluate items array', async () => {
      mockEvaluator.evaluate = vi.fn().mockResolvedValue([1, 2, 3]);
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('batch');
      const action: BatchAction = {
        action: 'batch',
        items: 'myArray',
        do: [],
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('myArray', context);
      expect(result.data).toEqual({ items: [1, 2, 3], count: 3 });
    });

    it('should fail if items is not array', async () => {
      mockEvaluator.evaluate = vi.fn().mockResolvedValue('not an array');
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('batch');
      const action: BatchAction = {
        action: 'batch',
        items: 'notArray',
        do: [],
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Items must be an array');
    });
  });

  describe('try', () => {
    it('should return success (execution handled by FlowEngine)', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('try');
      const action: TryAction = {
        action: 'try',
        do: [],
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
    });
  });

  describe('wait', () => {
    it('should wait for specified duration', async () => {
      vi.useFakeTimers();
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('wait');
      const action: WaitAction = {
        action: 'wait',
        duration: '500ms',
      };

      const resultPromise = handler.execute(action, context);
      await vi.advanceTimersByTimeAsync(500);
      const result = await resultPromise;

      expectSuccess(result);
      vi.useRealTimers();
    });

    it('should parse different duration formats', async () => {
      vi.useFakeTimers();
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });
      const handler = registry.get('wait');

      // Test seconds
      const secPromise = handler.execute({ action: 'wait', duration: '2s' }, context);
      await vi.advanceTimersByTimeAsync(2000);
      expectSuccess(await secPromise);

      // Test minutes
      const minPromise = handler.execute({ action: 'wait', duration: '1m' }, context);
      await vi.advanceTimersByTimeAsync(60000);
      expectSuccess(await minPromise);

      vi.useRealTimers();
    });
  });

  describe('log', () => {
    it('should log a message at info level', async () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('log');
      const action: LogAction = {
        action: 'log',
        message: 'Hello World',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(consoleSpy).toHaveBeenCalledWith('[FURLOW] Hello World');
      consoleSpy.mockRestore();
    });

    it('should log at debug level', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('log');
      const action: LogAction = {
        action: 'log',
        message: 'Debug message',
        level: 'debug',
      };

      await handler.execute(action, context);
      expect(consoleSpy).toHaveBeenCalledWith('[FURLOW] Debug message');
      consoleSpy.mockRestore();
    });

    it('should log at warn level', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('log');
      const action: LogAction = {
        action: 'log',
        message: 'Warning!',
        level: 'warn',
      };

      await handler.execute(action, context);
      expect(consoleSpy).toHaveBeenCalledWith('[FURLOW] Warning!');
      consoleSpy.mockRestore();
    });

    it('should log at error level', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('log');
      const action: LogAction = {
        action: 'log',
        message: 'Error occurred',
        level: 'error',
      };

      await handler.execute(action, context);
      expect(consoleSpy).toHaveBeenCalledWith('[FURLOW] Error occurred');
      consoleSpy.mockRestore();
    });

    it('should interpolate message', async () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });
      (context as any).count = 5;

      const handler = registry.get('log');
      const action: LogAction = {
        action: 'log',
        message: 'Count is ${count}',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('Count is ${count}', context);
      consoleSpy.mockRestore();
    });
  });

  describe('emit', () => {
    it('should emit an event', async () => {
      const mockEventRouter = {
        emit: vi.fn().mockResolvedValue(undefined),
      };
      const mockActionExecutor = { executeOne: vi.fn() };
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _eventRouter: mockEventRouter,
        _actionExecutor: mockActionExecutor,
      });

      const handler = registry.get('emit');
      const action: EmitAction = {
        action: 'emit',
        event: 'custom_event',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockEventRouter.emit).toHaveBeenCalledWith(
        'custom_event',
        expect.any(Object),
        mockActionExecutor,
        mockEvaluator
      );
    });

    it('should include data in emitted event', async () => {
      const mockEventRouter = {
        emit: vi.fn().mockResolvedValue(undefined),
      };
      const mockActionExecutor = { executeOne: vi.fn() };
      mockEvaluator.evaluate = vi.fn().mockImplementation(async (expr) => {
        if (expr === 'userId') return '123';
        if (expr === 'action') return 'click';
        return expr;
      });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _eventRouter: mockEventRouter,
        _actionExecutor: mockActionExecutor,
      });

      const handler = registry.get('emit');
      const action: EmitAction = {
        action: 'emit',
        event: 'user_action',
        data: {
          user: 'userId',
          action: 'action',
        },
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toEqual({
        event: 'user_action',
        data: { user: '123', action: 'click' },
      });
    });

    it('should succeed without event router', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('emit');
      const action: EmitAction = {
        action: 'emit',
        event: 'custom_event',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
    });
  });
});
