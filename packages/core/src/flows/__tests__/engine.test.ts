import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlowEngine, createFlowEngine } from '../engine.js';
import type { FlowDefinition, Action } from '@furlow/schema';
import type { ActionContext, ActionResult } from '../../actions/types.js';
import type { ActionExecutor } from '../../actions/executor.js';
import type { ExpressionEvaluator } from '../../expression/evaluator.js';

// Mock evaluator
function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: vi.fn().mockImplementation(async (expr: string, context: Record<string, unknown>) => {
      // Simple expression handling for tests
      if (expr === 'true') return true;
      if (expr === 'false') return false;
      if (expr.match(/^\d+$/)) return parseInt(expr, 10);
      if (expr.startsWith('"') && expr.endsWith('"')) return expr.slice(1, -1);

      // Handle variable access
      const parts = expr.split('.');
      let value: unknown = context;
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return value;
    }),
    evaluateSync: vi.fn(),
    interpolate: vi.fn().mockImplementation(async (template: string) => template),
    interpolateSync: vi.fn().mockImplementation((template: string) => template),
    hasExpressions: vi.fn().mockReturnValue(false),
    addFunction: vi.fn(),
    addTransform: vi.fn(),
    compile: vi.fn(),
  } as unknown as ExpressionEvaluator;
}

// Mock executor
function createMockExecutor(): ActionExecutor {
  return {
    executeOne: vi.fn().mockResolvedValue({ success: true }),
    executeAll: vi.fn().mockResolvedValue([{ success: true }]),
    executeParallel: vi.fn().mockResolvedValue([{ success: true }]),
  } as unknown as ActionExecutor;
}

// Mock context
function createMockContext(): ActionContext {
  return {
    guildId: '123',
    channelId: '456',
    userId: '789',
    client: {},
    stateManager: {},
    evaluator: {},
    flowExecutor: {},
    user: { id: '789', username: 'test' },
    guild: { id: '123', name: 'Test' },
    channel: { id: '456', name: 'test' },
    message: null,
    member: null,
    interaction: null,
    event: {},
    args: {},
    options: {},
    vars: {},
  };
}

