/**
 * Automod types
 */

import type { Expression, SimpleCondition, Duration, Snowflake } from './common.js';
import type { Action } from './actions.js';

/** Automod rule trigger type */
export type AutomodTriggerType =
  | 'keyword'
  | 'regex'
  | 'spam'
  | 'mention_spam'
  | 'link'
  | 'invite'
  | 'caps'
  | 'emoji_spam'
  | 'newline_spam'
  | 'duplicate'
  | 'attachment'
  | 'mass_ping';

/** Automod rule trigger */
export interface AutomodTrigger {
  type: AutomodTriggerType;
  keywords?: string[];
  regex?: string[];
  threshold?: number;
  window?: Duration;
  allowed?: string[];
  blocked?: string[];
}

/** Automod rule */
export interface AutomodRule {
  name: string;
  enabled?: boolean;
  trigger: AutomodTrigger | AutomodTrigger[];
  exempt?: {
    roles?: Snowflake[];
    channels?: Snowflake[];
    users?: Snowflake[];
    permissions?: string[];
  };
  when?: SimpleCondition;
  actions: Action[];
  log_channel?: Expression;
  escalation?: {
    threshold: number;
    window: Duration;
    actions: Action[];
  };
}

/** Automod configuration */
export interface AutomodConfig {
  enabled?: boolean;
  rules: AutomodRule[];
  log_channel?: Expression;
  dm_on_action?: boolean;
}
