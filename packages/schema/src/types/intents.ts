/**
 * Intents and Gateway types
 */

import type { Duration } from './common.js';

/** Discord gateway intents */
export type Intent =
  | 'guilds'
  | 'guild_members'
  | 'guild_moderation'
  | 'guild_emojis_and_stickers'
  | 'guild_integrations'
  | 'guild_webhooks'
  | 'guild_invites'
  | 'guild_voice_states'
  | 'guild_presences'
  | 'guild_messages'
  | 'guild_message_reactions'
  | 'guild_message_typing'
  | 'direct_messages'
  | 'direct_message_reactions'
  | 'direct_message_typing'
  | 'message_content'
  | 'guild_scheduled_events'
  | 'auto_moderation_configuration'
  | 'auto_moderation_execution';

/** Privileged intents that require Discord approval */
export const PRIVILEGED_INTENTS: Intent[] = [
  'guild_members',
  'guild_presences',
  'message_content',
];

/** Intents configuration */
export interface IntentsConfig {
  auto?: boolean;
  explicit?: Intent[];
}

/** Reconnection backoff strategy */
export type BackoffStrategy = 'exponential' | 'linear' | 'fixed';

/** Reconnection configuration */
export interface ReconnectConfig {
  max_retries?: number;
  backoff?: BackoffStrategy;
  base_delay?: Duration;
  max_delay?: Duration;
}

/** Sharding configuration */
export interface ShardingConfig {
  enabled?: boolean;
  shard_count?: number | 'auto';
}

/** Compression type */
export type CompressionType = 'zlib-stream' | 'none';

/** Gateway configuration */
export interface GatewayConfig {
  sharding?: ShardingConfig;
  compression?: CompressionType;
  large_threshold?: number;
  reconnect?: ReconnectConfig;
}
