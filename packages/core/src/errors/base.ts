/**
 * Base error class for FURLOW
 */

import type { ErrorCode } from './codes.js';

export interface FurlowErrorOptions {
  code: ErrorCode;
  message: string;
  cause?: Error | undefined;
  context?: Record<string, unknown>;
  line?: number | undefined;
  column?: number | undefined;
  file?: string | undefined;
}

export class FurlowError extends Error {
  public readonly code: ErrorCode;
  public readonly context: Record<string, unknown>;
  public readonly line?: number | undefined;
  public readonly column?: number | undefined;
  public readonly file?: string | undefined;

  constructor(options: FurlowErrorOptions) {
    super(options.message);
    this.name = 'FurlowError';
    this.code = options.code;
    this.context = options.context ?? {};
    this.line = options.line;
    this.column = options.column;
    this.file = options.file;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      line: this.line,
      column: this.column,
      file: this.file,
      stack: this.stack,
    };
  }

  toString(): string {
    let msg = `${this.code}: ${this.message}`;
    if (this.file) {
      msg += `\n  at ${this.file}`;
      if (this.line !== undefined) {
        msg += `:${this.line}`;
        if (this.column !== undefined) {
          msg += `:${this.column}`;
        }
      }
    }
    return msg;
  }
}
