/**
 * Action handlers - implementations for all FURLOW actions
 */

import type { ActionRegistry } from '../registry.js';
import type { ActionContext } from '../types.js';
import type { ExpressionEvaluator } from '../../expression/evaluator.js';
import type { StateManager } from '../../state/manager.js';
import type { FlowEngine } from '../../flows/engine.js';
import type { Client } from 'discord.js';

// Import all handler modules
import { registerMessageHandlers } from './message.js';
import { registerMemberHandlers } from './member.js';
import { registerStateHandlers } from './state.js';
import { registerFlowHandlers } from './flow.js';
import { registerChannelHandlers } from './channel.js';
import { registerComponentHandlers } from './component.js';
import { registerVoiceHandlers } from './voice.js';
import { registerDatabaseHandlers } from './database.js';
import { registerMiscHandlers } from './misc.js';

/** Dependencies for action handlers */
export interface HandlerDependencies {
  client: Client;
  evaluator: ExpressionEvaluator;
  stateManager?: StateManager;
  flowEngine?: FlowEngine;
  voiceManager?: unknown;
}

/**
 * Register all core action handlers
 */
export function registerCoreHandlers(
  registry: ActionRegistry,
  deps: HandlerDependencies
): void {
  registerMessageHandlers(registry, deps);
  registerMemberHandlers(registry, deps);
  registerStateHandlers(registry, deps);
  registerFlowHandlers(registry, deps);
  registerChannelHandlers(registry, deps);
  registerComponentHandlers(registry, deps);
  registerVoiceHandlers(registry, deps);
  registerDatabaseHandlers(registry, deps);
  registerMiscHandlers(registry, deps);
}

// Re-export handler registration functions
export { registerMessageHandlers } from './message.js';
export { registerMemberHandlers } from './member.js';
export { registerStateHandlers } from './state.js';
export { registerFlowHandlers } from './flow.js';
export { registerChannelHandlers } from './channel.js';
export { registerComponentHandlers } from './component.js';
export { registerVoiceHandlers } from './voice.js';
export { registerDatabaseHandlers } from './database.js';
export { registerMiscHandlers } from './misc.js';
