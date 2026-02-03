/**
 * Permissions and Access Control types
 */

import type { Snowflake, SimpleCondition } from './common.js';

/** Discord permission flags */
export type Permission =
  | 'administrator'
  | 'manage_guild'
  | 'manage_roles'
  | 'manage_channels'
  | 'kick_members'
  | 'ban_members'
  | 'manage_nicknames'
  | 'manage_emojis_and_stickers'
  | 'manage_webhooks'
  | 'manage_messages'
  | 'manage_threads'
  | 'manage_events'
  | 'moderate_members'
  | 'view_audit_log'
  | 'view_guild_insights'
  | 'send_messages'
  | 'send_messages_in_threads'
  | 'create_public_threads'
  | 'create_private_threads'
  | 'embed_links'
  | 'attach_files'
  | 'add_reactions'
  | 'use_external_emojis'
  | 'use_external_stickers'
  | 'mention_everyone'
  | 'read_message_history'
  | 'use_application_commands'
  | 'connect'
  | 'speak'
  | 'stream'
  | 'use_voice_activity'
  | 'priority_speaker'
  | 'mute_members'
  | 'deafen_members'
  | 'move_members'
  | 'request_to_speak';

/** Permission level for hierarchical access */
export interface PermissionLevel {
  name: string;
  level: number;
  roles?: Snowflake[];
  users?: Snowflake[];
  permissions?: Permission[];
}

/** Access rule for commands/features */
export interface AccessRule {
  allow?: {
    roles?: Snowflake[];
    users?: Snowflake[];
    permissions?: Permission[];
    level?: number;
    channels?: Snowflake[];
  };
  deny?: {
    roles?: Snowflake[];
    users?: Snowflake[];
    channels?: Snowflake[];
  };
  when?: SimpleCondition;
}

/** Bot owner configuration */
export interface OwnerConfig {
  users: Snowflake[];
}

/** Permissions configuration */
export interface PermissionsConfig {
  owner?: OwnerConfig;
  levels?: PermissionLevel[];
  defaults?: AccessRule;
}
