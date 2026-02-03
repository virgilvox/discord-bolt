/**
 * Cron scheduler for scheduled jobs
 */

import type { CronJob, SchedulerConfig } from '@furlow/schema';
import type { ActionExecutor } from '../actions/executor.js';
import type { ActionContext } from '../actions/types.js';
import type { ExpressionEvaluator } from '../expression/evaluator.js';

interface ScheduledJob {
  id: string;
  config: CronJob;
  nextRun: Date;
  interval: NodeJS.Timeout | null;
}

export class CronScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private timezone: string = 'UTC';
  private running = false;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Configure the scheduler
   */
  configure(config: SchedulerConfig): void {
    this.timezone = config.timezone ?? 'UTC';

    // Register all jobs
    for (const job of config.jobs) {
      this.register(job);
    }
  }

  /**
   * Register a cron job
   */
  register(job: CronJob): string {
    const id = job.name;

    if (this.jobs.has(id)) {
      this.unregister(id);
    }

    const nextRun = this.getNextRun(job.cron, job.timezone ?? this.timezone);

    this.jobs.set(id, {
      id,
      config: job,
      nextRun,
      interval: null,
    });

    return id;
  }

  /**
   * Unregister a job
   */
  unregister(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.interval) {
      clearInterval(job.interval);
    }

    return this.jobs.delete(id);
  }

  /**
   * Start the scheduler
   */
  start(
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator,
    contextBuilder: () => ActionContext
  ): void {
    if (this.running) return;
    this.running = true;

    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkJobs(executor, evaluator, contextBuilder);
    }, 60000);

    // Initial check
    this.checkJobs(executor, evaluator, contextBuilder);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.running = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    for (const job of this.jobs.values()) {
      if (job.interval) {
        clearInterval(job.interval);
        job.interval = null;
      }
    }
  }

  /**
   * Check and run due jobs
   */
  private async checkJobs(
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator,
    contextBuilder: () => ActionContext
  ): Promise<void> {
    const now = new Date();

    for (const job of this.jobs.values()) {
      if (!job.config.enabled) continue;
      if (job.nextRun > now) continue;

      // Build context
      const context = contextBuilder();

      // Check when condition
      if (job.config.when) {
        const condition = typeof job.config.when === 'string'
          ? job.config.when
          : (job.config.when.expr ?? 'true');
        const shouldRun = await evaluator.evaluate<boolean>(condition, context);
        if (!shouldRun) {
          job.nextRun = this.getNextRun(
            job.config.cron,
            job.config.timezone ?? this.timezone
          );
          continue;
        }
      }

      // Execute actions
      try {
        await executor.executeSequence(job.config.actions, context);
      } catch (err) {
        console.error(`Cron job "${job.id}" failed:`, err);
      }

      // Schedule next run
      job.nextRun = this.getNextRun(
        job.config.cron,
        job.config.timezone ?? this.timezone
      );
    }
  }

  /**
   * Get the next run time for a cron expression
   */
  private getNextRun(cron: string, _timezone: string): Date {
    // Simple cron parser (basic implementation)
    // In production, use a library like cron-parser
    const parts = cron.split(' ');

    if (parts.length < 5) {
      // Default to running in 1 minute
      return new Date(Date.now() + 60000);
    }

    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Add 1 minute to ensure we're in the future
    next.setMinutes(next.getMinutes() + 1);

    return next;
  }

  /**
   * Get all job names
   */
  getJobNames(): string[] {
    return [...this.jobs.keys()];
  }

  /**
   * Get job info
   */
  getJob(id: string): ScheduledJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }
}

/**
 * Create a cron scheduler
 */
export function createCronScheduler(): CronScheduler {
  return new CronScheduler();
}
