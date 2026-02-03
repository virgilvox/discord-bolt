/**
 * Type declarations for jexl
 */
declare module 'jexl' {
  namespace Jexl {
    interface Expression {
      eval(context?: Record<string, unknown>): Promise<unknown>;
      evalSync(context?: Record<string, unknown>): unknown;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type JexlFunction = (...args: any[]) => any;

    class Jexl {
      eval(expression: string, context?: Record<string, unknown>): Promise<unknown>;
      evalSync(expression: string, context?: Record<string, unknown>): unknown;
      compile(expression: string): Expression;
      addTransform(name: string, fn: JexlFunction): void;
      addFunction(name: string, fn: JexlFunction): void;
      addBinaryOp(operator: string, precedence: number, fn: JexlFunction): void;
      addUnaryOp(operator: string, fn: JexlFunction): void;
    }
  }

  export = Jexl;
}
