/**
 * Gateway connection management
 */

import type { Client, ClientEvents } from 'discord.js';
import type { GatewayConfig } from '@furlow/schema';

export interface GatewayManagerOptions {
  config?: GatewayConfig;
  onReconnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export class GatewayManager {
  private client: Client;
  private config: GatewayConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private baseDelay: number;
  private maxDelay: number;
  private backoffStrategy: 'exponential' | 'linear' | 'fixed';

  constructor(client: Client, options: GatewayManagerOptions = {}) {
    this.client = client;
    this.config = options.config ?? {};

    const reconnect = this.config.reconnect ?? {};
    this.maxReconnectAttempts = reconnect.max_retries ?? 10;
    this.baseDelay = this.parseDuration(reconnect.base_delay ?? '1s');
    this.maxDelay = this.parseDuration(reconnect.max_delay ?? '60s');
    this.backoffStrategy = reconnect.backoff ?? 'exponential';

    this.setupListeners(options);
  }

  private setupListeners(options: GatewayManagerOptions): void {
    this.client.on('shardReady', (shardId) => {
      console.log(`Shard ${shardId} ready`);
      this.reconnectAttempts = 0;
    });

    this.client.on('shardDisconnect', (event, shardId) => {
      console.log(`Shard ${shardId} disconnected: ${event.code}`);
      options.onDisconnect?.();
    });

    this.client.on('shardReconnecting', (shardId) => {
      console.log(`Shard ${shardId} reconnecting...`);
      this.reconnectAttempts++;
      options.onReconnect?.();
    });

    this.client.on('shardError', (error, shardId) => {
      console.error(`Shard ${shardId} error:`, error);
      options.onError?.(error);
    });

    this.client.on('shardResume', (shardId, replayedEvents) => {
      console.log(`Shard ${shardId} resumed, replayed ${replayedEvents} events`);
      this.reconnectAttempts = 0;
    });
  }

  /**
   * Get the delay for the next reconnection attempt
   */
  getReconnectDelay(): number {
    switch (this.backoffStrategy) {
      case 'exponential':
        return Math.min(
          this.baseDelay * Math.pow(2, this.reconnectAttempts),
          this.maxDelay
        );
      case 'linear':
        return Math.min(
          this.baseDelay * (this.reconnectAttempts + 1),
          this.maxDelay
        );
      case 'fixed':
      default:
        return this.baseDelay;
    }
  }

  /**
   * Check if we should attempt reconnection
   */
  shouldReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  /**
   * Get current reconnect attempt count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Reset reconnect counter
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * Get gateway latency (ping)
   */
  getPing(): number {
    return this.client.ws.ping;
  }

  /**
   * Get shard info
   */
  getShardInfo(): Array<{ id: number; status: string; ping: number }> {
    return [...this.client.ws.shards.values()].map((shard) => ({
      id: shard.id,
      status: shard.status.toString(),
      ping: shard.ping,
    }));
  }

  /**
   * Parse duration string to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
    if (!match) return 1000;

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
  }
}

/**
 * Create a gateway manager
 */
export function createGatewayManager(
  client: Client,
  options?: GatewayManagerOptions
): GatewayManager {
  return new GatewayManager(client, options);
}
