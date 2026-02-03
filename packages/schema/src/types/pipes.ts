/**
 * Pipe types for external integrations
 */

import type { Expression, Duration, SimpleCondition } from './common.js';
import type { Action } from './actions.js';

/** HTTP authentication type */
export type HttpAuthType = 'none' | 'header' | 'bearer' | 'basic';

/** HTTP authentication config */
export interface HttpAuthConfig {
  type: HttpAuthType;
  token?: Expression;
  username?: Expression;
  password?: Expression;
  header_name?: string;
}

/** HTTP rate limit config */
export interface HttpRateLimitConfig {
  requests: number;
  per: Duration;
  retry_after?: boolean;
}

/** HTTP pipe configuration */
export interface HttpPipeConfig {
  type: 'http';
  base_url: Expression;
  auth?: HttpAuthConfig;
  headers?: Record<string, Expression>;
  rate_limit?: HttpRateLimitConfig;
  timeout?: Duration;
  retry?: {
    attempts?: number;
    delay?: Duration;
  };
}

/** WebSocket pipe configuration */
export interface WebSocketPipeConfig {
  type: 'websocket';
  url: Expression;
  headers?: Record<string, Expression>;
  reconnect?: {
    enabled?: boolean;
    delay?: Duration;
    max_attempts?: number;
  };
  heartbeat?: {
    interval?: Duration;
    message?: Expression;
  };
  handlers?: {
    event: string;
    when?: SimpleCondition;
    actions: Action[];
  }[];
}

/** MQTT QoS level */
export type MqttQos = 0 | 1 | 2;

/** MQTT pipe configuration */
export interface MqttPipeConfig {
  type: 'mqtt';
  broker: Expression;
  client_id?: Expression;
  username?: Expression;
  password?: Expression;
  topics?: {
    topic: string;
    qos?: MqttQos;
    actions?: Action[];
  }[];
}

/** TCP/UDP pipe configuration */
export interface TcpPipeConfig {
  type: 'tcp' | 'udp';
  host: Expression;
  port: number;
  encoding?: 'utf8' | 'binary' | 'hex' | 'base64';
  delimiter?: string;
  reconnect?: {
    enabled?: boolean;
    delay?: Duration;
  };
  handlers?: {
    event: 'data' | 'connect' | 'disconnect' | 'error';
    actions: Action[];
  }[];
}

/** Webhook verification */
export interface WebhookVerification {
  type: 'hmac' | 'signature' | 'token';
  secret?: Expression;
  header?: string;
  algorithm?: 'sha1' | 'sha256' | 'sha512';
}

/** Webhook pipe configuration */
export interface WebhookPipeConfig {
  type: 'webhook';
  path: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  verification?: WebhookVerification;
  handlers?: {
    event?: string;
    when?: SimpleCondition;
    actions: Action[];
  }[];
}

/** Database pipe configuration */
export interface DatabasePipeConfig {
  type: 'database';
  driver: 'postgres' | 'mysql' | 'mongodb';
  url: Expression;
  queries?: Record<string, {
    sql?: string;
    collection?: string;
    operation?: 'find' | 'insert' | 'update' | 'delete';
    parameters?: string[];
  }>;
}

/** File watcher pipe configuration */
export interface FilePipeConfig {
  type: 'file';
  paths: string[];
  events?: ('create' | 'modify' | 'delete')[];
  ignore?: string[];
  handlers?: {
    event: 'create' | 'modify' | 'delete';
    pattern?: string;
    actions: Action[];
  }[];
}

/** All pipe types */
export type PipeConfig =
  | HttpPipeConfig
  | WebSocketPipeConfig
  | MqttPipeConfig
  | TcpPipeConfig
  | WebhookPipeConfig
  | DatabasePipeConfig
  | FilePipeConfig;

/** Pipes configuration */
export interface PipesConfig {
  pipes: Record<string, PipeConfig>;
}
