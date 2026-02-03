/**
 * Pipe types
 */

export interface PipeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  headers?: Record<string, string>;
}

export interface Pipe {
  name: string;
  type: string;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  isConnected(): boolean;
}

/** HTTP authentication type */
export type HttpAuthType = 'none' | 'header' | 'bearer' | 'basic';

/** HTTP authentication config */
export interface HttpAuthConfig {
  type: HttpAuthType;
  token?: string;
  username?: string;
  password?: string;
  header_name?: string;
}

/** HTTP rate limit config */
export interface HttpRateLimitConfig {
  requests: number;
  per: string;
  retry_after?: boolean;
}

/** HTTP pipe configuration */
export interface HttpPipeConfig {
  type: 'http';
  base_url: string;
  auth?: HttpAuthConfig;
  headers?: Record<string, string>;
  rate_limit?: HttpRateLimitConfig;
  timeout?: string;
  retry?: {
    attempts?: number;
    delay?: string;
  };
}

/** Webhook verification configuration */
export interface WebhookVerification {
  type: 'hmac' | 'signature' | 'token';
  secret?: string;
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
    when?: string;
    actions: unknown[];
  }[];
}

/** WebSocket pipe configuration */
export interface WebSocketPipeConfig {
  type: 'websocket';
  url: string;
  headers?: Record<string, string>;
  reconnect?: {
    enabled?: boolean;
    delay?: string;
    max_attempts?: number;
  };
  heartbeat?: {
    interval?: string;
    message?: string;
  };
  handlers?: {
    event: string;
    when?: string;
    actions: unknown[];
  }[];
}
