/**
 * WebSocket Pipe Integration Tests
 *
 * Tests actual WebSocketPipe behavior with mocked WebSocket
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Keep track of created instances for testing
let mockWebSocketInstances: any[] = [];

// Mock must be defined before import
vi.mock('ws', () => {
  const CONNECTING = 0;
  const OPEN = 1;
  const CLOSING = 2;
  const CLOSED = 3;

  class MockWS {
    static CONNECTING = CONNECTING;
    static OPEN = OPEN;
    static CLOSING = CLOSING;
    static CLOSED = CLOSED;

    url: string;
    readyState: number = CONNECTING;
    private listeners: Map<string, Function[]> = new Map();

    constructor(url: string, _options?: any) {
      this.url = url;
      mockWebSocketInstances.push(this);

      // Simulate async connection
      setTimeout(() => {
        this.readyState = OPEN;
        this.emit('open');
      }, 10);
    }

    on(event: string, callback: Function) {
      const handlers = this.listeners.get(event) || [];
      handlers.push(callback);
      this.listeners.set(event, handlers);
    }

    send(data: string) {
      if (this.readyState !== OPEN) {
        throw new Error('WebSocket is not open');
      }
    }

    close() {
      this.readyState = CLOSED;
      this.emit('close');
    }

    // Helper to emit events
    emit(event: string, data?: any) {
      const handlers = this.listeners.get(event) || [];
      handlers.forEach(h => h(data));
    }

    // Helper to simulate receiving a message
    receiveMessage(data: any) {
      const messageData = typeof data === 'string' ? data : JSON.stringify(data);
      this.emit('message', Buffer.from(messageData));
    }

    // Helper to simulate disconnection
    disconnect() {
      this.readyState = CLOSED;
      this.emit('close');
    }
  }

  return { default: MockWS };
});

// Import after mock setup
import { WebSocketPipe, createWebSocketPipe } from '../websocket/index.js';

describe('WebSocketPipe Integration', () => {
  beforeEach(() => {
    mockWebSocketInstances = [];
  });

  afterEach(() => {
    mockWebSocketInstances = [];
  });

  describe('Connection', () => {
    it('should connect to WebSocket server', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      expect(pipe.isConnected()).toBe(false);

      await pipe.connect();

      expect(pipe.isConnected()).toBe(true);
      expect(mockWebSocketInstances).toHaveLength(1);
      expect(mockWebSocketInstances[0].url).toBe('wss://example.com/ws');
    });

    it('should disconnect from server', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();
      expect(pipe.isConnected()).toBe(true);

      await pipe.disconnect();
      expect(pipe.isConnected()).toBe(false);
    });

    it('should handle connection errors', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      // Create a promise that will reject on error
      const connectPromise = pipe.connect();

      // Wait for the mock to be created
      await new Promise(resolve => setTimeout(resolve, 5));

      // Trigger an error before connection completes
      const ws = mockWebSocketInstances[0];
      ws.readyState = 3; // CLOSED
      ws.emit('error', new Error('Connection refused'));

      await expect(connectPromise).rejects.toThrow('Connection refused');
    });
  });

  describe('Sending Messages', () => {
    it('should send string messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();
      const result = pipe.send('hello');

      expect(result).toBe(true);
    });

    it('should send JSON messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();
      const result = pipe.send({ type: 'ping', data: { timestamp: 123 } });

      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      // Don't connect
      const result = pipe.send('hello');
      expect(result).toBe(false);
    });
  });

  describe('Receiving Messages', () => {
    it('should receive and parse JSON messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      const messageHandler = vi.fn();
      pipe.on('message', messageHandler);

      await pipe.connect();

      // Simulate receiving a message
      const ws = mockWebSocketInstances[0];
      ws.receiveMessage({ type: 'update', value: 42 });

      expect(messageHandler).toHaveBeenCalledWith({ type: 'update', value: 42 });
    });

    it('should receive plain text messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      const messageHandler = vi.fn();
      pipe.on('message', messageHandler);

      await pipe.connect();

      const ws = mockWebSocketInstances[0];
      ws.receiveMessage('plain text');

      expect(messageHandler).toHaveBeenCalledWith('plain text');
    });

    it('should emit typed events for messages with event field', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      const messageHandler = vi.fn();
      const userJoinHandler = vi.fn();
      pipe.on('message', messageHandler);
      pipe.on('user_join', userJoinHandler);

      await pipe.connect();

      const ws = mockWebSocketInstances[0];
      ws.receiveMessage({ event: 'user_join', user: 'Alice' });

      expect(messageHandler).toHaveBeenCalled();
      expect(userJoinHandler).toHaveBeenCalledWith({ event: 'user_join', user: 'Alice' });
    });

    it('should allow removing event handlers', async () => {
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

      await pipe.connect();

      const ws = mockWebSocketInstances[0];
      ws.receiveMessage({ data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Request/Response Pattern', () => {
    it('should resolve request when response received', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const requestPromise = pipe.request(
        { type: 'get_data', id: 1 },
        { timeout: 1000, responseEvent: 'data_response' }
      );

      // Simulate response
      setTimeout(() => {
        const ws = mockWebSocketInstances[0];
        ws.receiveMessage({ event: 'data_response', data: { id: 1, value: 'test' } });
      }, 50);

      const result = await requestPromise;

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ event: 'data_response', data: { id: 1, value: 'test' } });
    });

    it('should timeout if no response received', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const result = await pipe.request(
        { type: 'get_data' },
        { timeout: 50, responseEvent: 'data_response' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should fail request when not connected', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      // Don't connect
      const result = await pipe.request({ type: 'test' }, { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not connected');
    });
  });

  describe('Reconnection', () => {
    it('should attempt reconnection when enabled', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
          reconnect: {
            enabled: true,
            delay: '50ms',
            max_attempts: 3,
          },
        },
      });

      await pipe.connect();
      expect(mockWebSocketInstances).toHaveLength(1);

      // Simulate disconnect
      const ws = mockWebSocketInstances[0];
      ws.disconnect();

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have created a new WebSocket
      expect(mockWebSocketInstances.length).toBeGreaterThan(1);
    });

    it('should not reconnect when disabled', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
          reconnect: {
            enabled: false,
          },
        },
      });

      await pipe.connect();
      const ws = mockWebSocketInstances[0];
      ws.disconnect();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still only have one instance
      expect(mockWebSocketInstances).toHaveLength(1);
    });
  });

  describe('Heartbeat', () => {
    it('should accept heartbeat configuration', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
          heartbeat: {
            interval: '30s',
            message: 'ping',
          },
        },
      });

      await pipe.connect();

      // Verify connection works with heartbeat config
      expect(pipe.isConnected()).toBe(true);

      await pipe.disconnect();
    });

    it('should stop heartbeat on disconnect', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
          heartbeat: {
            interval: '30s',
            message: 'ping',
          },
        },
      });

      await pipe.connect();
      await pipe.disconnect();

      // Verify disconnect worked
      expect(pipe.isConnected()).toBe(false);
    });
  });
});
