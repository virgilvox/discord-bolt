/**
 * HTTP pipe for REST API integrations
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { HttpPipeConfig, Pipe, PipeResponse } from '../types.js';

export interface HttpPipeOptions {
  name: string;
  config: HttpPipeConfig;
}

export class HttpPipe implements Pipe {
  public readonly name: string;
  public readonly type = 'http';
  private client: AxiosInstance;
  private config: HttpPipeConfig;
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(options: HttpPipeOptions) {
    this.name = options.name;
    this.config = options.config;

    this.client = axios.create({
      baseURL: options.config.base_url,
      timeout: this.parseDuration(options.config.timeout ?? '30s'),
      headers: options.config.headers as Record<string, string>,
    });

    // Add auth interceptor
    if (options.config.auth) {
      this.client.interceptors.request.use((config) => {
        const auth = options.config.auth!;
        switch (auth.type) {
          case 'bearer':
            config.headers.Authorization = `Bearer ${auth.token}`;
            break;
          case 'basic':
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            config.headers.Authorization = `Basic ${credentials}`;
            break;
          case 'header':
            const headerName = auth.header_name ?? 'Authorization';
            config.headers[headerName] = auth.token as string;
            break;
        }
        return config;
      });
    }
  }

  isConnected(): boolean {
    return true; // HTTP is stateless
  }

  /**
   * Make an HTTP request
   */
  async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: {
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    } = {}
  ): Promise<PipeResponse<T>> {
    // Check rate limit
    if (this.config.rate_limit) {
      const now = Date.now();
      const windowMs = this.parseDuration(this.config.rate_limit.per);

      if (now - this.windowStart >= windowMs) {
        this.requestCount = 0;
        this.windowStart = now;
      }

      if (this.requestCount >= this.config.rate_limit.requests) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          status: 429,
        };
      }

      this.requestCount++;
    }

    const config: AxiosRequestConfig = {
      method,
      url: path,
      data: options.body,
      headers: options.headers,
      params: options.params,
    };

    try {
      const response = await this.requestWithRetry(config);

      return {
        success: true,
        data: response.data as T,
        status: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.message,
          status: error.response?.status,
          data: error.response?.data as T,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make a request with retry logic
   */
  private async requestWithRetry(
    config: AxiosRequestConfig,
    attempt = 0
  ): Promise<any> {
    try {
      return await this.client.request(config);
    } catch (error) {
      const maxAttempts = this.config.retry?.attempts ?? 0;
      const delay = this.parseDuration(this.config.retry?.delay ?? '1s');

      if (attempt < maxAttempts && axios.isAxiosError(error)) {
        // Retry on 5xx errors or network errors
        if (!error.response || error.response.status >= 500) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.requestWithRetry(config, attempt + 1);
        }
      }

      throw error;
    }
  }

  /**
   * Convenience methods
   */
  async get<T = unknown>(
    path: string,
    options?: { headers?: Record<string, string>; params?: Record<string, string> }
  ): Promise<PipeResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  async post<T = unknown>(
    path: string,
    body?: Record<string, unknown>,
    options?: { headers?: Record<string, string> }
  ): Promise<PipeResponse<T>> {
    return this.request<T>('POST', path, { body, ...options });
  }

  async put<T = unknown>(
    path: string,
    body?: Record<string, unknown>,
    options?: { headers?: Record<string, string> }
  ): Promise<PipeResponse<T>> {
    return this.request<T>('PUT', path, { body, ...options });
  }

  async patch<T = unknown>(
    path: string,
    body?: Record<string, unknown>,
    options?: { headers?: Record<string, string> }
  ): Promise<PipeResponse<T>> {
    return this.request<T>('PATCH', path, { body, ...options });
  }

  async delete<T = unknown>(
    path: string,
    options?: { headers?: Record<string, string> }
  ): Promise<PipeResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Parse duration string to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
    if (!match) return 30000;

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
 * Create an HTTP pipe
 */
export function createHttpPipe(options: HttpPipeOptions): HttpPipe {
  return new HttpPipe(options);
}
