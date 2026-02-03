/**
 * Flow system types
 */

import type { FlowDefinition, FlowParameter } from '@furlow/schema';

export interface FlowExecutionContext {
  /** Arguments passed to the flow */
  args: Record<string, unknown>;
  /** Flow call depth (for recursion protection) */
  depth: number;
  /** Parent flow name if called from another flow */
  parentFlow?: string;
  /** Return value from the flow */
  returnValue?: unknown;
  /** Whether the flow was aborted */
  aborted?: boolean;
  /** Abort reason */
  abortReason?: string;
}

export interface FlowResult<T = unknown> {
  success: boolean;
  value?: T;
  error?: Error;
  aborted?: boolean;
}

export interface RegisteredFlow {
  definition: FlowDefinition;
  parameters: Map<string, FlowParameter>;
}
