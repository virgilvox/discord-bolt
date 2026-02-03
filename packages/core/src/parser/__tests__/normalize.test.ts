/**
 * Unit tests for action normalization
 */

import { describe, it, expect } from 'vitest';
import { normalizeActionsDeep, normalizeSpec } from '../normalize.js';
import type { FurlowSpec, Action } from '@furlow/schema';

describe('normalizeActionsDeep', () => {
  describe('basic normalization', () => {
    it('should convert shorthand action to schema format', () => {
      const actions = [
        { reply: { content: 'Hello!' } },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        { action: 'reply', content: 'Hello!' },
      ]);
    });

    it('should preserve already-normalized actions', () => {
      const actions = [
        { action: 'reply', content: 'Hello!' },
      ] as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        { action: 'reply', content: 'Hello!' },
      ]);
    });

    it('should handle actions with when condition', () => {
      const actions = [
        { reply: { content: 'Hello!' }, when: 'user.bot == false' },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        { action: 'reply', content: 'Hello!', when: 'user.bot == false' },
      ]);
    });

    it('should handle actions with error_handler', () => {
      const actions = [
        { send_message: { channel: '123', content: 'test' }, error_handler: 'log_error' },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        { action: 'send_message', channel: '123', content: 'test', error_handler: 'log_error' },
      ]);
    });

    it('should handle actions with null/empty value (e.g., voice_stop)', () => {
      const actions = [
        { voice_stop: null },
        { voice_pause: {} },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        { action: 'voice_stop' },
        { action: 'voice_pause' },
      ]);
    });

    it('should handle multiple actions', () => {
      const actions = [
        { log: { message: 'Starting...' } },
        { action: 'wait', duration: '1s' },
        { reply: { content: 'Done!' } },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        { action: 'log', message: 'Starting...' },
        { action: 'wait', duration: '1s' },
        { action: 'reply', content: 'Done!' },
      ]);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for null input', () => {
      const result = normalizeActionsDeep(null as unknown as Action[]);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const result = normalizeActionsDeep(undefined as unknown as Action[]);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty array input', () => {
      const result = normalizeActionsDeep([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      // The function guards against invalid input types
      const result = normalizeActionsDeep('not an array' as unknown as Action[]);
      expect(result).toEqual([]);
    });

    it('should handle null items in array', () => {
      const actions = [
        null,
        { reply: { content: 'test' } },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result[0]).toBeNull();
      expect(result[1]).toEqual({ action: 'reply', content: 'test' });
    });
  });

  describe('nested actions', () => {
    it('should normalize flow_if then/else branches', () => {
      const actions = [
        {
          flow_if: {
            if: 'count > 0',
            then: [{ reply: { content: 'Positive' } }],
            else: [{ reply: { content: 'Zero or negative' } }],
          },
        },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        {
          action: 'flow_if',
          if: 'count > 0',
          then: [{ action: 'reply', content: 'Positive' }],
          else: [{ action: 'reply', content: 'Zero or negative' }],
        },
      ]);
    });

    it('should normalize flow_switch cases', () => {
      const actions = [
        {
          flow_switch: {
            value: 'type',
            cases: {
              a: [{ log: { message: 'Type A' } }],
              b: [{ log: { message: 'Type B' } }],
            },
            default: [{ log: { message: 'Unknown' } }],
          },
        },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        {
          action: 'flow_switch',
          value: 'type',
          cases: {
            a: [{ action: 'log', message: 'Type A' }],
            b: [{ action: 'log', message: 'Type B' }],
          },
          default: [{ action: 'log', message: 'Unknown' }],
        },
      ]);
    });

    it('should normalize try/catch/finally', () => {
      const actions = [
        {
          try: {
            try: [{ send_message: { channel: '123', content: 'test' } }],
            catch: [{ log: { message: 'Error!' } }],
            finally: [{ log: { message: 'Done' } }],
          },
        },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        {
          action: 'try',
          try: [{ action: 'send_message', channel: '123', content: 'test' }],
          catch: [{ action: 'log', message: 'Error!' }],
          finally: [{ action: 'log', message: 'Done' }],
        },
      ]);
    });

    it('should normalize parallel actions', () => {
      const actions = [
        {
          parallel: {
            actions: [
              { send_dm: { user: '123', content: 'DM' } },
              { log: { message: 'Sent' } },
            ],
          },
        },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        {
          action: 'parallel',
          actions: [
            { action: 'send_dm', user: '123', content: 'DM' },
            { action: 'log', message: 'Sent' },
          ],
        },
      ]);
    });

    it('should normalize deeply nested control flow', () => {
      const actions = [
        {
          flow_if: {
            if: 'level > 0',
            then: [
              {
                flow_switch: {
                  value: 'type',
                  cases: {
                    special: [{ reply: { content: 'Special!' } }],
                  },
                },
              },
            ],
          },
        },
      ] as unknown as Action[];

      const result = normalizeActionsDeep(actions);

      expect(result).toEqual([
        {
          action: 'flow_if',
          if: 'level > 0',
          then: [
            {
              action: 'flow_switch',
              value: 'type',
              cases: {
                special: [{ action: 'reply', content: 'Special!' }],
              },
            },
          ],
        },
      ]);
    });
  });

  describe('idempotency', () => {
    it('should be idempotent - normalizing twice produces same result', () => {
      const actions = [
        { reply: { content: 'Hello!' } },
        { flow_if: { if: 'true', then: [{ log: { message: 'yes' } }] } },
      ] as unknown as Action[];

      const once = normalizeActionsDeep(actions);
      const twice = normalizeActionsDeep(once);

      expect(twice).toEqual(once);
    });
  });
});

