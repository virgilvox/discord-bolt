/**
 * Jexl-based expression evaluator
 */

import Jexl from 'jexl';
import { ExpressionSyntaxError, UndefinedVariableError } from '../errors/index.js';
import { registerFunctions } from './functions.js';
import { registerTransforms } from './transforms.js';

export interface EvaluatorOptions {
  /** Maximum expression evaluation time in milliseconds */
  timeout?: number;
  /** Whether to allow undefined variables (false = error) */
  allowUndefined?: boolean;
}

const DEFAULT_OPTIONS: Required<EvaluatorOptions> = {
  timeout: 5000,
  allowUndefined: false,
};

/**
 * Create a new expression evaluator instance
 */
export function createEvaluator(options: EvaluatorOptions = {}): ExpressionEvaluator {
  return new ExpressionEvaluator({ ...DEFAULT_OPTIONS, ...options });
}

export class ExpressionEvaluator {
  private jexl: Jexl.Jexl;
  private options: Required<EvaluatorOptions>;

  constructor(options: Required<EvaluatorOptions>) {
    this.options = options;
    this.jexl = new Jexl.Jexl();

    // Register built-in functions and transforms
    registerFunctions(this.jexl);
    registerTransforms(this.jexl);
  }

  /**
   * Add a custom function
   */
  addFunction(name: string, fn: (...args: unknown[]) => unknown): void {
    this.jexl.addFunction(name, fn);
  }

  /**
   * Add a custom transform
   */
  addTransform(name: string, fn: (value: unknown, ...args: unknown[]) => unknown): void {
    this.jexl.addTransform(name, fn);
  }

  /**
   * Evaluate an expression
   */
  async evaluate<T = unknown>(
    expression: string,
    context: Record<string, unknown> = {}
  ): Promise<T> {
    try {
      // Wrap evaluation with timeout
      const result = await Promise.race([
        this.jexl.eval(expression, context),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Expression evaluation timeout')),
            this.options.timeout
          )
        ),
      ]);

      return result as T;
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('undefined')) {
          const match = err.message.match(/undefined variable "?([^"]+)"?/i);
          if (match?.[1]) {
            throw new UndefinedVariableError(match[1], expression);
          }
        }
        throw new ExpressionSyntaxError(expression, err.message);
      }
      throw err;
    }
  }

  /**
   * Evaluate an expression synchronously (no timeout)
   */
  evaluateSync<T = unknown>(
    expression: string,
    context: Record<string, unknown> = {}
  ): T {
    try {
      return this.jexl.evalSync(expression, context) as T;
    } catch (err) {
      if (err instanceof Error) {
        throw new ExpressionSyntaxError(expression, err.message);
      }
      throw err;
    }
  }

  /**
   * Interpolate a string with ${...} expressions
   */
  async interpolate(
    template: string,
    context: Record<string, unknown> = {}
  ): Promise<string> {
    const pattern = /\$\{([^}]+)\}/g;
    const matches = [...template.matchAll(pattern)];

    if (matches.length === 0) {
      return template;
    }

    let result = template;
    for (const match of matches) {
      const fullMatch = match[0];
      const expression = match[1]?.trim();
      if (!expression) continue;

      const value = await this.evaluate(expression, context);
      result = result.replace(fullMatch, String(value ?? ''));
    }

    return result;
  }

  /**
   * Interpolate synchronously
   */
  interpolateSync(
    template: string,
    context: Record<string, unknown> = {}
  ): string {
    const pattern = /\$\{([^}]+)\}/g;
    return template.replace(pattern, (_, expression: string) => {
      const value = this.evaluateSync(expression.trim(), context);
      return String(value ?? '');
    });
  }

  /**
   * Check if a string contains expressions
   */
  hasExpressions(template: string): boolean {
    return /\$\{[^}]+\}/.test(template);
  }

  /**
   * Compile an expression for repeated evaluation
   */
  compile(expression: string): Jexl.Expression {
    return this.jexl.compile(expression);
  }
}
