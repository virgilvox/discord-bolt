/**
 * Flow types
 */

import type { Expression } from './common.js';
import type { Action } from './actions.js';

/** Flow parameter */
export interface FlowParameter {
  name: string;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  default?: unknown;
}

/** Flow definition */
export interface FlowDefinition {
  name: string;
  description?: string;
  parameters?: FlowParameter[];
  actions: Action[];
  returns?: Expression;
}

/** Flows configuration */
export interface FlowsConfig {
  flows: FlowDefinition[];
}
