/**
 * Automod types
 */

import type { AutomodRule, AutomodTrigger } from '@furlow/schema';

export interface AutomodMatch {
  rule: AutomodRule;
  trigger: AutomodTrigger;
  matched: string[];
  content: string;
}

export interface AutomodResult {
  passed: boolean;
  matches: AutomodMatch[];
}
