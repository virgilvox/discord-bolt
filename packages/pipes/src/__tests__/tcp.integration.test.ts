/**
 * TCP Pipe Integration Tests
 *
 * Tests actual TcpPipe behavior with mocked net module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Keep track of created sockets and servers for testing
let mockSockets: any[] = [];
let mockServers: any[] = [];

// Mock net module
vi.mock('net', () => {
  class MockSocket {
    private listeners: Map<string, Function[]> = new Map();
    private encoding: BufferEncoding = 'utf8';
    writable = true;
    destroyed = false;

    constructor() {
      mockSockets.push(this);
    }

    on(event: string, callback: Function) {
      const handlers = this.listeners.get(event) || [];
      handlers.push(callback);
      this.listeners.set(event, handlers);
      return this;
    }

    emit(event: string, ...args: any[]) {
      const handlers = this.listeners.get(event) || [];
      handlers.forEach(h => h(...args));
    }

    setEncoding(encoding: BufferEncoding) {
      this.encoding = encoding;
      return this;
    }

    write(data: Buffer | string, callback?: Function) {
      if (callback) {
        setTimeout(() => callback(null), 5);
      }
      return true;
    }

    end(callback?: Function) {
      if (callback) {
        callback();
      }
    }

    destroy() {
      this.destroyed = true;
    }

    // Helper to simulate receiving data
    receiveData(data: string | Buffer) {
      this.emit('data', data);
    }

    // Helper to simulate connection
    simulateConnect() {
      this.emit('connect');
    }

    // Helper to simulate close
    simulateClose() {
      this.emit('close');
    }

    // Helper to simulate error
    simulateError(error: Error) {
      this.emit('error', error);
    }
  }

  class MockServer {
    private listeners: Map<string, Function[]> = new Map();
    listening = false;

    constructor() {
      mockServers.push(this);
    }

    on(event: string, callback: Function) {
      const handlers = this.listeners.get(event) || [];
      handlers.push(callback);
      this.listeners.set(event, handlers);
      return this;
    }

    emit(event: string, ...args: any[]) {
      const handlers = this.listeners.get(event) || [];
      handlers.forEach(h => h(...args));
    }

    listen(port: number, callback?: Function) {
      this.listening = true;
      if (callback) {
        setTimeout(() => callback(), 5);
      }
      return this;
    }

    close(callback?: Function) {
      this.listening = false;
      if (callback) {
        callback();
      }
    }

    // Helper to simulate client connection
    simulateConnection(socket: any) {
      this.emit('connection', socket);
    }
  }

  return {
    Socket: MockSocket,
    createConnection: (options: any) => {
      const socket = new MockSocket();
      // Simulate async connection
      setTimeout(() => {
        socket.simulateConnect();
      }, 10);
      return socket;
    },
    createServer: (connectionListener: (socket: any) => void) => {
      const server = new MockServer();
      server.on('connection', connectionListener);
      return server;
    },
  };
});

// Import after mock setup
import { TcpPipe, createTcpPipe } from '../tcp/index.js';

describe('TcpPipe Integration', () => {
  beforeEach(() => {
    mockSockets = [];
    mockServers = [];
  });

  afterEach(() => {
    mockSockets = [];
    mockServers = [];
  });

  describe('Client Mode', () => {
    it('should connect to TCP server', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      expect(pipe.isConnected()).toBe(false);

      await pipe.connect();

      expect(pipe.isConnected()).toBe(true);
      expect(mockSockets).toHaveLength(1);
    });

    it('should connect with custom encoding', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
          encoding: 'hex',
        },
      });

      await pipe.connect();

      expect(pipe.isConnected()).toBe(true);
    });

    it('should disconnect from server', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      await pipe.connect();
      expect(pipe.isConnected()).toBe(true);

      await pipe.disconnect();
      expect(pipe.isConnected()).toBe(false);
    });

    it('should handle connection errors', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      const connectPromise = pipe.connect();

      // Wait for the socket to be created
      await new Promise(resolve => setTimeout(resolve, 5));

      // Trigger error before connection
      const socket = mockSockets[0];
      socket.simulateError(new Error('Connection refused'));

      await expect(connectPromise).rejects.toThrow('Connection refused');
    });
  });

  describe('Server Mode', () => {
    it('should listen on a port', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      await pipe.listen();

      expect(pipe.isConnected()).toBe(true);
      expect(mockServers).toHaveLength(1);
      expect(mockServers[0].listening).toBe(true);
    });

    it('should accept client connections', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      const connectionHandler = vi.fn();
      pipe.on('connection', connectionHandler);

      await pipe.listen();

      // Simulate client connection
      const server = mockServers[0];
      const clientSocket = { setEncoding: vi.fn(), on: vi.fn() };
      server.simulateConnection(clientSocket);

      expect(connectionHandler).toHaveBeenCalledWith(clientSocket);
    });

    it('should close server', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      await pipe.listen();
      expect(pipe.isConnected()).toBe(true);

      await pipe.disconnect();
      expect(pipe.isConnected()).toBe(false);
    });
  });

  describe('Sending Data', () => {
    it('should send string data', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      await pipe.connect();

      const result = await pipe.send('hello');

      expect(result.success).toBe(true);
    });

    it('should send Buffer data', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      await pipe.connect();

      const result = await pipe.send(Buffer.from([0x01, 0x02, 0x03]));

      expect(result.success).toBe(true);
    });

    it('should fail sending when not connected', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      const result = await pipe.send('hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected');
    });
  });

  describe('Request-Response Pattern', () => {
    it('should resolve request when response received', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      await pipe.connect();

      const requestPromise = pipe.request('get_data', { timeout: 1000 });

      // Simulate response
      setTimeout(() => {
        const socket = mockSockets[0];
        socket.receiveData('response_data');
      }, 50);

      const result = await requestPromise;

      expect(result.success).toBe(true);
      expect(result.data).toBe('response_data');
    });

    it('should timeout if no response received', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      await pipe.connect();

      const result = await pipe.request('get_data', { timeout: 50 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should fail request when not connected', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      const result = await pipe.request('test', { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected');
    });
  });

  describe('Data Handlers', () => {
    it('should call registered data handlers', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      const dataHandler = vi.fn();
      pipe.onData(dataHandler);

      await pipe.connect();

      const socket = mockSockets[0];
      socket.receiveData('test data');

      expect(dataHandler).toHaveBeenCalledWith('test data');
    });

    it('should allow removing data handlers', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      const dataHandler = vi.fn();
      pipe.onData(dataHandler);
      pipe.offData(dataHandler);

      await pipe.connect();

      const socket = mockSockets[0];
      socket.receiveData('test data');

      expect(dataHandler).not.toHaveBeenCalled();
    });

    it('should emit data event', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      const eventHandler = vi.fn();
      pipe.on('data', eventHandler);

      await pipe.connect();

      const socket = mockSockets[0];
      socket.receiveData('test data');

      expect(eventHandler).toHaveBeenCalledWith('test data');
    });
  });

  describe('Reconnection', () => {
    it('should attempt reconnection when enabled', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
          reconnect: {
            enabled: true,
            delay: '50ms',
            max_attempts: 3,
          },
        },
      });

      await pipe.connect();
      expect(mockSockets).toHaveLength(1);

      // Simulate disconnect
      const socket = mockSockets[0];
      socket.simulateClose();

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have created a new socket
      expect(mockSockets.length).toBeGreaterThan(1);
    });

    it('should not reconnect when disabled', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
          reconnect: {
            enabled: false,
          },
        },
      });

      await pipe.connect();
      const socket = mockSockets[0];
      socket.simulateClose();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still only have one socket
      expect(mockSockets).toHaveLength(1);
    });

    it('should emit disconnected event on close', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      const disconnectHandler = vi.fn();
      pipe.on('disconnected', disconnectHandler);

      await pipe.connect();

      const socket = mockSockets[0];
      socket.simulateClose();

      expect(disconnectHandler).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should emit error events', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      const errorHandler = vi.fn();
      pipe.on('error', errorHandler);

      await pipe.connect();

      const socket = mockSockets[0];
      socket.simulateError(new Error('Network error'));

      expect(errorHandler).toHaveBeenCalled();
    });

    it('should allow removing event handlers', async () => {
      const pipe = createTcpPipe({
        name: 'test-tcp',
        config: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
        },
      });

      const handler = vi.fn();
      pipe.on('error', handler);
      pipe.off('error', handler);

      await pipe.connect();

      const socket = mockSockets[0];
      socket.simulateError(new Error('Network error'));

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
