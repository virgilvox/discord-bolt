/**
 * MQTT Pipe Integration Tests
 *
 * Tests actual MqttPipe behavior with mocked mqtt client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Keep track of created clients for testing
let mockClients: any[] = [];
let mockConnectCallback: ((url: string, options: any) => any) | null = null;

// Mock mqtt module
vi.mock('mqtt', () => {
  class MockMqttClient {
    private listeners: Map<string, Function[]> = new Map();
    connected = false;
    url: string;
    options: any;

    constructor(url: string, options: any) {
      this.url = url;
      this.options = options;
      mockClients.push(this);

      // Simulate async connection
      setTimeout(() => {
        this.connected = true;
        this.emit('connect');
      }, 10);
    }

    on(event: string, callback: Function) {
      const handlers = this.listeners.get(event) || [];
      handlers.push(callback);
      this.listeners.set(event, handlers);
    }

    emit(event: string, ...args: any[]) {
      const handlers = this.listeners.get(event) || [];
      handlers.forEach(h => h(...args));
    }

    subscribe(topic: string, options: any, callback: Function) {
      setTimeout(() => {
        callback(null, [{ topic, qos: options.qos ?? 0 }]);
      }, 5);
    }

    unsubscribe(topic: string, _options: any, callback: Function) {
      setTimeout(() => {
        callback(null);
      }, 5);
    }

    publish(topic: string, payload: any, options: any, callback: Function) {
      setTimeout(() => {
        callback(null);
      }, 5);
    }

    end(force: boolean, options: any, callback: Function) {
      this.connected = false;
      callback();
    }

    // Helper to simulate receiving a message
    receiveMessage(topic: string, payload: Buffer | string) {
      const buffer = typeof payload === 'string' ? Buffer.from(payload) : payload;
      this.emit('message', topic, buffer, { topic, qos: 0 });
    }

    // Helper to simulate disconnect
    simulateDisconnect() {
      this.connected = false;
      this.emit('close');
    }

    // Helper to simulate error
    simulateError(error: Error) {
      this.emit('error', error);
    }

    // Helper to simulate reconnection
    simulateReconnect() {
      this.emit('reconnect');
    }
  }

  return {
    default: {
      connect: (url: string, options: any) => {
        if (mockConnectCallback) {
          return mockConnectCallback(url, options);
        }
        return new MockMqttClient(url, options);
      },
    },
    connect: (url: string, options: any) => {
      if (mockConnectCallback) {
        return mockConnectCallback(url, options);
      }
      return new MockMqttClient(url, options);
    },
  };
});

// Import after mock setup
import { MqttPipe, createMqttPipe } from '../mqtt/index.js';

describe('MqttPipe Integration', () => {
  beforeEach(() => {
    mockClients = [];
    mockConnectCallback = null;
  });

  afterEach(() => {
    mockClients = [];
    mockConnectCallback = null;
  });

  describe('Connection', () => {
    it('should connect to MQTT broker', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      expect(pipe.isConnected()).toBe(false);

      await pipe.connect();

      expect(pipe.isConnected()).toBe(true);
      expect(mockClients).toHaveLength(1);
      expect(mockClients[0].url).toContain('localhost');
    });

    it('should connect with authentication', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
          auth: {
            username: 'user',
            password: 'pass',
            clientId: 'test-client',
          },
        },
      });

      await pipe.connect();

      expect(mockClients[0].options.username).toBe('user');
      expect(mockClients[0].options.password).toBe('pass');
      expect(mockClients[0].options.clientId).toBe('test-client');
    });

    it('should connect with SSL protocol', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
          protocol: 'mqtts',
          port: 8883,
        },
      });

      await pipe.connect();

      expect(mockClients[0].url).toBe('mqtts://localhost:8883');
    });

    it('should connect with last will and testament', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
          will: {
            topic: 'client/status',
            payload: 'offline',
            qos: 1,
            retain: true,
          },
        },
      });

      await pipe.connect();

      expect(mockClients[0].options.will).toEqual({
        topic: 'client/status',
        payload: expect.any(Buffer),
        qos: 1,
        retain: true,
      });
    });

    it('should disconnect from broker', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      await pipe.connect();
      expect(pipe.isConnected()).toBe(true);

      await pipe.disconnect();
      expect(pipe.isConnected()).toBe(false);
    });

    it('should handle connection errors', async () => {
      mockConnectCallback = (url, options) => {
        const client = {
          connected: false,
          listeners: new Map<string, Function[]>(),
          on(event: string, cb: Function) {
            const handlers = this.listeners.get(event) || [];
            handlers.push(cb);
            this.listeners.set(event, handlers);
          },
          emit(event: string, ...args: any[]) {
            const handlers = this.listeners.get(event) || [];
            handlers.forEach(h => h(...args));
          },
        };

        mockClients.push(client);

        // Emit error before connection
        setTimeout(() => {
          client.emit('error', new Error('Connection refused'));
        }, 5);

        return client;
      };

      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      await expect(pipe.connect()).rejects.toThrow('Connection refused');
    });
  });

  describe('Subscription', () => {
    it('should subscribe to a topic', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      await pipe.connect();

      const result = await pipe.subscribe('sensors/temperature');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ topic: 'sensors/temperature', qos: 0 }]);
    });

    it('should subscribe with QoS level', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      await pipe.connect();

      const result = await pipe.subscribe('sensors/+', { qos: 2 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ topic: 'sensors/+', qos: 2 }]);
    });

    it('should unsubscribe from a topic', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      await pipe.connect();
      await pipe.subscribe('sensors/temperature');

      const result = await pipe.unsubscribe('sensors/temperature');

      expect(result.success).toBe(true);
    });

    it('should fail subscription when not connected', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      const result = await pipe.subscribe('sensors/temperature');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected');
    });
  });

  describe('Publishing', () => {
    it('should publish string messages', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      await pipe.connect();

      const result = await pipe.publish('sensors/temperature', 'hello');

      expect(result.success).toBe(true);
    });

    it('should publish JSON messages', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      await pipe.connect();

      const result = await pipe.publish('sensors/temperature', {
        value: 25.5,
        unit: 'celsius',
      });

      expect(result.success).toBe(true);
    });

    it('should publish Buffer messages', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      await pipe.connect();

      const result = await pipe.publish(
        'sensors/data',
        Buffer.from([0x01, 0x02, 0x03])
      );

      expect(result.success).toBe(true);
    });

    it('should publish with retain flag', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      await pipe.connect();

      const result = await pipe.publish('config/setting', 'value', {
        retain: true,
      });

      expect(result.success).toBe(true);
    });

    it('should publish with QoS level', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      await pipe.connect();

      const result = await pipe.publish('critical/alert', 'alarm', { qos: 2 });

      expect(result.success).toBe(true);
    });

    it('should fail publishing when not connected', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      const result = await pipe.publish('sensors/temperature', 'hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected');
    });
  });

  describe('Message Handling', () => {
    it('should receive and parse JSON messages', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      const messageHandler = vi.fn();
      pipe.on('sensors/temperature', messageHandler);

      await pipe.connect();

      // Simulate receiving a message
      const client = mockClients[0];
      client.receiveMessage('sensors/temperature', JSON.stringify({ value: 25.5 }));

      expect(messageHandler).toHaveBeenCalledWith(
        'sensors/temperature',
        { value: 25.5 },
        expect.any(Object)
      );
    });

    it('should receive plain text messages', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      const messageHandler = vi.fn();
      pipe.on('status', messageHandler);

      await pipe.connect();

      const client = mockClients[0];
      client.receiveMessage('status', 'online');

      expect(messageHandler).toHaveBeenCalledWith('status', 'online', expect.any(Object));
    });

    it('should allow removing handlers', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      const handler = vi.fn();
      pipe.on('sensors/temperature', handler);
      pipe.off('sensors/temperature', handler);

      await pipe.connect();

      const client = mockClients[0];
      client.receiveMessage('sensors/temperature', 'hello');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Wildcard Handlers', () => {
    it('should match single-level wildcard (+)', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      const wildcardHandler = vi.fn();
      pipe.on('sensors/+/temperature', wildcardHandler);

      await pipe.connect();

      const client = mockClients[0];
      // Use non-JSON string to avoid JSON parsing
      client.receiveMessage('sensors/room1/temperature', 'temp_25');

      expect(wildcardHandler).toHaveBeenCalledWith(
        'sensors/room1/temperature',
        'temp_25',
        expect.any(Object)
      );
    });

    it('should match multi-level wildcard (#)', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      const wildcardHandler = vi.fn();
      pipe.on('home/#', wildcardHandler);

      await pipe.connect();

      const client = mockClients[0];
      // Use non-JSON string to avoid JSON parsing
      client.receiveMessage('home/floor1/room1/sensor', 'value_42');

      expect(wildcardHandler).toHaveBeenCalledWith(
        'home/floor1/room1/sensor',
        'value_42',
        expect.any(Object)
      );
    });

    it('should not match non-matching topics', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      const wildcardHandler = vi.fn();
      pipe.on('sensors/+/temperature', wildcardHandler);

      await pipe.connect();

      const client = mockClients[0];
      client.receiveMessage('sensors/room1/humidity', '50');

      expect(wildcardHandler).not.toHaveBeenCalled();
    });
  });

  describe('Reconnection', () => {
    it('should emit reconnecting event', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
          reconnect: {
            enabled: true,
            delay: '100ms',
          },
        },
      });

      const reconnectHandler = vi.fn();
      pipe.on('reconnecting', reconnectHandler);

      await pipe.connect();

      const client = mockClients[0];
      client.simulateReconnect();

      expect(reconnectHandler).toHaveBeenCalled();
    });

    it('should emit disconnected event on close', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      const disconnectHandler = vi.fn();
      pipe.on('disconnected', disconnectHandler);

      await pipe.connect();

      const client = mockClients[0];
      client.simulateDisconnect();

      expect(disconnectHandler).toHaveBeenCalled();
      expect(pipe.isConnected()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should emit error events', async () => {
      const pipe = createMqttPipe({
        name: 'test-mqtt',
        config: {
          type: 'mqtt',
          broker: 'localhost',
        },
      });

      const errorHandler = vi.fn();
      pipe.on('error', errorHandler);

      await pipe.connect();

      const client = mockClients[0];
      client.simulateError(new Error('Network error'));

      expect(errorHandler).toHaveBeenCalled();
    });
  });
});
