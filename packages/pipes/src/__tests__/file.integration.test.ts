/**
 * File Pipe Integration Tests
 *
 * Tests actual FilePipe behavior with mocked chokidar
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Keep track of created watchers for testing
let mockWatchers: any[] = [];

// Mock chokidar module
vi.mock('chokidar', () => {
  class MockFSWatcher {
    private listeners: Map<string, Function[]> = new Map();
    private watchedPaths: string[] = [];
    private options: any;

    constructor(paths: string[], options: any) {
      this.watchedPaths = Array.isArray(paths) ? paths : [paths];
      this.options = options;
      mockWatchers.push(this);

      // Simulate async ready event
      setTimeout(() => {
        this.emit('ready');
      }, 10);
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

    add(paths: string | string[]) {
      const newPaths = Array.isArray(paths) ? paths : [paths];
      this.watchedPaths.push(...newPaths);
    }

    unwatch(paths: string | string[]) {
      const removePaths = Array.isArray(paths) ? paths : [paths];
      this.watchedPaths = this.watchedPaths.filter(p => !removePaths.includes(p));
    }

    getWatched() {
      const result: Record<string, string[]> = {};
      for (const path of this.watchedPaths) {
        const dir = path.substring(0, path.lastIndexOf('/')) || '.';
        const file = path.substring(path.lastIndexOf('/') + 1);
        if (!result[dir]) {
          result[dir] = [];
        }
        result[dir].push(file);
      }
      return result;
    }

    async close() {
      this.watchedPaths = [];
    }

    // Helper methods for testing
    getOptions() {
      return this.options;
    }

    getPaths() {
      return [...this.watchedPaths];
    }

    // Helper to simulate file added
    simulateAdd(path: string, stats?: any) {
      this.emit('add', path, stats);
    }

    // Helper to simulate file changed
    simulateChange(path: string, stats?: any) {
      this.emit('change', path, stats);
    }

    // Helper to simulate file deleted
    simulateUnlink(path: string) {
      this.emit('unlink', path);
    }

    // Helper to simulate directory added
    simulateAddDir(path: string, stats?: any) {
      this.emit('addDir', path, stats);
    }

    // Helper to simulate directory deleted
    simulateUnlinkDir(path: string) {
      this.emit('unlinkDir', path);
    }

    // Helper to simulate error
    simulateError(error: Error) {
      this.emit('error', error);
    }
  }

  return {
    default: {
      watch: (paths: string[], options: any) => {
        return new MockFSWatcher(paths, options);
      },
    },
    watch: (paths: string[], options: any) => {
      return new MockFSWatcher(paths, options);
    },
  };
});

// Import after mock setup
import { FilePipe, createFilePipe } from '../file/index.js';

describe('FilePipe Integration', () => {
  beforeEach(() => {
    mockWatchers = [];
  });

  afterEach(() => {
    mockWatchers = [];
  });

  describe('Watch Lifecycle', () => {
    it('should start watching files', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      expect(pipe.isConnected()).toBe(false);

      await pipe.watch();

      expect(pipe.isConnected()).toBe(true);
      expect(mockWatchers).toHaveLength(1);
    });

    it('should use connect as alias for watch', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      await pipe.connect();

      expect(pipe.isConnected()).toBe(true);
    });

    it('should stop watching files', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      await pipe.watch();
      expect(pipe.isConnected()).toBe(true);

      await pipe.disconnect();
      expect(pipe.isConnected()).toBe(false);
    });

    it('should handle multiple watch calls gracefully', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      await pipe.watch();
      await pipe.watch(); // Should not create another watcher

      expect(mockWatchers).toHaveLength(1);
    });

    it('should handle disconnect when not watching', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      // Should not throw
      await pipe.disconnect();
      expect(pipe.isConnected()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should watch multiple paths', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch1', '/tmp/watch2'],
        },
      });

      await pipe.watch();

      const watcher = mockWatchers[0];
      expect(watcher.getPaths()).toContain('/tmp/watch1');
      expect(watcher.getPaths()).toContain('/tmp/watch2');
    });

    it('should apply ignore patterns', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
          ignore: ['**/*.log', 'node_modules'],
        },
      });

      await pipe.watch();

      const watcher = mockWatchers[0];
      expect(watcher.getOptions().ignored).toEqual(['**/*.log', 'node_modules']);
    });

    it('should configure persistent mode', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
          persistent: false,
        },
      });

      await pipe.watch();

      const watcher = mockWatchers[0];
      expect(watcher.getOptions().persistent).toBe(false);
    });

    it('should configure polling mode', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
          usePolling: true,
        },
      });

      await pipe.watch();

      const watcher = mockWatchers[0];
      expect(watcher.getOptions().usePolling).toBe(true);
    });
  });

  describe('File Events', () => {
    it('should emit add event when file is added', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const addHandler = vi.fn();
      pipe.on('add', addHandler);

      await pipe.watch();

      const watcher = mockWatchers[0];
      const stats = {
        size: 1024,
        mtime: new Date(),
        isDirectory: () => false,
      };
      watcher.simulateAdd('/tmp/watch/newfile.txt', stats);

      expect(addHandler).toHaveBeenCalledWith({
        type: 'add',
        path: '/tmp/watch/newfile.txt',
        stats: {
          size: 1024,
          mtime: stats.mtime,
          isDirectory: false,
        },
      });
    });

    it('should emit change event when file is modified', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const changeHandler = vi.fn();
      pipe.on('change', changeHandler);

      await pipe.watch();

      const watcher = mockWatchers[0];
      const stats = {
        size: 2048,
        mtime: new Date(),
        isDirectory: () => false,
      };
      watcher.simulateChange('/tmp/watch/file.txt', stats);

      expect(changeHandler).toHaveBeenCalledWith({
        type: 'change',
        path: '/tmp/watch/file.txt',
        stats: {
          size: 2048,
          mtime: stats.mtime,
          isDirectory: false,
        },
      });
    });

    it('should emit unlink event when file is deleted', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const unlinkHandler = vi.fn();
      pipe.on('unlink', unlinkHandler);

      await pipe.watch();

      const watcher = mockWatchers[0];
      watcher.simulateUnlink('/tmp/watch/deleted.txt');

      expect(unlinkHandler).toHaveBeenCalledWith({
        type: 'unlink',
        path: '/tmp/watch/deleted.txt',
      });
    });
  });

  describe('Directory Events', () => {
    it('should emit addDir event when directory is added', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const addDirHandler = vi.fn();
      pipe.on('addDir', addDirHandler);

      await pipe.watch();

      const watcher = mockWatchers[0];
      const stats = {
        size: 0,
        mtime: new Date(),
        isDirectory: () => true,
      };
      watcher.simulateAddDir('/tmp/watch/newdir', stats);

      expect(addDirHandler).toHaveBeenCalledWith({
        type: 'addDir',
        path: '/tmp/watch/newdir',
        stats: {
          size: 0,
          mtime: stats.mtime,
          isDirectory: true,
        },
      });
    });

    it('should emit unlinkDir event when directory is deleted', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const unlinkDirHandler = vi.fn();
      pipe.on('unlinkDir', unlinkDirHandler);

      await pipe.watch();

      const watcher = mockWatchers[0];
      watcher.simulateUnlinkDir('/tmp/watch/deleteddir');

      expect(unlinkDirHandler).toHaveBeenCalledWith({
        type: 'unlinkDir',
        path: '/tmp/watch/deleteddir',
      });
    });
  });

  describe('All Events Handler', () => {
    it('should emit all event for file add', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const allHandler = vi.fn();
      pipe.on('all', allHandler);

      await pipe.watch();

      const watcher = mockWatchers[0];
      watcher.simulateAdd('/tmp/watch/file.txt');

      expect(allHandler).toHaveBeenCalledWith({
        type: 'add',
        path: '/tmp/watch/file.txt',
        stats: undefined,
      });
    });

    it('should emit all event for file change', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const allHandler = vi.fn();
      pipe.on('all', allHandler);

      await pipe.watch();

      const watcher = mockWatchers[0];
      watcher.simulateChange('/tmp/watch/file.txt');

      expect(allHandler).toHaveBeenCalledWith({
        type: 'change',
        path: '/tmp/watch/file.txt',
        stats: undefined,
      });
    });

    it('should emit all event for file unlink', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const allHandler = vi.fn();
      pipe.on('all', allHandler);

      await pipe.watch();

      const watcher = mockWatchers[0];
      watcher.simulateUnlink('/tmp/watch/file.txt');

      expect(allHandler).toHaveBeenCalledWith({
        type: 'unlink',
        path: '/tmp/watch/file.txt',
      });
    });

    it('should receive all events in order', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const events: string[] = [];
      pipe.on('all', (event) => {
        events.push(event.type);
      });

      await pipe.watch();

      const watcher = mockWatchers[0];
      watcher.simulateAdd('/tmp/watch/file1.txt');
      watcher.simulateChange('/tmp/watch/file2.txt');
      watcher.simulateUnlink('/tmp/watch/file3.txt');

      expect(events).toEqual(['add', 'change', 'unlink']);
    });
  });

  describe('Dynamic Path Management', () => {
    it('should add new paths to watch', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch1'],
        },
      });

      await pipe.watch();

      pipe.add('/tmp/watch2');

      const watcher = mockWatchers[0];
      expect(watcher.getPaths()).toContain('/tmp/watch2');
    });

    it('should add multiple paths', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch1'],
        },
      });

      await pipe.watch();

      pipe.add(['/tmp/watch2', '/tmp/watch3']);

      const watcher = mockWatchers[0];
      expect(watcher.getPaths()).toContain('/tmp/watch2');
      expect(watcher.getPaths()).toContain('/tmp/watch3');
    });

    it('should unwatch paths', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch1', '/tmp/watch2'],
        },
      });

      await pipe.watch();

      pipe.unwatch('/tmp/watch2');

      const watcher = mockWatchers[0];
      expect(watcher.getPaths()).not.toContain('/tmp/watch2');
    });

    it('should get watched paths', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch/file.txt'],
        },
      });

      await pipe.watch();

      const watched = pipe.getWatched();
      expect(watched).toBeDefined();
    });

    it('should return empty object when not watching', () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const watched = pipe.getWatched();
      expect(watched).toEqual({});
    });
  });

  describe('Handler Management', () => {
    it('should allow removing event handlers', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const handler = vi.fn();
      pipe.on('add', handler);
      pipe.off('add', handler);

      await pipe.watch();

      const watcher = mockWatchers[0];
      watcher.simulateAdd('/tmp/watch/file.txt');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers for same event', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      pipe.on('add', handler1);
      pipe.on('add', handler2);

      await pipe.watch();

      const watcher = mockWatchers[0];
      watcher.simulateAdd('/tmp/watch/file.txt');

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should emit error event', async () => {
      const pipe = createFilePipe({
        name: 'test-file',
        config: {
          type: 'file',
          paths: ['/tmp/watch'],
        },
      });

      const errorHandler = vi.fn();
      pipe.on('error', errorHandler);

      await pipe.watch();

      const watcher = mockWatchers[0];
      watcher.simulateError(new Error('Permission denied'));

      expect(errorHandler).toHaveBeenCalled();
    });
  });
});
