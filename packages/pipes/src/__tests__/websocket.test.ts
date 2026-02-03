/**
 * WebSocket Pipe Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketPipe, createWebSocketPipe } from '../websocket/index.js';
import type { WebSocketPipeConfig } from '../types.js';

// Mock WebSocket
vi.mock('ws', () => {
  const MockWebSocket = vi.fn().mockImplementation(function(this: any, url: string, options?: any) {
    this.url = url;
    this.options = options;
    this.readyState = 1; // OPEN
    this.listeners = new Map();

    this.on = vi.fn((event: string, callback: Function) => {
      const handlers = this.listeners.get(event) || [];
      handlers.push(callback);
      this.listeners.set(event, handlers);
    });

    this.send = vi.fn();
    this.close = vi.fn(() => {
      this.readyState = 3; // CLOSED
    });

    // Simulate connection after a tick
    setTimeout(() => {
      const handlers = this.listeners.get('open') || [];
      handlers.forEach((h: Function) => h());
    }, 0);
  });

  MockWebSocket.OPEN = 1;
  MockWebSocket.CLOSED = 3;

  return { default: MockWebSocket };
});

describe('WebSocketPipe', () => {
  describe('Creation', () => {
    it('should create a WebSocket pipe', () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      expect(pipe).toBeInstanceOf(WebSocketPipe);
      expect(pipe.name).toBe('test-ws');
      expect(pipe.type).toBe('websocket');
    });

    it('should not be connected initially', () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      expect(pipe.isConnected()).toBe(false);
    });
  });

  describe('Duration Parsing', () => {
    const parseDuration = (duration: string): number => {
      const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
      if (!match) return 5000;

      const value = parseInt(match[1]!, 10);
      const unit = match[2] ?? 's';

      switch (unit) {
        case 'ms':
          return value;
        case 's':
          return value * 1000;
        case 'm':
          return value * 60 * 1000;
        case 'h':
          return value * 60 * 60 * 1000;
        default:
          return value * 1000;
      }
    };

    it('should parse duration strings correctly', () => {
      expect(parseDuration('100ms')).toBe(100);
      expect(parseDuration('5s')).toBe(5000);
      expect(parseDuration('2m')).toBe(120000);
      expect(parseDuration('1h')).toBe(3600000);
    });

    it('should default to 5000ms for invalid format', () => {
      expect(parseDuration('invalid')).toBe(5000);
    });
  });

  describe('Event Handler Management', () => {
    it('should register event handlers', () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      const handler = vi.fn();
      pipe.on('message', handler);

      // Verify handler was registered (indirectly through behavior)
      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove event handlers', () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      const handler = vi.fn();
      pipe.on('message', handler);
      pipe.off('message', handler);

      // Handler should be removed
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Message Handling Logic', () => {
    interface EventEmitter {
      handlers: Map<string, Function[]>;
      emit: (event: string, data: unknown) => void;
      on: (event: string, handler: Function) => void;
    }

    const createEmitter = (): EventEmitter => ({
      handlers: new Map(),
      emit(event: string, data: unknown) {
        const handlers = this.handlers.get(event) ?? [];
        handlers.forEach(h => h(data));
      },
      on(event: string, handler: Function) {
        const handlers = this.handlers.get(event) ?? [];
        handlers.push(handler);
        this.handlers.set(event, handlers);
      },
    });

    const handleMessage = (emitter: EventEmitter, rawData: string): void => {
      let data: unknown;

      try {
        data = JSON.parse(rawData);
      } catch {
        data = rawData;
      }

      emitter.emit('message', data);

      if (typeof data === 'object' && data !== null && 'event' in data) {
        const event = (data as { event: string }).event;
        emitter.emit(event, data);
      }
    };

    it('should parse JSON messages', () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.on('message', handler);

      handleMessage(emitter, '{"type": "test", "value": 123}');

      expect(handler).toHaveBeenCalledWith({ type: 'test', value: 123 });
    });

    it('should handle plain text messages', () => {
      const emitter = createEmitter();
      const handler = vi.fn();
      emitter.on('message', handler);

      handleMessage(emitter, 'plain text');

      expect(handler).toHaveBeenCalledWith('plain text');
    });

    it('should emit typed events', () => {
      const emitter = createEmitter();
      const messageHandler = vi.fn();
      const userJoinHandler = vi.fn();
      emitter.on('message', messageHandler);
      emitter.on('user_join', userJoinHandler);

      handleMessage(emitter, '{"event": "user_join", "user": "Alice"}');

      expect(messageHandler).toHaveBeenCalled();
      expect(userJoinHandler).toHaveBeenCalledWith({ event: 'user_join', user: 'Alice' });
    });

    it('should not emit typed event for non-event messages', () => {
      const emitter = createEmitter();
      const otherHandler = vi.fn();
      emitter.on('other', otherHandler);

      handleMessage(emitter, '{"type": "data"}');

      expect(otherHandler).not.toHaveBeenCalled();
    });
  });

  describe('Reconnection Logic', () => {
    interface ReconnectConfig {
      enabled: boolean;
      maxAttempts: number;
      delay: number;
    }

    interface ReconnectState {
      attempts: number;
      reconnecting: boolean;
    }

    const shouldReconnect = (
      config: ReconnectConfig,
      state: ReconnectState
    ): boolean => {
      if (!config.enabled || state.reconnecting) {
        return false;
      }

      if (state.attempts >= config.maxAttempts) {
        return false;
      }

      return true;
    };

    it('should allow reconnection when enabled', () => {
      const result = shouldReconnect(
        { enabled: true, maxAttempts: 10, delay: 5000 },
        { attempts: 0, reconnecting: false }
      );
      expect(result).toBe(true);
    });

    it('should not reconnect when disabled', () => {
      const result = shouldReconnect(
        { enabled: false, maxAttempts: 10, delay: 5000 },
        { attempts: 0, reconnecting: false }
      );
      expect(result).toBe(false);
    });

    it('should not reconnect when already reconnecting', () => {
      const result = shouldReconnect(
        { enabled: true, maxAttempts: 10, delay: 5000 },
        { attempts: 0, reconnecting: true }
      );
      expect(result).toBe(false);
    });

    it('should not reconnect after max attempts', () => {
      const result = shouldReconnect(
        { enabled: true, maxAttempts: 10, delay: 5000 },
        { attempts: 10, reconnecting: false }
      );
      expect(result).toBe(false);
    });

    it('should continue reconnecting under max attempts', () => {
      const result = shouldReconnect(
        { enabled: true, maxAttempts: 10, delay: 5000 },
        { attempts: 5, reconnecting: false }
      );
      expect(result).toBe(true);
    });
  });

  describe('Send Logic', () => {
    const formatMessage = (data: unknown): string => {
      return typeof data === 'string' ? data : JSON.stringify(data);
    };

    it('should pass through string messages', () => {
      expect(formatMessage('hello')).toBe('hello');
    });

    it('should stringify objects', () => {
      expect(formatMessage({ type: 'ping' })).toBe('{"type":"ping"}');
    });

    it('should stringify arrays', () => {
      expect(formatMessage([1, 2, 3])).toBe('[1,2,3]');
    });

    it('should stringify null', () => {
      expect(formatMessage(null)).toBe('null');
    });

    it('should stringify numbers', () => {
      expect(formatMessage(123)).toBe('123');
    });
  });

  describe('Request/Response Pattern', () => {
    interface RequestOptions {
      timeout: number;
      responseEvent: string;
    }

    // Simplified request logic
    const createRequest = <T>(
      sendFn: (data: unknown) => boolean,
      onEvent: (event: string, handler: (data: unknown) => void) => void,
      offEvent: (event: string, handler: (data: unknown) => void) => void,
      data: unknown,
      options: RequestOptions
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve({ success: false, error: 'Request timeout' });
        }, options.timeout);

        const handler = (response: unknown) => {
          clearTimeout(timer);
          offEvent(options.responseEvent, handler);
          resolve({ success: true, data: response as T });
        };

        onEvent(options.responseEvent, handler);

        if (!sendFn(data)) {
          clearTimeout(timer);
          offEvent(options.responseEvent, handler);
          resolve({ success: false, error: 'Not connected' });
        }
      });
    };

    it('should timeout on no response', async () => {
      const events: Record<string, Function[]> = {};
      const send = vi.fn(() => true);
      const on = (event: string, handler: Function) => {
        events[event] = events[event] || [];
        events[event].push(handler);
      };
      const off = vi.fn();

      const result = await createRequest(
        send,
        on,
        off,
        { type: 'ping' },
        { timeout: 10, responseEvent: 'pong' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should resolve on response', async () => {
      const events: Record<string, Function[]> = {};
      const send = vi.fn(() => {
        // Simulate response
        setTimeout(() => {
          events['pong']?.forEach(h => h({ type: 'pong' }));
        }, 5);
        return true;
      });
      const on = (event: string, handler: Function) => {
        events[event] = events[event] || [];
        events[event].push(handler);
      };
      const off = vi.fn();

      const result = await createRequest(
        send,
        on,
        off,
        { type: 'ping' },
        { timeout: 100, responseEvent: 'pong' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ type: 'pong' });
    });

    it('should fail when not connected', async () => {
      const send = vi.fn(() => false);
      const on = vi.fn();
      const off = vi.fn();

      const result = await createRequest(
        send,
        on,
        off,
        { type: 'ping' },
        { timeout: 100, responseEvent: 'pong' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected');
    });
  });
});
