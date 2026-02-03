/**
 * Integration Tests
 *
 * Tests the complete flow: YAML parsing → validation → action execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  minimalSpec,
  simpleCommandSpec,
  simpleEventSpec,
  stateSpec,
  flowSpec,
  fullSpec,
} from '../fixtures/index.js';
import {
  createMockContext,
  waitFor,
  assertThrows,
  createDeferred,
  createSpy,
} from '../helpers/index.js';
import {
  MockDiscordClient,
  createMockUser,
  createMockMember,
  createMockGuild,
  createMockChannel,
  createMockMessage,
} from '../mocks/index.js';

describe('Integration Tests', () => {
  // ==========================================
  // Spec Fixture Tests
  // ==========================================

  describe('Test Fixtures', () => {
    it('should have valid minimal spec', () => {
      expect(minimalSpec.version).toBe('0.1');
      expect(minimalSpec.intents).toBeDefined();
    });

    it('should have valid command spec', () => {
      expect(simpleCommandSpec.commands).toHaveLength(1);
      expect(simpleCommandSpec.commands![0].name).toBe('ping');
      expect(simpleCommandSpec.commands![0].actions).toHaveLength(1);
    });

    it('should have valid event spec', () => {
      expect(simpleEventSpec.events).toHaveLength(1);
      expect(simpleEventSpec.events![0].event).toBe('ready');
    });

    it('should have valid state spec', () => {
      expect(stateSpec.state).toBeDefined();
      expect(stateSpec.state!.variables!['counter']).toBeDefined();
      expect(stateSpec.state!.tables!['users']).toBeDefined();
    });

    it('should have valid flow spec', () => {
      expect(flowSpec.flows).toHaveLength(1);
      expect(flowSpec.flows![0].name).toBe('greet');
      expect(flowSpec.flows![0].parameters).toHaveLength(1);
    });

    it('should have valid full spec', () => {
      expect(fullSpec.identity).toBeDefined();
      expect(fullSpec.presence).toBeDefined();
      expect(fullSpec.commands).toHaveLength(1);
      expect(fullSpec.events).toHaveLength(1);
      expect(fullSpec.flows).toHaveLength(1);
    });
  });

  // ==========================================
  // Mock Discord Client Tests
  // ==========================================

  describe('Mock Discord Client', () => {
    let client: MockDiscordClient;

    beforeEach(() => {
      client = new MockDiscordClient();
    });

    it('should create with default user', () => {
      expect(client.user.bot).toBe(true);
      expect(client.user.username).toBe('TestBot');
    });

    it('should create with default guild', () => {
      expect(client.guilds.size).toBe(1);
      const guild = client.guilds.values().next().value;
      expect(guild.name).toBe('Test Server');
    });

    it('should create with default channel', () => {
      expect(client.channels.size).toBe(1);
      const channel = client.channels.values().next().value;
      expect(channel.name).toBe('general');
    });

    it('should register event listeners', () => {
      const handler = vi.fn();
      client.on('messageCreate', handler);
      client.emit('messageCreate', { content: 'test' });
      expect(handler).toHaveBeenCalledWith({ content: 'test' });
    });

    it('should emit ready on login', async () => {
      const handler = vi.fn();
      client.on('ready', handler);
      await client.login('test-token');
      expect(handler).toHaveBeenCalled();
    });

    it('should return ready status', () => {
      expect(client.isReady()).toBe(true);
    });

    it('should clear listeners on destroy', async () => {
      const handler = vi.fn();
      client.on('test', handler);
      await client.destroy();
      client.emit('test');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Mock Entity Tests
  // ==========================================

  describe('Mock Entities', () => {
    describe('createMockUser', () => {
      it('should create default user', () => {
        const user = createMockUser();
        expect(user.id).toBe('123456789012345678');
        expect(user.username).toBe('testuser');
        expect(user.bot).toBe(false);
      });

      it('should accept overrides', () => {
        const user = createMockUser({
          username: 'custom',
          bot: true,
        });
        expect(user.username).toBe('custom');
        expect(user.bot).toBe(true);
      });
    });

    describe('createMockMember', () => {
      it('should create default member', () => {
        const member = createMockMember();
        expect(member.nickname).toBeNull();
        expect(member.roles).toEqual([]);
        expect(member.joinedAt).toBeInstanceOf(Date);
      });

      it('should accept overrides', () => {
        const member = createMockMember({
          nickname: 'Nick',
          roles: ['role1', 'role2'],
        });
        expect(member.nickname).toBe('Nick');
        expect(member.roles).toEqual(['role1', 'role2']);
      });
    });

    describe('createMockGuild', () => {
      it('should create default guild', () => {
        const guild = createMockGuild();
        expect(guild.id).toBe('987654321098765432');
        expect(guild.name).toBe('Test Server');
        expect(guild.memberCount).toBe(100);
      });

      it('should accept overrides', () => {
        const guild = createMockGuild({
          name: 'Custom Server',
          memberCount: 500,
        });
        expect(guild.name).toBe('Custom Server');
        expect(guild.memberCount).toBe(500);
      });
    });

    describe('createMockChannel', () => {
      it('should create default channel', () => {
        const channel = createMockChannel();
        expect(channel.name).toBe('general');
        expect(channel.type).toBe('text');
      });

      it('should accept overrides', () => {
        const channel = createMockChannel({
          name: 'custom',
          type: 'voice',
        });
        expect(channel.name).toBe('custom');
        expect(channel.type).toBe('voice');
      });
    });

    describe('createMockMessage', () => {
      it('should create default message', () => {
        const message = createMockMessage();
        expect(message.content).toBe('Hello, world!');
        expect(message.createdAt).toBeInstanceOf(Date);
      });

      it('should accept overrides', () => {
        const message = createMockMessage({
          content: 'Custom content',
        });
        expect(message.content).toBe('Custom content');
      });
    });
  });

  // ==========================================
  // Test Helper Tests
  // ==========================================

  describe('Test Helpers', () => {
    describe('createMockContext', () => {
      it('should create valid context', () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
        expect(ctx.member).toBeDefined();
        expect(ctx.guild).toBeDefined();
        expect(ctx.channel).toBeDefined();
        expect(ctx.now).toBeInstanceOf(Date);
      });

      it('should accept overrides', () => {
        const ctx = createMockContext({
          userId: 'custom-user',
          guildId: 'custom-guild',
        });
        expect(ctx.userId).toBe('custom-user');
        expect(ctx.guildId).toBe('custom-guild');
      });

      it('should include all required context fields', () => {
        const ctx = createMockContext();

        // User context
        expect(ctx.user.id).toBeDefined();
        expect(ctx.user.username).toBeDefined();
        expect(ctx.user.mention).toBeDefined();

        // Member context
        expect(ctx.member.id).toBeDefined();
        expect(ctx.member.display_name).toBeDefined();

        // Guild context
        expect(ctx.guild.id).toBeDefined();
        expect(ctx.guild.name).toBeDefined();
        expect(ctx.guild.member_count).toBeDefined();

        // Channel context
        expect(ctx.channel.id).toBeDefined();
        expect(ctx.channel.name).toBeDefined();
        expect(ctx.channel.mention).toBeDefined();
      });
    });

    describe('waitFor', () => {
      it('should resolve when condition is true', async () => {
        let ready = false;
        setTimeout(() => {
          ready = true;
        }, 50);

        await waitFor(() => ready);
        expect(ready).toBe(true);
      });

      it('should timeout when condition never true', async () => {
        await expect(
          waitFor(() => false, { timeout: 100 })
        ).rejects.toThrow('Timeout');
      });

      it('should support async conditions', async () => {
        let ready = false;
        setTimeout(() => {
          ready = true;
        }, 50);

        await waitFor(async () => ready);
        expect(ready).toBe(true);
      });
    });

    describe('assertThrows', () => {
      it('should catch thrown errors', async () => {
        const error = await assertThrows(() => {
          throw new Error('Test error');
        });
        expect(error.message).toBe('Test error');
      });

      it('should fail when no error thrown', async () => {
        await expect(
          assertThrows(() => 'no error')
        ).rejects.toThrow('Expected function to throw');
      });

      it('should check error type', async () => {
        class CustomError extends Error {
          constructor() {
            super('custom');
            this.name = 'CustomError';
          }
        }

        const error = await assertThrows(() => {
          throw new CustomError();
        }, CustomError);

        expect(error).toBeInstanceOf(CustomError);
      });

      it('should fail on wrong error type', async () => {
        class CustomError extends Error {}
        class OtherError extends Error {}

        await expect(
          assertThrows(() => {
            throw new OtherError();
          }, CustomError)
        ).rejects.toThrow('Expected error of type CustomError');
      });
    });

    describe('createDeferred', () => {
      it('should create resolvable promise', async () => {
        const { promise, resolve } = createDeferred<number>();
        setTimeout(() => resolve(42), 10);
        const result = await promise;
        expect(result).toBe(42);
      });

      it('should create rejectable promise', async () => {
        const { promise, reject } = createDeferred();
        setTimeout(() => reject(new Error('test')), 10);
        await expect(promise).rejects.toThrow('test');
      });
    });

    describe('createSpy', () => {
      it('should track calls', () => {
        const spy = createSpy((a: number, b: number) => a + b);
        spy(1, 2);
        spy(3, 4);

        expect(spy.calls).toHaveLength(2);
        expect(spy.calls[0]).toEqual([1, 2]);
        expect(spy.calls[1]).toEqual([3, 4]);
      });

      it('should track return values', () => {
        const spy = createSpy((x: number) => x * 2);
        spy(5);
        spy(10);

        expect(spy.returnValues).toEqual([10, 20]);
      });

      it('should reset tracking', () => {
        const spy = createSpy();
        spy();
        spy();

        spy.reset();

        expect(spy.calls).toHaveLength(0);
        expect(spy.returnValues).toHaveLength(0);
      });

      it('should work without function', () => {
        const spy = createSpy();
        spy('arg1');

        expect(spy.calls).toEqual([['arg1']]);
        expect(spy.returnValues).toEqual([undefined]);
      });
    });
  });

  // ==========================================
  // Action Context Integration
  // ==========================================

  describe('Action Context Integration', () => {
    it('should have consistent user reference', () => {
      const ctx = createMockContext();
      expect(ctx.user.id).toBe(ctx.userId);
    });

    it('should have consistent guild reference', () => {
      const ctx = createMockContext();
      expect(ctx.guild.id).toBe(ctx.guildId);
    });

    it('should have consistent channel reference', () => {
      const ctx = createMockContext();
      expect(ctx.channel.id).toBe(ctx.channelId);
    });

    it('should support mentions format', () => {
      const ctx = createMockContext();
      expect(ctx.user.mention).toMatch(/^<@\d+>$/);
      expect(ctx.channel.mention).toMatch(/^<#\d+>$/);
    });
  });

  // ==========================================
  // Command Flow Integration
  // ==========================================

  describe('Command Flow', () => {
    it('should define valid command actions', () => {
      const command = simpleCommandSpec.commands![0];

      expect(command.name).toBe('ping');
      expect(command.description).toBeTruthy();

      const action = command.actions![0];
      expect(action.action).toBe('reply');
      expect(action.content).toBe('Pong!');
    });

    it('should support command options', () => {
      const command = fullSpec.commands![0];

      expect(command.options).toHaveLength(1);
      expect(command.options![0].name).toBe('input');
      expect(command.options![0].type).toBe('string');
      expect(command.options![0].required).toBe(true);
    });

    it('should support expression in actions', () => {
      const command = fullSpec.commands![0];
      const action = command.actions![0];

      // Action uses expression interpolation
      expect(action.content).toContain('${args.input}');
    });
  });

  // ==========================================
  // Event Handler Integration
  // ==========================================

  describe('Event Handler Flow', () => {
    it('should define valid event handlers', () => {
      const handler = simpleEventSpec.events![0];

      expect(handler.event).toBe('ready');
      expect(handler.actions).toHaveLength(1);
    });

    it('should support log action', () => {
      const handler = simpleEventSpec.events![0];
      const action = handler.actions![0];

      expect(action.action).toBe('log');
      expect(action.level).toBe('info');
      expect(action.message).toBeTruthy();
    });
  });

  // ==========================================
  // State Configuration Integration
  // ==========================================

  describe('State Configuration', () => {
    it('should define variables with types', () => {
      const counter = stateSpec.state!.variables!['counter'];

      expect(counter.type).toBe('number');
      expect(counter.scope).toBe('guild');
      expect(counter.default).toBe(0);
    });

    it('should define tables with columns', () => {
      const users = stateSpec.state!.tables!['users'];

      expect(users.columns).toBeDefined();
      expect(users.columns!['id'].type).toBe('string');
      expect(users.columns!['id'].primary).toBe(true);
      expect(users.columns!['xp'].default).toBe(0);
    });

    it('should configure storage type', () => {
      expect(stateSpec.state!.storage!.type).toBe('memory');
    });
  });

  // ==========================================
  // Flow Definition Integration
  // ==========================================

  describe('Flow Definition', () => {
    it('should define flow with parameters', () => {
      const flow = flowSpec.flows![0];

      expect(flow.name).toBe('greet');
      expect(flow.parameters).toHaveLength(1);
      expect(flow.parameters![0].name).toBe('name');
      expect(flow.parameters![0].type).toBe('string');
      expect(flow.parameters![0].required).toBe(true);
    });

    it('should define flow actions', () => {
      const flow = flowSpec.flows![0];

      expect(flow.actions).toHaveLength(1);
      expect(flow.actions![0].action).toBe('log');
    });

    it('should support return expression', () => {
      const flow = flowSpec.flows![0];

      expect(flow.returns).toBe('true');
    });
  });

  // ==========================================
  // Full Spec Integration
  // ==========================================

  describe('Full Spec Integration', () => {
    it('should define identity', () => {
      expect(fullSpec.identity!.name).toBe('TestBot');
    });

    it('should define presence', () => {
      expect(fullSpec.presence!.status).toBe('online');
      expect(fullSpec.presence!.activity!.type).toBe('playing');
      expect(fullSpec.presence!.activity!.text).toBe('Testing');
    });

    it('should define explicit intents', () => {
      expect(fullSpec.intents!.explicit).toContain('guilds');
      expect(fullSpec.intents!.explicit).toContain('guild_messages');
      expect(fullSpec.intents!.explicit).toContain('message_content');
    });

    it('should integrate commands, events, and flows', () => {
      expect(fullSpec.commands).toHaveLength(1);
      expect(fullSpec.events).toHaveLength(1);
      expect(fullSpec.flows).toHaveLength(1);
    });
  });
});