describe('normalizeSpec', () => {
  describe('commands normalization', () => {
    it('should normalize command actions', () => {
      const spec: FurlowSpec = {
        commands: [
          {
            name: 'ping',
            description: 'Ping command',
            actions: [{ reply: { content: 'Pong!' } }] as unknown as Action[],
          },
        ],
      };

      const result = normalizeSpec(spec);

      expect(result.commands![0].actions).toEqual([
        { action: 'reply', content: 'Pong!' },
      ]);
    });

    it('should normalize subcommand actions', () => {
      const spec: FurlowSpec = {
        commands: [
          {
            name: 'mod',
            description: 'Moderation',
            subcommands: [
              {
                name: 'warn',
                description: 'Warn user',
                actions: [{ send_dm: { user: '${target.id}', content: 'Warning!' } }] as unknown as Action[],
              },
            ],
          },
        ],
      };

      const result = normalizeSpec(spec);

      expect(result.commands![0].subcommands![0].actions).toEqual([
        { action: 'send_dm', user: '${target.id}', content: 'Warning!' },
      ]);
    });
  });

  describe('events normalization', () => {
    it('should normalize events array format', () => {
      const spec: FurlowSpec = {
        events: [
          {
            event: 'message_create',
            actions: [{ log: { message: 'New message' } }] as unknown as Action[],
          },
        ],
      };

      const result = normalizeSpec(spec);

      expect(result.events![0].actions).toEqual([
        { action: 'log', message: 'New message' },
      ]);
    });

    it('should normalize events object format to array', () => {
      const spec = {
        events: {
          ready: {
            actions: [{ log: { message: 'Bot ready!' } }],
          },
          member_join: {
            actions: [{ send_dm: { user: '${user.id}', content: 'Welcome!' } }],
          },
        },
      } as unknown as FurlowSpec;

      const result = normalizeSpec(spec);

      expect(Array.isArray(result.events)).toBe(true);
      expect(result.events).toHaveLength(2);
      expect(result.events![0]).toMatchObject({
        event: 'ready',
        actions: [{ action: 'log', message: 'Bot ready!' }],
      });
      expect(result.events![1]).toMatchObject({
        event: 'member_join',
        actions: [{ action: 'send_dm', user: '${user.id}', content: 'Welcome!' }],
      });
    });
  });

  describe('flows normalization', () => {
    it('should normalize flows array format', () => {
      const spec: FurlowSpec = {
        flows: [
          {
            name: 'greet',
            actions: [{ reply: { content: 'Hello!' } }] as unknown as Action[],
          },
        ],
      };

      const result = normalizeSpec(spec);

      expect(result.flows![0].actions).toEqual([
        { action: 'reply', content: 'Hello!' },
      ]);
    });

    it('should normalize flows object format to array', () => {
      const spec = {
        flows: {
          log_action: {
            parameters: [{ name: 'msg', type: 'string' }],
            actions: [{ log: { message: '${msg}' } }],
          },
        },
      } as unknown as FurlowSpec;

      const result = normalizeSpec(spec);

      expect(Array.isArray(result.flows)).toBe(true);
      expect(result.flows).toHaveLength(1);
      expect(result.flows![0]).toMatchObject({
        name: 'log_action',
        parameters: [{ name: 'msg', type: 'string' }],
        actions: [{ action: 'log', message: '${msg}' }],
      });
    });
  });

  describe('scheduler normalization', () => {
    it('should normalize scheduler job actions', () => {
      const spec: FurlowSpec = {
        scheduler: {
          jobs: [
            {
              name: 'hourly',
              cron: '0 * * * *',
              actions: [{ log: { message: 'Hourly task' } }] as unknown as Action[],
            },
          ],
        },
      };

      const result = normalizeSpec(spec);

      expect(result.scheduler!.jobs[0].actions).toEqual([
        { action: 'log', message: 'Hourly task' },
      ]);
    });
  });

  describe('automod normalization', () => {
    it('should normalize automod rule actions', () => {
      const spec: FurlowSpec = {
        automod: {
          rules: [
            {
              name: 'no-spam',
              trigger: { type: 'spam' },
              actions: [{ timeout: { duration: '5m' } }] as unknown as Action[],
            },
          ],
        },
      };

      const result = normalizeSpec(spec);

      expect(result.automod!.rules[0].actions).toEqual([
        { action: 'timeout', duration: '5m' },
      ]);
    });

    it('should normalize automod escalation actions', () => {
      const spec: FurlowSpec = {
        automod: {
          rules: [
            {
              name: 'no-spam',
              trigger: { type: 'spam' },
              actions: [{ timeout: { duration: '5m' } }] as unknown as Action[],
              escalation: {
                threshold: 3,
                window: '1h',
                actions: [{ ban: { reason: 'Repeated spam' } }] as unknown as Action[],
              },
            },
          ],
        },
      };

      const result = normalizeSpec(spec);

      expect(result.automod!.rules[0].escalation!.actions).toEqual([
        { action: 'ban', reason: 'Repeated spam' },
      ]);
    });
  });

  describe('components normalization', () => {
    it('should normalize button actions', () => {
      const spec: FurlowSpec = {
        components: {
          buttons: {
            confirm: {
              type: 'button',
              label: 'Confirm',
              style: 'success',
              actions: [{ reply: { content: 'Confirmed!' } }] as unknown as Action[],
            },
          },
        },
      };

      const result = normalizeSpec(spec);

      expect(result.components!.buttons!['confirm'].actions).toEqual([
        { action: 'reply', content: 'Confirmed!' },
      ]);
    });

    it('should normalize select actions', () => {
      const spec: FurlowSpec = {
        components: {
          selects: {
            role_select: {
              type: 'role_select',
              custom_id: 'role_select',
              actions: [{ assign_role: { role: '${values[0]}' } }] as unknown as Action[],
            },
          },
        },
      };

      const result = normalizeSpec(spec);

      expect(result.components!.selects!['role_select'].actions).toEqual([
        { action: 'assign_role', role: '${values[0]}' },
      ]);
    });

    it('should normalize modal actions', () => {
      const spec: FurlowSpec = {
        components: {
          modals: {
            feedback: {
              custom_id: 'feedback',
              title: 'Feedback',
              components: [],
              actions: [{ send_message: { channel: '123', content: '${fields.message}' } }] as unknown as Action[],
            },
          },
        },
      };

      const result = normalizeSpec(spec);

      expect(result.components!.modals!['feedback'].actions).toEqual([
        { action: 'send_message', channel: '123', content: '${fields.message}' },
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle null spec gracefully', () => {
      const result = normalizeSpec(null as unknown as FurlowSpec);
      expect(result).toBeNull();
    });

    it('should handle empty spec', () => {
      const result = normalizeSpec({});
      expect(result).toEqual({});
    });

    it('should preserve non-action properties', () => {
      const spec: FurlowSpec = {
        version: '1',
        identity: { name: 'TestBot' },
        intents: { auto: true },
      };

      const result = normalizeSpec(spec);

      expect(result.version).toBe('1');
      expect(result.identity).toEqual({ name: 'TestBot' });
      expect(result.intents).toEqual({ auto: true });
    });
  });

  describe('idempotency', () => {
    it('should be idempotent - normalizing twice produces same result', () => {
      const spec: FurlowSpec = {
        commands: [
          {
            name: 'test',
            description: 'Test',
            actions: [{ reply: { content: 'test' } }] as unknown as Action[],
          },
        ],
        events: [
          {
            event: 'ready',
            actions: [{ log: { message: 'ready' } }] as unknown as Action[],
          },
        ],
      };

      const once = normalizeSpec(spec);
      const twice = normalizeSpec(once);

      expect(twice).toEqual(once);
    });
  });
});