describe('FlowEngine', () => {
  let engine: FlowEngine;
  let evaluator: ExpressionEvaluator;
  let executor: ActionExecutor;
  let context: ActionContext;

  beforeEach(() => {
    engine = createFlowEngine();
    evaluator = createMockEvaluator();
    executor = createMockExecutor();
    context = createMockContext();
  });

  describe('register()', () => {
    it('should register a flow', () => {
      const flow: FlowDefinition = {
        name: 'test_flow',
        actions: [{ action: 'log', message: 'test' }],
      };

      engine.register(flow);

      expect(engine.has('test_flow')).toBe(true);
    });

    it('should register flow with parameters', () => {
      const flow: FlowDefinition = {
        name: 'param_flow',
        parameters: [
          { name: 'msg', type: 'string', required: true },
          { name: 'count', type: 'number', default: 1 },
        ],
        actions: [{ action: 'log', message: '${msg}' }],
      };

      engine.register(flow);

      const registered = engine.get('param_flow');
      expect(registered).toBeDefined();
      expect(registered?.parameters.size).toBe(2);
      expect(registered?.parameters.get('msg')?.required).toBe(true);
    });

    it('should overwrite existing flow', () => {
      const flow1: FlowDefinition = {
        name: 'test',
        actions: [{ action: 'log', message: 'first' }],
      };
      const flow2: FlowDefinition = {
        name: 'test',
        actions: [{ action: 'log', message: 'second' }],
      };

      engine.register(flow1);
      engine.register(flow2);

      const flow = engine.get('test');
      expect(flow?.definition.actions[0]).toEqual({ action: 'log', message: 'second' });
    });
  });

  describe('registerAll()', () => {
    it('should register multiple flows', () => {
      const flows: FlowDefinition[] = [
        { name: 'flow1', actions: [] },
        { name: 'flow2', actions: [] },
        { name: 'flow3', actions: [] },
      ];

      engine.registerAll(flows);

      expect(engine.has('flow1')).toBe(true);
      expect(engine.has('flow2')).toBe(true);
      expect(engine.has('flow3')).toBe(true);
    });
  });

  describe('get()', () => {
    it('should return registered flow', () => {
      const flow: FlowDefinition = { name: 'test', actions: [] };
      engine.register(flow);

      expect(engine.get('test')).toBeDefined();
    });

    it('should return undefined for unknown flow', () => {
      expect(engine.get('unknown')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true for registered flows', () => {
      engine.register({ name: 'test', actions: [] });
      expect(engine.has('test')).toBe(true);
    });

    it('should return false for unknown flows', () => {
      expect(engine.has('unknown')).toBe(false);
    });
  });

  describe('getFlowNames()', () => {
    it('should return all flow names', () => {
      engine.register({ name: 'flow_a', actions: [] });
      engine.register({ name: 'flow_b', actions: [] });

      const names = engine.getFlowNames();
      expect(names).toContain('flow_a');
      expect(names).toContain('flow_b');
    });
  });

  describe('clear()', () => {
    it('should remove all flows', () => {
      engine.register({ name: 'flow1', actions: [] });
      engine.register({ name: 'flow2', actions: [] });

      engine.clear();

      expect(engine.getFlowNames()).toHaveLength(0);
    });
  });

  describe('execute()', () => {
    it('should execute flow with actions', async () => {
      const flow: FlowDefinition = {
        name: 'test',
        actions: [
          { action: 'log', message: 'test' },
          { action: 'send_message', content: 'hello' },
        ],
      };
      engine.register(flow);

      const result = await engine.execute('test', {}, context, executor, evaluator);

      expect(result.success).toBe(true);
      expect(executor.executeOne).toHaveBeenCalledTimes(2);
    });

    it('should throw FlowNotFoundError for unknown flow', async () => {
      await expect(
        engine.execute('unknown', {}, context, executor, evaluator)
      ).rejects.toThrow('Flow not found: unknown');
    });

    it('should execute flow with arguments', async () => {
      const flow: FlowDefinition = {
        name: 'greet',
        parameters: [
          { name: 'name', type: 'string', required: true },
        ],
        actions: [{ action: 'log', message: '${name}' }],
      };
      engine.register(flow);

      const result = await engine.execute(
        'greet',
        { name: 'Alice' },
        context,
        executor,
        evaluator
      );

      expect(result.success).toBe(true);
    });

    it('should use default parameter values', async () => {
      const flow: FlowDefinition = {
        name: 'with_default',
        parameters: [
          { name: 'count', type: 'number', default: 5 },
        ],
        actions: [{ action: 'log', message: 'test' }],
      };
      engine.register(flow);

      const result = await engine.execute('with_default', {}, context, executor, evaluator);

      expect(result.success).toBe(true);
    });

    it('should throw for missing required parameters', async () => {
      const flow: FlowDefinition = {
        name: 'required_param',
        parameters: [
          { name: 'value', type: 'string', required: true },
        ],
        actions: [],
      };
      engine.register(flow);

      await expect(
        engine.execute('required_param', {}, context, executor, evaluator)
      ).rejects.toThrow('Missing required parameter');
    });

    it('should validate parameter types', async () => {
      const flow: FlowDefinition = {
        name: 'typed_param',
        parameters: [
          { name: 'count', type: 'number', required: true },
        ],
        actions: [],
      };
      engine.register(flow);

      await expect(
        engine.execute(
          'typed_param',
          { count: 'not a number' },
          context,
          executor,
          evaluator
        )
      ).rejects.toThrow('expected number');
    });
  });

  describe('flow control: flow_if', () => {
    it('should execute then branch when condition is true', async () => {
      const flow: FlowDefinition = {
        name: 'if_test',
        actions: [
          {
            action: 'flow_if',
            if: 'true',
            then: [{ action: 'log', message: 'then' }],
            else: [{ action: 'log', message: 'else' }],
          } as Action,
        ],
      };
      engine.register(flow);

      // Make evaluator return true for 'true'
      (evaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      await engine.execute('if_test', {}, context, executor, evaluator);

      // Should execute only the 'then' branch action
      expect(executor.executeOne).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'log', message: 'then' }),
        expect.anything()
      );
    });

    it('should execute else branch when condition is false', async () => {
      const flow: FlowDefinition = {
        name: 'if_test',
        actions: [
          {
            action: 'flow_if',
            if: 'false',
            then: [{ action: 'log', message: 'then' }],
            else: [{ action: 'log', message: 'else' }],
          } as Action,
        ],
      };
      engine.register(flow);

      (evaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      await engine.execute('if_test', {}, context, executor, evaluator);

      expect(executor.executeOne).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'log', message: 'else' }),
        expect.anything()
      );
    });
  });

  describe('flow control: flow_switch', () => {
    it('should execute matching case', async () => {
      const flow: FlowDefinition = {
        name: 'switch_test',
        actions: [
          {
            action: 'flow_switch',
            value: '"b"',
            cases: {
              a: [{ action: 'log', message: 'case a' }],
              b: [{ action: 'log', message: 'case b' }],
            },
          } as Action,
        ],
      };
      engine.register(flow);

      (evaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValueOnce('b');

      await engine.execute('switch_test', {}, context, executor, evaluator);

      expect(executor.executeOne).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'case b' }),
        expect.anything()
      );
    });

    it('should execute default case when no match', async () => {
      const flow: FlowDefinition = {
        name: 'switch_default',
        actions: [
          {
            action: 'flow_switch',
            value: '"x"',
            cases: {
              a: [{ action: 'log', message: 'case a' }],
            },
            default: [{ action: 'log', message: 'default' }],
          } as Action,
        ],
      };
      engine.register(flow);

      (evaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValueOnce('x');

      await engine.execute('switch_default', {}, context, executor, evaluator);

      expect(executor.executeOne).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'default' }),
        expect.anything()
      );
    });
  });

  describe('flow control: repeat', () => {
    it('should execute actions multiple times', async () => {
      const flow: FlowDefinition = {
        name: 'repeat_test',
        actions: [
          {
            action: 'repeat',
            times: 3,
            do: [{ action: 'log', message: 'iteration' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('repeat_test', {}, context, executor, evaluator);

      expect(executor.executeOne).toHaveBeenCalledTimes(3);
    });

    it('should provide iteration variable', async () => {
      const flow: FlowDefinition = {
        name: 'repeat_var',
        actions: [
          {
            action: 'repeat',
            times: 2,
            as: 'idx',
            do: [{ action: 'log', message: '${idx}' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('repeat_var', {}, context, executor, evaluator);

      // First call should have idx=0, second idx=1
      const calls = (executor.executeOne as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][1].idx).toBe(0);
      expect(calls[1][1].idx).toBe(1);
    });
  });

  describe('flow control: flow_while', () => {
    it('should loop while condition is true', async () => {
      const flow: FlowDefinition = {
        name: 'while_test',
        actions: [
          {
            action: 'flow_while',
            while: 'count < 3',
            do: [{ action: 'log', message: 'loop' }],
          } as Action,
        ],
      };
      engine.register(flow);

      // Mock: return true twice, then false
      let count = 0;
      (evaluator.evaluate as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        if (count < 3) {
          count++;
          return true;
        }
        return false;
      });

      await engine.execute('while_test', {}, context, executor, evaluator);

      expect(executor.executeOne).toHaveBeenCalledTimes(3);
    });
  });

  describe('flow control: abort', () => {
    it('should stop execution on abort', async () => {
      const flow: FlowDefinition = {
        name: 'abort_test',
        actions: [
          { action: 'log', message: 'first' },
          { action: 'abort', reason: 'stopped' },
          { action: 'log', message: 'never reached' },
        ],
      };
      engine.register(flow);

      const result = await engine.execute('abort_test', {}, context, executor, evaluator);

      expect(result.success).toBe(false);
      expect(result.aborted).toBe(true);
      expect(executor.executeOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('flow control: return', () => {
    it('should return value and stop execution', async () => {
      const flow: FlowDefinition = {
        name: 'return_test',
        actions: [
          { action: 'return', value: '"result"' },
          { action: 'log', message: 'never reached' },
        ],
      };
      engine.register(flow);

      (evaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValueOnce('result');

      const result = await engine.execute('return_test', {}, context, executor, evaluator);

      expect(result.success).toBe(true);
      expect(result.value).toBe('result');
      expect(executor.executeOne).not.toHaveBeenCalled();
    });
  });

  describe('flow control: call_flow', () => {
    it('should call nested flow', async () => {
      const innerFlow: FlowDefinition = {
        name: 'inner',
        actions: [{ action: 'log', message: 'inner' }],
      };
      const outerFlow: FlowDefinition = {
        name: 'outer',
        actions: [
          { action: 'call_flow', flow: 'inner' } as Action,
        ],
      };
      engine.register(innerFlow);
      engine.register(outerFlow);

      await engine.execute('outer', {}, context, executor, evaluator);

      expect(executor.executeOne).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'inner' }),
        expect.anything()
      );
    });

    it('should pass arguments to nested flow', async () => {
      const innerFlow: FlowDefinition = {
        name: 'inner',
        parameters: [{ name: 'value', type: 'number' }],
        actions: [{ action: 'log', message: '${value}' }],
      };
      const outerFlow: FlowDefinition = {
        name: 'outer',
        actions: [
          {
            action: 'call_flow',
            flow: 'inner',
            args: { value: '42' },
          } as Action,
        ],
      };
      engine.register(innerFlow);
      engine.register(outerFlow);

      (evaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValueOnce(42);

      await engine.execute('outer', {}, context, executor, evaluator);

      expect(executor.executeOne).toHaveBeenCalled();
    });
  });

  describe('flow control: parallel', () => {
    it('should execute actions in parallel', async () => {
      const flow: FlowDefinition = {
        name: 'parallel_test',
        actions: [
          {
            action: 'parallel',
            actions: [
              { action: 'log', message: 'a' },
              { action: 'log', message: 'b' },
            ],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('parallel_test', {}, context, executor, evaluator);

      expect(executor.executeParallel).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ message: 'a' }),
          expect.objectContaining({ message: 'b' }),
        ]),
        expect.anything()
      );
    });
  });

  describe('depth limiting', () => {
    it('should throw MaxFlowDepthError when depth exceeded on first call', async () => {
      // With maxDepth=0, even the first call should fail
      const engine = createFlowEngine({ maxDepth: 0 });

      const flow: FlowDefinition = {
        name: 'simple',
        actions: [{ action: 'log', message: 'test' }],
      };
      engine.register(flow);

      await expect(
        engine.execute('simple', {}, context, executor, evaluator)
      ).rejects.toThrow('Maximum flow call depth');
    });

    it('should return error when nested call exceeds depth', async () => {
      // With maxDepth=2, the third level of recursion fails
      // The error is caught and returned as success=false
      const engine = createFlowEngine({ maxDepth: 1 });

      const flow: FlowDefinition = {
        name: 'recursive',
        actions: [
          { action: 'call_flow', flow: 'recursive' } as Action,
        ],
      };
      engine.register(flow);

      // The nested call throws, which is caught by the outer call's try/catch
      const result = await engine.execute('recursive', {}, context, executor, evaluator);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('depth');
    });
  });

  describe('createFlowEngine()', () => {
    it('should create engine with default options', () => {
      const engine = createFlowEngine();
      expect(engine).toBeInstanceOf(FlowEngine);
    });

    it('should create engine with custom options', () => {
      const engine = createFlowEngine({ maxDepth: 100, maxIterations: 5000 });
      expect(engine).toBeInstanceOf(FlowEngine);
    });
  });
});
