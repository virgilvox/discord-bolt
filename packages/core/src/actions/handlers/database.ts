/**
 * Database action handlers
 */

import type { ActionRegistry } from '../registry.js';
import type { ActionHandler, ActionContext, ActionResult } from '../types.js';
import type { HandlerDependencies } from './index.js';
import type {
  DbInsertAction,
  DbUpdateAction,
  DbDeleteAction,
  DbQueryAction,
} from '@furlow/schema';
import type { StateManager } from '../../state/manager.js';

/**
 * Helper to evaluate data object values
 */
async function evaluateData(
  data: Record<string, unknown>,
  context: ActionContext,
  evaluator: { evaluate: <T>(expr: string, ctx: Record<string, unknown>) => Promise<T> }
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      try {
        result[key] = await evaluator.evaluate(value, context);
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * DB insert action handler
 */
const dbInsertHandler: ActionHandler<DbInsertAction> = {
  name: 'db_insert',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, stateManager } = deps;

    if (!stateManager) {
      return { success: false, error: new Error('State manager not available') };
    }

    const data = await evaluateData(config.data, context, evaluator);

    try {
      await stateManager.insert(config.table, data);

      if (config.as) {
        (context as Record<string, unknown>)[config.as] = data;
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * DB update action handler
 */
const dbUpdateHandler: ActionHandler<DbUpdateAction> = {
  name: 'db_update',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, stateManager } = deps;

    if (!stateManager) {
      return { success: false, error: new Error('State manager not available') };
    }

    const where = await evaluateData(config.where, context, evaluator);

    let data: Record<string, unknown>;
    if (typeof config.data === 'string') {
      // It's an expression
      data = await evaluator.evaluate<Record<string, unknown>>(config.data, context);
    } else {
      data = await evaluateData(config.data as Record<string, unknown>, context, evaluator);
    }

    try {
      // Check for upsert mode
      if (config.upsert) {
        // First try to find existing
        const existing = await stateManager.query(config.table, {
          where,
          limit: 1,
        });

        if (existing.length === 0) {
          // Insert new record
          await stateManager.insert(config.table, { ...where, ...data });
          if (config.as) {
            (context as Record<string, unknown>)[config.as] = 1;
          }
          return { success: true, data: 1 };
        }
      }

      const count = await stateManager.update(config.table, where, data);

      if (config.as) {
        (context as Record<string, unknown>)[config.as] = count;
      }

      return { success: true, data: count };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * DB delete action handler
 */
const dbDeleteHandler: ActionHandler<DbDeleteAction> = {
  name: 'db_delete',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, stateManager } = deps;

    if (!stateManager) {
      return { success: false, error: new Error('State manager not available') };
    }

    const where = await evaluateData(config.where, context, evaluator);

    try {
      const count = await stateManager.deleteRows(config.table, where);
      return { success: true, data: count };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * DB query action handler
 */
const dbQueryHandler: ActionHandler<DbQueryAction> = {
  name: 'db_query',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, stateManager } = deps;

    if (!stateManager) {
      return { success: false, error: new Error('State manager not available') };
    }

    const where = config.where
      ? await evaluateData(config.where, context, evaluator)
      : undefined;

    let limit: number | undefined;
    if (config.limit !== undefined) {
      if (typeof config.limit === 'string') {
        limit = await evaluator.evaluate<number>(config.limit, context);
      } else {
        limit = config.limit;
      }
    }

    let offset: number | undefined;
    if (config.offset !== undefined) {
      if (typeof config.offset === 'string') {
        offset = await evaluator.evaluate<number>(config.offset, context);
      } else {
        offset = config.offset;
      }
    }

    try {
      const results = await stateManager.query(config.table, {
        where,
        select: config.select,
        orderBy: config.order_by,
        limit,
        offset,
      });

      // Store in variable (required for db_query)
      (context as Record<string, unknown>)[config.as] = results;

      return { success: true, data: results };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Register all database handlers
 */
export function registerDatabaseHandlers(
  registry: ActionRegistry,
  deps: HandlerDependencies
): void {
  registry.register(dbInsertHandler);
  registry.register(dbUpdateHandler);
  registry.register(dbDeleteHandler);
  registry.register(dbQueryHandler);
}
