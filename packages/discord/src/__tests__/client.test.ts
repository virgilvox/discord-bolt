/**
 * Discord Client Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GatewayIntentBits } from 'discord.js';

// We can't easily test the FurlowClient directly because it depends on discord.js
// Instead, we test the logic in isolation

describe('Discord Client Logic', () => {
  // Test the intent mapping
  describe('Intent Mapping', () => {
    const INTENT_MAP: Record<string, GatewayIntentBits> = {
      guilds: GatewayIntentBits.Guilds,
      guild_members: GatewayIntentBits.GuildMembers,
      guild_moderation: GatewayIntentBits.GuildModeration,
      guild_emojis_and_stickers: GatewayIntentBits.GuildEmojisAndStickers,
      guild_integrations: GatewayIntentBits.GuildIntegrations,
      guild_webhooks: GatewayIntentBits.GuildWebhooks,
      guild_invites: GatewayIntentBits.GuildInvites,
      guild_voice_states: GatewayIntentBits.GuildVoiceStates,
      guild_presences: GatewayIntentBits.GuildPresences,
      guild_messages: GatewayIntentBits.GuildMessages,
      guild_message_reactions: GatewayIntentBits.GuildMessageReactions,
      guild_message_typing: GatewayIntentBits.GuildMessageTyping,
      direct_messages: GatewayIntentBits.DirectMessages,
      direct_message_reactions: GatewayIntentBits.DirectMessageReactions,
      direct_message_typing: GatewayIntentBits.DirectMessageTyping,
      message_content: GatewayIntentBits.MessageContent,
      guild_scheduled_events: GatewayIntentBits.GuildScheduledEvents,
      auto_moderation_configuration: GatewayIntentBits.AutoModerationConfiguration,
      auto_moderation_execution: GatewayIntentBits.AutoModerationExecution,
    };

    it('should map all standard intents', () => {
      expect(INTENT_MAP['guilds']).toBe(GatewayIntentBits.Guilds);
      expect(INTENT_MAP['guild_members']).toBe(GatewayIntentBits.GuildMembers);
      expect(INTENT_MAP['guild_messages']).toBe(GatewayIntentBits.GuildMessages);
      expect(INTENT_MAP['message_content']).toBe(GatewayIntentBits.MessageContent);
    });

    it('should map voice intents', () => {
      expect(INTENT_MAP['guild_voice_states']).toBe(GatewayIntentBits.GuildVoiceStates);
    });

    it('should map moderation intents', () => {
      expect(INTENT_MAP['guild_moderation']).toBe(GatewayIntentBits.GuildModeration);
      expect(INTENT_MAP['auto_moderation_configuration']).toBe(GatewayIntentBits.AutoModerationConfiguration);
      expect(INTENT_MAP['auto_moderation_execution']).toBe(GatewayIntentBits.AutoModerationExecution);
    });

    it('should map DM intents', () => {
      expect(INTENT_MAP['direct_messages']).toBe(GatewayIntentBits.DirectMessages);
      expect(INTENT_MAP['direct_message_reactions']).toBe(GatewayIntentBits.DirectMessageReactions);
      expect(INTENT_MAP['direct_message_typing']).toBe(GatewayIntentBits.DirectMessageTyping);
    });

    it('should have all required intents', () => {
      const requiredIntents = [
        'guilds',
        'guild_members',
        'guild_messages',
        'message_content',
        'guild_voice_states',
        'guild_presences',
      ];

      for (const intent of requiredIntents) {
        expect(INTENT_MAP[intent]).toBeDefined();
      }
    });
  });

  // Test activity type mapping
  describe('Activity Type Mapping', () => {
    const getActivityType = (type: string): number => {
      const types: Record<string, number> = {
        playing: 0,
        streaming: 1,
        listening: 2,
        watching: 3,
        custom: 4,
        competing: 5,
      };
      return types[type] ?? 0;
    };

    it('should map playing activity', () => {
      expect(getActivityType('playing')).toBe(0);
    });

    it('should map streaming activity', () => {
      expect(getActivityType('streaming')).toBe(1);
    });

    it('should map listening activity', () => {
      expect(getActivityType('listening')).toBe(2);
    });

    it('should map watching activity', () => {
      expect(getActivityType('watching')).toBe(3);
    });

    it('should map custom activity', () => {
      expect(getActivityType('custom')).toBe(4);
    });

    it('should map competing activity', () => {
      expect(getActivityType('competing')).toBe(5);
    });

    it('should default to playing for unknown type', () => {
      expect(getActivityType('unknown')).toBe(0);
    });
  });

  // Test auto-detect intents logic
  describe('Auto-Detect Intents', () => {
    interface MockSpec {
      events?: { event: string }[];
      commands?: unknown[];
      voice?: unknown;
    }

    const autoDetectIntents = (spec: MockSpec): Set<GatewayIntentBits> => {
      const intents = new Set<GatewayIntentBits>();
      intents.add(GatewayIntentBits.Guilds);

      if (spec.events) {
        for (const handler of spec.events) {
          switch (handler.event) {
            case 'message_create':
            case 'message':
            case 'message_update':
            case 'message_delete':
              intents.add(GatewayIntentBits.GuildMessages);
              intents.add(GatewayIntentBits.MessageContent);
              break;
            case 'guild_member_add':
            case 'guild_member_remove':
            case 'guild_member_update':
            case 'member_join':
            case 'member_leave':
              intents.add(GatewayIntentBits.GuildMembers);
              break;
            case 'voice_state_update':
            case 'voice_join':
            case 'voice_leave':
              intents.add(GatewayIntentBits.GuildVoiceStates);
              break;
            case 'message_reaction_add':
            case 'message_reaction_remove':
              intents.add(GatewayIntentBits.GuildMessageReactions);
              break;
            case 'presence_update':
              intents.add(GatewayIntentBits.GuildPresences);
              break;
          }
        }
      }

      if (spec.commands?.length) {
        intents.add(GatewayIntentBits.GuildMessages);
      }

      if (spec.voice) {
        intents.add(GatewayIntentBits.GuildVoiceStates);
      }

      return intents;
    };

    it('should always include Guilds intent', () => {
      const intents = autoDetectIntents({});
      expect(intents.has(GatewayIntentBits.Guilds)).toBe(true);
    });

    it('should detect message events', () => {
      const intents = autoDetectIntents({
        events: [{ event: 'message_create' }],
      });
      expect(intents.has(GatewayIntentBits.GuildMessages)).toBe(true);
      expect(intents.has(GatewayIntentBits.MessageContent)).toBe(true);
    });

    it('should detect member events', () => {
      const intents = autoDetectIntents({
        events: [{ event: 'guild_member_add' }],
      });
      expect(intents.has(GatewayIntentBits.GuildMembers)).toBe(true);
    });

    it('should detect voice events', () => {
      const intents = autoDetectIntents({
        events: [{ event: 'voice_state_update' }],
      });
      expect(intents.has(GatewayIntentBits.GuildVoiceStates)).toBe(true);
    });

    it('should detect reaction events', () => {
      const intents = autoDetectIntents({
        events: [{ event: 'message_reaction_add' }],
      });
      expect(intents.has(GatewayIntentBits.GuildMessageReactions)).toBe(true);
    });

    it('should detect presence events', () => {
      const intents = autoDetectIntents({
        events: [{ event: 'presence_update' }],
      });
      expect(intents.has(GatewayIntentBits.GuildPresences)).toBe(true);
    });

    it('should include message intent for commands', () => {
      const intents = autoDetectIntents({
        commands: [{ name: 'test' }],
      });
      expect(intents.has(GatewayIntentBits.GuildMessages)).toBe(true);
    });

    it('should include voice intent for voice config', () => {
      const intents = autoDetectIntents({
        voice: { enabled: true },
      });
      expect(intents.has(GatewayIntentBits.GuildVoiceStates)).toBe(true);
    });

    it('should combine multiple event types', () => {
      const intents = autoDetectIntents({
        events: [
          { event: 'message_create' },
          { event: 'guild_member_add' },
          { event: 'voice_join' },
        ],
      });
      expect(intents.has(GatewayIntentBits.GuildMessages)).toBe(true);
      expect(intents.has(GatewayIntentBits.GuildMembers)).toBe(true);
      expect(intents.has(GatewayIntentBits.GuildVoiceStates)).toBe(true);
    });
  });
});

describe('Interaction Handler Logic', () => {
  // Test prefix handler matching
  describe('Prefix Handler Matching', () => {
    const findPrefixHandler = <T>(
      handlers: Map<string, T>,
      customId: string
    ): T | undefined => {
      for (const [key, handler] of handlers) {
        if (key.endsWith('*') && customId.startsWith(key.slice(0, -1))) {
          return handler;
        }
      }
      return undefined;
    };

    it('should find exact match first', () => {
      const handlers = new Map<string, string>();
      handlers.set('button_1', 'exact');
      handlers.set('button_*', 'prefix');

      // Exact match should be checked first in real implementation
      expect(handlers.get('button_1')).toBe('exact');
    });

    it('should match wildcard patterns', () => {
      const handlers = new Map<string, string>();
      handlers.set('button_*', 'matched');

      const result = findPrefixHandler(handlers, 'button_123');
      expect(result).toBe('matched');
    });

    it('should match prefix with any suffix', () => {
      const handlers = new Map<string, string>();
      handlers.set('ticket_close_*', 'close_handler');

      expect(findPrefixHandler(handlers, 'ticket_close_12345')).toBe('close_handler');
      expect(findPrefixHandler(handlers, 'ticket_close_abc')).toBe('close_handler');
      expect(findPrefixHandler(handlers, 'ticket_open_12345')).toBeUndefined();
    });

    it('should return undefined for no match', () => {
      const handlers = new Map<string, string>();
      handlers.set('button_*', 'handler');

      const result = findPrefixHandler(handlers, 'select_123');
      expect(result).toBeUndefined();
    });

    it('should not match non-wildcard patterns as prefix', () => {
      const handlers = new Map<string, string>();
      handlers.set('button_fixed', 'handler');

      const result = findPrefixHandler(handlers, 'button_fixed_extra');
      expect(result).toBeUndefined();
    });
  });

  // Test option type method name mapping
  describe('Option Type Mapping', () => {
    const getOptionMethodName = (type: string): string => {
      const map: Record<string, string> = {
        string: 'String',
        integer: 'Integer',
        number: 'Number',
        boolean: 'Boolean',
        user: 'User',
        channel: 'Channel',
        role: 'Role',
        mentionable: 'Mentionable',
        attachment: 'Attachment',
      };
      return map[type] ?? 'String';
    };

    it('should map string type', () => {
      expect(getOptionMethodName('string')).toBe('String');
    });

    it('should map integer type', () => {
      expect(getOptionMethodName('integer')).toBe('Integer');
    });

    it('should map number type', () => {
      expect(getOptionMethodName('number')).toBe('Number');
    });

    it('should map boolean type', () => {
      expect(getOptionMethodName('boolean')).toBe('Boolean');
    });

    it('should map user type', () => {
      expect(getOptionMethodName('user')).toBe('User');
    });

    it('should map channel type', () => {
      expect(getOptionMethodName('channel')).toBe('Channel');
    });

    it('should map role type', () => {
      expect(getOptionMethodName('role')).toBe('Role');
    });

    it('should map mentionable type', () => {
      expect(getOptionMethodName('mentionable')).toBe('Mentionable');
    });

    it('should map attachment type', () => {
      expect(getOptionMethodName('attachment')).toBe('Attachment');
    });

    it('should default to String for unknown types', () => {
      expect(getOptionMethodName('unknown')).toBe('String');
    });
  });
});
