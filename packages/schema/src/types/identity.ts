/**
 * Identity and Presence types
 */

import type { Expression, FilePath, Url } from './common.js';

/** Bot identity configuration */
export interface Identity {
  name: string;
  avatar?: FilePath | Url;
  banner?: FilePath | Url;
  about?: string;
}

/** Activity type */
export type ActivityType = 'playing' | 'streaming' | 'listening' | 'watching' | 'competing' | 'custom';

/** Online status */
export type OnlineStatus = 'online' | 'idle' | 'dnd' | 'invisible';

/** Activity configuration */
export interface Activity {
  type: ActivityType;
  text: string;
  url?: Url;
  state?: string;
}

/** Dynamic presence rule */
export interface DynamicPresenceRule {
  when?: Expression;
  default?: boolean;
  status?: OnlineStatus;
  activity?: Activity;
}

/** Presence configuration */
export interface Presence {
  status?: OnlineStatus;
  activity?: Activity;
  dynamic?: DynamicPresenceRule[];
}
