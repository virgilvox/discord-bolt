/**
 * Common types used across the FURLOW specification
 */

/** Expression that can be evaluated at runtime */
export type Expression = string;

/** Duration string like "5m", "1h", "30s" */
export type Duration = string;

/** Snowflake ID (Discord IDs) */
export type Snowflake = string;

/** Color in hex format or named color */
export type Color = string | number;

/** URL string */
export type Url = string;

/** File path (local or URL) */
export type FilePath = string;

/** Environment variable reference like $env.TOKEN */
export type EnvReference = `$env.${string}`;

/** Scope for state storage */
export type StateScope = 'global' | 'guild' | 'channel' | 'user' | 'member';

/** Log level */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Condition that can be a simple expression or complex object */
export interface Condition {
  all?: Condition[];
  any?: Condition[];
  not?: Condition;
  expr?: Expression;
}

/** Simple condition can be string expression or Condition object */
export type SimpleCondition = Expression | Condition;

/** Import reference */
export interface Import {
  path: string;
  as?: string;
}
