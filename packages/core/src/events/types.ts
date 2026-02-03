/**
 * Event system types
 */

import type { EventHandler as EventHandlerDef, DiscordEvent, FurlowEvent } from '@furlow/schema';
import type { ActionContext } from '../actions/types.js';

export type EventName = DiscordEvent | FurlowEvent | string;

export interface EventPayload {
  event: EventName;
  data: Record<string, unknown>;
  context: Partial<ActionContext>;
}

export interface RegisteredHandler {
  id: string;
  handler: EventHandlerDef;
  once: boolean;
  active: boolean;
}

export interface EventEmission {
  event: EventName;
  handlers: RegisteredHandler[];
  payload: EventPayload;
}
