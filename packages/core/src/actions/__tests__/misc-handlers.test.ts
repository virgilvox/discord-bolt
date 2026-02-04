/**
 * Miscellaneous action handler tests (pipes, webhooks, timers, metrics, canvas)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createActionRegistry } from '../registry.js';
import { registerMiscHandlers } from '../handlers/misc.js';
import {
  createMockEvaluator,
  createHandlerContext,
  expectSuccess,
  expectFailure,
} from './test-utils.js';
import type { ActionRegistry } from '../registry.js';
import type {
  PipeRequestAction,
  PipeSendAction,
  WebhookSendAction,
  CreateTimerAction,
  CancelTimerAction,
  CounterIncrementAction,
  RecordMetricAction,
  CanvasRenderAction,
  RenderLayersAction,
} from '@furlow/schema';

// Mock fetch globally
const originalFetch = global.fetch;

describe('Misc Handlers', () => {
  let registry: ActionRegistry;
  let mockEvaluator: ReturnType<typeof createMockEvaluator>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    registry = createActionRegistry();
    mockEvaluator = createMockEvaluator();
    registerMiscHandlers(registry, {
      client: {} as any,
      evaluator: mockEvaluator as any,
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: 'response' }),
      text: vi.fn().mockResolvedValue('response'),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  describe('Handler Registration', () => {
    it('should register all misc handlers', () => {
      expect(registry.has('pipe_request')).toBe(true);
      expect(registry.has('pipe_send')).toBe(true);
      expect(registry.has('webhook_send')).toBe(true);
      expect(registry.has('create_timer')).toBe(true);
      expect(registry.has('cancel_timer')).toBe(true);
      expect(registry.has('counter_increment')).toBe(true);
      expect(registry.has('record_metric')).toBe(true);
      expect(registry.has('canvas_render')).toBe(true);
      expect(registry.has('render_layers')).toBe(true);
    });
  });

  describe('pipe_request', () => {
    it('should make HTTP request to configured pipe', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _pipes: {
          api: {
            url: 'https://api.example.com',
          },
        },
      });

      const handler = registry.get('pipe_request');
      const action: PipeRequestAction = {
        action: 'pipe_request',
        pipe: 'api',
        method: 'GET',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should append path to base URL', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _pipes: {
          api: {
            url: 'https://api.example.com/',
          },
        },
      });

      const handler = registry.get('pipe_request');
      const action: PipeRequestAction = {
        action: 'pipe_request',
        pipe: 'api',
        path: '/users/123',
      };

      await handler.execute(action, context);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.any(Object)
      );
    });

    it('should send JSON body for POST request', async () => {
      mockEvaluator.evaluate = vi.fn().mockImplementation(async (expr) => {
        if (expr === 'user.name') return 'Alice';
        if (expr === '10') return 10;
        return expr;
      });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _pipes: {
          api: {
            url: 'https://api.example.com',
          },
        },
      });

      const handler = registry.get('pipe_request');
      const action: PipeRequestAction = {
        action: 'pipe_request',
        pipe: 'api',
        method: 'POST',
        body: {
          name: 'user.name',
          level: '10',
        },
      };

      await handler.execute(action, context);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Alice', level: 10 }),
        })
      );
    });

    it('should merge custom headers', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _pipes: {
          api: {
            url: 'https://api.example.com',
            headers: {
              'Authorization': 'Bearer token',
            },
          },
        },
      });

      const handler = registry.get('pipe_request');
      const action: PipeRequestAction = {
        action: 'pipe_request',
        pipe: 'api',
        headers: {
          'X-Custom': 'value',
        },
      };

      await handler.execute(action, context);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token',
            'X-Custom': 'value',
          }),
        })
      );
    });

    it('should store response with as', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _pipes: {
          api: {
            url: 'https://api.example.com',
          },
        },
      });

      const handler = registry.get('pipe_request');
      const action: PipeRequestAction = {
        action: 'pipe_request',
        pipe: 'api',
        as: 'response',
      };

      await handler.execute(action, context);
      expect((context as any).response).toEqual({
        status: 200,
        ok: true,
        data: { data: 'response' },
      });
    });

    it('should fail if pipe not found', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _pipes: {},
      });

      const handler = registry.get('pipe_request');
      const action: PipeRequestAction = {
        action: 'pipe_request',
        pipe: 'nonexistent',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Pipe "nonexistent" not found');
    });

    it('should handle failed responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: 'Not found' }),
      });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _pipes: {
          api: {
            url: 'https://api.example.com',
          },
        },
      });

      const handler = registry.get('pipe_request');
      const action: PipeRequestAction = {
        action: 'pipe_request',
        pipe: 'api',
      };

      const result = await handler.execute(action, context);
      expect(result.success).toBe(false);
    });
  });

  describe('pipe_send', () => {
    it('should send data through WebSocket connection', async () => {
      const mockConnection = {
        send: vi.fn(),
      };
      mockEvaluator.evaluate = vi.fn().mockResolvedValue('test-data');
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _pipeConnections: {
          ws: mockConnection,
        },
      });

      const handler = registry.get('pipe_send');
      const action: PipeSendAction = {
        action: 'pipe_send',
        pipe: 'ws',
        data: {
          type: '"message"',
          content: 'test-data',
        },
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockConnection.send).toHaveBeenCalled();
    });

    it('should send through MQTT-style connection', async () => {
      const mockConnection = {
        publish: vi.fn(),
      };
      mockEvaluator.evaluate = vi.fn().mockResolvedValue('value');
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _pipeConnections: {
          mqtt: mockConnection,
        },
      });

      const handler = registry.get('pipe_send');
      const action: PipeSendAction = {
        action: 'pipe_send',
        pipe: 'mqtt',
        data: {
          key: '"test"',
        },
      };

      await handler.execute(action, context);
      expect(mockConnection.publish).toHaveBeenCalled();
    });

    it('should fail if connection not found', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _pipeConnections: {},
      });

      const handler = registry.get('pipe_send');
      const action: PipeSendAction = {
        action: 'pipe_send',
        pipe: 'nonexistent',
        data: {},
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Pipe connection "nonexistent" not found');
    });
  });

  describe('webhook_send', () => {
    it('should send webhook message', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('webhook_send');
      const action: WebhookSendAction = {
        action: 'webhook_send',
        url: 'https://discord.com/api/webhooks/123/token',
        content: 'Hello from webhook!',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/123/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Hello from webhook!'),
        })
      );
    });

    it('should send with username and avatar', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('webhook_send');
      const action: WebhookSendAction = {
        action: 'webhook_send',
        url: 'https://discord.com/api/webhooks/123/token',
        content: 'Hello!',
        username: 'Custom Bot',
        avatar_url: 'https://example.com/avatar.png',
      };

      await handler.execute(action, context);
      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.username).toBe('Custom Bot');
      expect(body.avatar_url).toBe('https://example.com/avatar.png');
    });

    it('should send with embeds', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('webhook_send');
      const action: WebhookSendAction = {
        action: 'webhook_send',
        url: 'https://discord.com/api/webhooks/123/token',
        embeds: [
          {
            title: 'Test Embed',
            description: 'Description here',
            color: 5814783,
          },
        ],
      };

      await handler.execute(action, context);
      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.embeds).toHaveLength(1);
      expect(body.embeds[0].title).toBe('Test Embed');
    });

    it('should handle webhook failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('webhook_send');
      const action: WebhookSendAction = {
        action: 'webhook_send',
        url: 'https://discord.com/api/webhooks/123/token',
        content: 'Hello!',
      };

      const result = await handler.execute(action, context);
      expect(result.success).toBe(false);
    });
  });

  describe('create_timer', () => {
    it('should create a timer', async () => {
      const mockEventRouter = {
        emit: vi.fn().mockResolvedValue(undefined),
      };
      mockEvaluator.evaluate = vi.fn().mockResolvedValue('test-value');
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _eventRouter: mockEventRouter,
      });

      const handler = registry.get('create_timer');
      const action: CreateTimerAction = {
        action: 'create_timer',
        id: 'my_timer',
        duration: '5s',
        event: 'timer_expired',
        data: {
          key: '"value"',
        },
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toEqual({ id: 'my_timer', duration: 5000 });

      // Timer should not have fired yet
      expect(mockEventRouter.emit).not.toHaveBeenCalled();

      // Advance time
      await vi.advanceTimersByTimeAsync(5000);

      // Timer should have fired
      expect(mockEventRouter.emit).toHaveBeenCalledWith(
        'timer_expired',
        expect.any(Object)
      );
    });

    it('should parse different duration formats', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });
      const handler = registry.get('create_timer');

      const result1 = await handler.execute({
        action: 'create_timer',
        id: 't1',
        duration: '100ms',
        event: 'e1',
      }, context);
      expect((result1.data as any).duration).toBe(100);

      const result2 = await handler.execute({
        action: 'create_timer',
        id: 't2',
        duration: '1m',
        event: 'e2',
      }, context);
      expect((result2.data as any).duration).toBe(60000);

      const result3 = await handler.execute({
        action: 'create_timer',
        id: 't3',
        duration: '1h',
        event: 'e3',
      }, context);
      expect((result3.data as any).duration).toBe(3600000);
    });
  });

  describe('cancel_timer', () => {
    it('should cancel an existing timer', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _timers: {},
      });

      // First create a timer
      const createHandler = registry.get('create_timer');
      await createHandler.execute({
        action: 'create_timer',
        id: 'test_timer',
        duration: '10s',
        event: 'test_event',
      }, context);

      // Then cancel it
      const cancelHandler = registry.get('cancel_timer');
      const result = await cancelHandler.execute({
        action: 'cancel_timer',
        id: 'test_timer',
      }, context);

      expectSuccess(result);
      expect((context as any)._timers['test_timer']).toBeUndefined();
    });

    it('should fail if timer not found', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _timers: {},
      });

      const handler = registry.get('cancel_timer');
      const action: CancelTimerAction = {
        action: 'cancel_timer',
        id: 'nonexistent',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Timer "nonexistent" not found');
    });
  });

  describe('counter_increment', () => {
    it('should increment a counter', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('counter_increment');
      const action: CounterIncrementAction = {
        action: 'counter_increment',
        name: 'requests_total',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toBe(1);

      // Increment again
      const result2 = await handler.execute(action, context);
      expect(result2.data).toBe(2);
    });

    it('should increment by specified value', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('counter_increment');
      const action: CounterIncrementAction = {
        action: 'counter_increment',
        name: 'bytes_sent',
        value: 1024,
      };

      const result = await handler.execute(action, context);
      expect(result.data).toBe(1024);
    });

    it('should handle labels', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('counter_increment');
      const action: CounterIncrementAction = {
        action: 'counter_increment',
        name: 'http_requests',
        labels: {
          method: 'GET',
          status: '200',
        },
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);

      // Check that the counter was stored with labels
      expect((context as any)._metrics.counters['http_requests{method=GET,status=200}']).toBe(1);
    });
  });

  describe('record_metric', () => {
    it('should record a counter metric', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('record_metric');
      const action: RecordMetricAction = {
        action: 'record_metric',
        name: 'events_total',
        type: 'counter',
        value: 5,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect((context as any)._metrics.counters['events_total']).toBe(5);
    });

    it('should record a gauge metric', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('record_metric');
      const action: RecordMetricAction = {
        action: 'record_metric',
        name: 'active_users',
        type: 'gauge',
        value: 42,
      };

      await handler.execute(action, context);
      expect((context as any)._metrics.gauges['active_users']).toBe(42);
    });

    it('should record a histogram metric', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('record_metric');

      await handler.execute({
        action: 'record_metric',
        name: 'request_duration',
        type: 'histogram',
        value: 0.5,
      }, context);

      await handler.execute({
        action: 'record_metric',
        name: 'request_duration',
        type: 'histogram',
        value: 1.2,
      }, context);

      const hist = (context as any)._metrics.histograms['request_duration'];
      expect(hist.values).toEqual([0.5, 1.2]);
      expect(hist.sum).toBe(1.7);
      expect(hist.count).toBe(2);
    });

    it('should handle labels in metrics', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('record_metric');
      const action: RecordMetricAction = {
        action: 'record_metric',
        name: 'response_time',
        type: 'gauge',
        value: 150,
        labels: {
          endpoint: '/api/users',
          method: 'GET',
        },
      };

      await handler.execute(action, context);
      expect((context as any)._metrics.gauges['response_time{endpoint=/api/users,method=GET}']).toBe(150);
    });
  });

  describe('canvas_render', () => {
    it('should fail for non-existent generator', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _canvasGenerators: {},
      });

      const handler = registry.get('canvas_render');
      const action: CanvasRenderAction = {
        action: 'canvas_render',
        generator: 'nonexistent',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'not found');
    });

    it('should fail when _canvasGenerators is missing', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('canvas_render');
      const action: CanvasRenderAction = {
        action: 'canvas_render',
        generator: 'test',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'not found');
    });

    it('should interpolate generator name', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
        _canvasGenerators: {},
      });
      (context as any).genName = 'welcome_card';

      const handler = registry.get('canvas_render');
      const action: CanvasRenderAction = {
        action: 'canvas_render',
        generator: '${genName}',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('${genName}', context);
    });
  });

  describe('render_layers', () => {
    it('should have correct handler properties', () => {
      const handler = registry.get('render_layers');
      expect(handler.name).toBe('render_layers');
      expect(typeof handler.execute).toBe('function');
    });

    it('should interpolate background when provided', async () => {
      const context = createHandlerContext({
        _deps: { evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('render_layers');
      const action: RenderLayersAction = {
        action: 'render_layers',
        width: 100,
        height: 100,
        background: '${bgColor}',
        layers: [],
      };

      // The handler will try to render but fail due to no canvas module
      // We just want to verify it processes the background expression
      try {
        await handler.execute(action, context);
      } catch {
        // Expected to fail without canvas module
      }

      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('${bgColor}', context);
    });

    it('should accept required parameters', () => {
      const action: RenderLayersAction = {
        action: 'render_layers',
        width: 400,
        height: 200,
        layers: [],
      };

      expect(action.width).toBe(400);
      expect(action.height).toBe(200);
      expect(action.layers).toEqual([]);
    });

    it('should accept optional parameters', () => {
      const action: RenderLayersAction = {
        action: 'render_layers',
        width: 400,
        height: 200,
        background: '#333333',
        layers: [],
        format: 'jpeg',
        quality: 0.9,
        as: 'result',
      };

      expect(action.background).toBe('#333333');
      expect(action.format).toBe('jpeg');
      expect(action.quality).toBe(0.9);
      expect(action.as).toBe('result');
    });
  });
});
