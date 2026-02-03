/**
 * File pipe for file system watching
 */

import chokidar, { FSWatcher } from 'chokidar';
import type { Pipe, PipeResponse, FilePipeConfig, FileEvent, FileEventType } from '../types.js';

export interface FilePipeOptions {
  name: string;
  config: FilePipeConfig;
}

export type FileEventHandler = (event: FileEvent) => void | Promise<void>;

export class FilePipe implements Pipe {
  public readonly name: string;
  public readonly type = 'file';
  private watcher: FSWatcher | null = null;
  private config: FilePipeConfig;
  private watching = false;
  private eventHandlers: Map<string, FileEventHandler[]> = new Map();

  constructor(options: FilePipeOptions) {
    this.name = options.name;
    this.config = options.config;
  }

  /**
   * Start watching files (alias for connect)
   */
  async watch(): Promise<void> {
    return this.connect();
  }

  /**
   * Start watching files
   */
  async connect(): Promise<void> {
    if (this.watching) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.watcher = chokidar.watch(this.config.paths, {
          ignored: this.config.ignore,
          persistent: this.config.persistent ?? true,
          usePolling: this.config.usePolling ?? false,
          ignoreInitial: true,
        });

        this.watcher.on('ready', () => {
          this.watching = true;
          resolve();
        });

        this.watcher.on('error', (error) => {
          if (!this.watching) {
            reject(error);
          }
          this.emit('error', {
            type: 'change',
            path: '',
          });
        });

        // File events
        this.watcher.on('add', (path, stats) => {
          const event: FileEvent = {
            type: 'add',
            path,
            stats: stats
              ? {
                  size: stats.size,
                  mtime: stats.mtime,
                  isDirectory: stats.isDirectory(),
                }
              : undefined,
          };
          this.emit('add', event);
          this.emit('all', event);
        });

        this.watcher.on('change', (path, stats) => {
          const event: FileEvent = {
            type: 'change',
            path,
            stats: stats
              ? {
                  size: stats.size,
                  mtime: stats.mtime,
                  isDirectory: stats.isDirectory(),
                }
              : undefined,
          };
          this.emit('change', event);
          this.emit('all', event);
        });

        this.watcher.on('unlink', (path) => {
          const event: FileEvent = {
            type: 'unlink',
            path,
          };
          this.emit('unlink', event);
          this.emit('all', event);
        });

        // Directory events
        this.watcher.on('addDir', (path, stats) => {
          const event: FileEvent = {
            type: 'addDir',
            path,
            stats: stats
              ? {
                  size: stats.size,
                  mtime: stats.mtime,
                  isDirectory: true,
                }
              : undefined,
          };
          this.emit('addDir', event);
          this.emit('all', event);
        });

        this.watcher.on('unlinkDir', (path) => {
          const event: FileEvent = {
            type: 'unlinkDir',
            path,
          };
          this.emit('unlinkDir', event);
          this.emit('all', event);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop watching files
   */
  async disconnect(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    await this.watcher.close();
    this.watcher = null;
    this.watching = false;
  }

  /**
   * Check if watching
   */
  isConnected(): boolean {
    return this.watching;
  }

  /**
   * Add paths to watch
   */
  add(paths: string | string[]): void {
    if (this.watcher) {
      this.watcher.add(paths);
    }
  }

  /**
   * Stop watching specific paths
   */
  unwatch(paths: string | string[]): void {
    if (this.watcher) {
      this.watcher.unwatch(paths);
    }
  }

  /**
   * Get watched paths
   */
  getWatched(): Record<string, string[]> {
    if (this.watcher) {
      return this.watcher.getWatched();
    }
    return {};
  }

  /**
   * Register an event handler
   */
  on(event: FileEventType | 'all' | 'error', handler: FileEventHandler): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * Remove an event handler
   */
  off(event: FileEventType | 'all' | 'error', handler: FileEventHandler): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event
   */
  private emit(event: string, data: FileEvent): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`File handler error for "${event}":`, error);
      }
    }
  }
}

/**
 * Create a file pipe
 */
export function createFilePipe(options: FilePipeOptions): FilePipe {
  return new FilePipe(options);
}
