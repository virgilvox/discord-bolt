/**
 * Action registry - central registry for all action handlers
 */

import type { Action } from '@furlow/schema';
import type { ActionHandler, ActionHandlerMap } from './types.js';
import { ActionNotFoundError } from '../errors/index.js';

export class ActionRegistry {
  private handlers: ActionHandlerMap = new Map();

  /**
   * Register an action handler
   */
  register<T extends Action>(handler: ActionHandler<T>): void {
    if (this.handlers.has(handler.name)) {
      console.warn(`Action handler "${handler.name}" is being overwritten`);
    }
    this.handlers.set(handler.name, handler as ActionHandler);
  }

  /**
   * Register multiple action handlers
   */
  registerAll(handlers: ActionHandler[]): void {
    for (const handler of handlers) {
      this.register(handler);
    }
  }

  /**
   * Get an action handler by name
   */
  get(name: string): ActionHandler {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new ActionNotFoundError(name);
    }
    return handler;
  }

  /**
   * Check if an action handler exists
   */
  has(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * Get all registered action names
   */
  getNames(): string[] {
    return [...this.handlers.keys()];
  }

  /**
   * Get all registered handlers
   */
  getAll(): ActionHandler[] {
    return [...this.handlers.values()];
  }

  /**
   * Unregister an action handler
   */
  unregister(name: string): boolean {
    return this.handlers.delete(name);
  }

  /**
   * Clear all registered handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Global registry instance
let globalRegistry: ActionRegistry | null = null;

/**
 * Get the global action registry
 */
export function getActionRegistry(): ActionRegistry {
  if (!globalRegistry) {
    globalRegistry = new ActionRegistry();
  }
  return globalRegistry;
}

/**
 * Create a new action registry
 */
export function createActionRegistry(): ActionRegistry {
  return new ActionRegistry();
}
