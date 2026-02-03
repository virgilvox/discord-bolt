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
