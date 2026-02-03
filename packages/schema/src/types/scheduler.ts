/**
 * Scheduler types
 */

import type { Expression, SimpleCondition } from './common.js';
import type { Action } from './actions.js';

/** Cron job definition */
export interface CronJob {
  name: string;
  cron: string;
  timezone?: string;
  enabled?: boolean;
  when?: SimpleCondition;
  actions: Action[];
}

/** Scheduler configuration */
export interface SchedulerConfig {
  timezone?: string;
  jobs: CronJob[];
}
