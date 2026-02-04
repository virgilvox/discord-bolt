/**
 * Member and role action handler tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionRegistry } from '../registry.js';
import { registerMemberHandlers } from '../handlers/member.js';
import {
  createMockEvaluator,
  createMockClient,
  createMockChannel,
  createHandlerContext,
  createMockGuild,
  createMockMember,
  createMockRole,
  createMockUser,
  createMockVoiceChannel,
  expectSuccess,
  expectFailure,
} from './test-utils.js';
import { ChannelType } from 'discord.js';
import type { ActionRegistry } from '../registry.js';
import type {
  AssignRoleAction,
  RemoveRoleAction,
  ToggleRoleAction,
  KickAction,
  BanAction,
  UnbanAction,
  TimeoutAction,
  RemoveTimeoutAction,
  SendDMAction,
  SetNicknameAction,
  MoveMemberAction,
  DisconnectMemberAction,
  ServerMuteAction,
  ServerDeafenAction,
} from '@furlow/schema';

describe('Member Handlers', () => {
  let registry: ActionRegistry;
  let mockEvaluator: ReturnType<typeof createMockEvaluator>;
  let mockClient: ReturnType<typeof createMockClient>;
  let mockGuild: ReturnType<typeof createMockGuild>;
  let mockMember: ReturnType<typeof createMockMember>;
  let mockRole: ReturnType<typeof createMockRole>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createActionRegistry();
    mockEvaluator = createMockEvaluator();
    mockClient = createMockClient();
    mockGuild = createMockGuild();
    mockMember = createMockMember();
    mockRole = createMockRole();

    mockClient.guilds.fetch = vi.fn().mockResolvedValue(mockGuild);
    mockGuild.members.fetch = vi.fn().mockResolvedValue(mockMember);
    mockGuild.roles.fetch = vi.fn().mockResolvedValue(mockRole);

    registerMemberHandlers(registry, {
      client: mockClient as any,
      evaluator: mockEvaluator as any,
    });
  });

  describe('Handler Registration', () => {
    it('should register all member handlers', () => {
      expect(registry.has('assign_role')).toBe(true);
      expect(registry.has('remove_role')).toBe(true);
      expect(registry.has('toggle_role')).toBe(true);
      expect(registry.has('kick')).toBe(true);
      expect(registry.has('ban')).toBe(true);
      expect(registry.has('unban')).toBe(true);
      expect(registry.has('timeout')).toBe(true);
      expect(registry.has('remove_timeout')).toBe(true);
      expect(registry.has('send_dm')).toBe(true);
      expect(registry.has('set_nickname')).toBe(true);
      expect(registry.has('move_member')).toBe(true);
      expect(registry.has('disconnect_member')).toBe(true);
      expect(registry.has('server_mute')).toBe(true);
      expect(registry.has('server_deafen')).toBe(true);
    });
  });

  describe('assign_role', () => {
    it('should assign a role to a member', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('assign_role');
      const action: AssignRoleAction = {
        action: 'assign_role',
        role: '444555666777888999',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.roles.add).toHaveBeenCalledWith(mockRole, undefined);
    });

    it('should assign role to specific user', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('assign_role');
      const action: AssignRoleAction = {
        action: 'assign_role',
        user: '123456789012345678',
        role: '444555666777888999',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockGuild.members.fetch).toHaveBeenCalledWith('123456789012345678');
    });

    it('should handle user mention format', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('assign_role');
      const action: AssignRoleAction = {
        action: 'assign_role',
        user: '<@123456789012345678>',
        role: '444555666777888999',
      };

      await handler.execute(action, context);
      expect(mockGuild.members.fetch).toHaveBeenCalledWith('123456789012345678');
    });

    it('should handle role mention format', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('assign_role');
      const action: AssignRoleAction = {
        action: 'assign_role',
        role: '<@&444555666777888999>',
      };

      await handler.execute(action, context);
      expect(mockGuild.roles.fetch).toHaveBeenCalledWith('444555666777888999');
    });

    it('should include reason when provided', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('assign_role');
      const action: AssignRoleAction = {
        action: 'assign_role',
        role: '444555666777888999',
        reason: 'User completed verification',
      };

      await handler.execute(action, context);
      expect(mockMember.roles.add).toHaveBeenCalledWith(mockRole, 'User completed verification');
    });

    it('should fail if member not found', async () => {
      mockGuild.members.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('assign_role');
      const action: AssignRoleAction = {
        action: 'assign_role',
        user: '123456789012345678',
        role: '444555666777888999',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Member not found');
    });

    it('should fail if role not found', async () => {
      mockGuild.roles.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('assign_role');
      const action: AssignRoleAction = {
        action: 'assign_role',
        role: '444555666777888999',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Role not found');
    });
  });

  describe('remove_role', () => {
    it('should remove a role from a member', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('remove_role');
      const action: RemoveRoleAction = {
        action: 'remove_role',
        role: '444555666777888999',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.roles.remove).toHaveBeenCalledWith(mockRole, undefined);
    });

    it('should include reason when provided', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('remove_role');
      const action: RemoveRoleAction = {
        action: 'remove_role',
        role: '444555666777888999',
        reason: 'Expired subscription',
      };

      await handler.execute(action, context);
      expect(mockMember.roles.remove).toHaveBeenCalledWith(mockRole, 'Expired subscription');
    });
  });

  describe('toggle_role', () => {
    it('should add role if member does not have it', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('toggle_role');
      const action: ToggleRoleAction = {
        action: 'toggle_role',
        role: '444555666777888999',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.roles.add).toHaveBeenCalledWith(mockRole, undefined);
    });

    it('should remove role if member has it', async () => {
      // Add role to cache to simulate member having it
      (mockMember.roles.cache as Map<string, unknown>).set(mockRole.id, mockRole);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('toggle_role');
      const action: ToggleRoleAction = {
        action: 'toggle_role',
        role: '444555666777888999',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.roles.remove).toHaveBeenCalledWith(mockRole, undefined);
    });
  });

  describe('kick', () => {
    it('should kick a member', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('kick');
      const action: KickAction = {
        action: 'kick',
        user: '123456789012345678',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.kick).toHaveBeenCalledWith(undefined);
    });

    it('should kick with reason', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('kick');
      const action: KickAction = {
        action: 'kick',
        user: '123456789012345678',
        reason: 'Rule violation',
      };

      await handler.execute(action, context);
      expect(mockMember.kick).toHaveBeenCalledWith('Rule violation');
    });

    it('should DM user before kick if configured', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('kick');
      const action: KickAction = {
        action: 'kick',
        user: '123456789012345678',
        dm_user: true,
        dm_message: 'You have been kicked from the server.',
      };

      await handler.execute(action, context);
      expect(mockMember.send).toHaveBeenCalledWith('You have been kicked from the server.');
      expect(mockMember.kick).toHaveBeenCalled();
    });

    it('should not fail if DM fails', async () => {
      mockMember.send = vi.fn().mockRejectedValue(new Error('Cannot send DM'));
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('kick');
      const action: KickAction = {
        action: 'kick',
        user: '123456789012345678',
        dm_user: true,
        dm_message: 'You have been kicked.',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.kick).toHaveBeenCalled();
    });

    it('should fail if member not found', async () => {
      mockGuild.members.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('kick');
      const action: KickAction = {
        action: 'kick',
        user: '123456789012345678',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Member not found');
    });
  });

  describe('ban', () => {
    it('should ban a user', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('ban');
      const action: BanAction = {
        action: 'ban',
        user: '123456789012345678',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockGuild.members.ban).toHaveBeenCalledWith(
        '123456789012345678',
        expect.objectContaining({ reason: undefined })
      );
    });

    it('should ban with reason', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('ban');
      const action: BanAction = {
        action: 'ban',
        user: '123456789012345678',
        reason: 'Severe rule violation',
      };

      await handler.execute(action, context);
      expect(mockGuild.members.ban).toHaveBeenCalledWith(
        '123456789012345678',
        expect.objectContaining({ reason: 'Severe rule violation' })
      );
    });

    it('should delete messages when specified', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('ban');
      const action: BanAction = {
        action: 'ban',
        user: '123456789012345678',
        delete_message_days: 7,
      };

      await handler.execute(action, context);
      expect(mockGuild.members.ban).toHaveBeenCalledWith(
        '123456789012345678',
        expect.objectContaining({
          deleteMessageSeconds: 7 * 24 * 60 * 60,
        })
      );
    });

    it('should DM user before ban if configured', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('ban');
      const action: BanAction = {
        action: 'ban',
        user: '123456789012345678',
        dm_user: true,
        dm_message: 'You have been banned.',
      };

      await handler.execute(action, context);
      expect(mockMember.send).toHaveBeenCalledWith('You have been banned.');
    });

    it('should fail if guild not found', async () => {
      mockClient.guilds.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        guildId: undefined,
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });
      (context.guild as any) = undefined;

      const handler = registry.get('ban');
      const action: BanAction = {
        action: 'ban',
        user: '123456789012345678',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Guild not found');
    });
  });

  describe('unban', () => {
    it('should unban a user', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('unban');
      const action: UnbanAction = {
        action: 'unban',
        user: '123456789012345678',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockGuild.members.unban).toHaveBeenCalledWith('123456789012345678', undefined);
    });

    it('should unban with reason', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('unban');
      const action: UnbanAction = {
        action: 'unban',
        user: '123456789012345678',
        reason: 'Appeal accepted',
      };

      await handler.execute(action, context);
      expect(mockGuild.members.unban).toHaveBeenCalledWith('123456789012345678', 'Appeal accepted');
    });

    it('should handle user mention format', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('unban');
      const action: UnbanAction = {
        action: 'unban',
        user: '<@!123456789012345678>',
      };

      await handler.execute(action, context);
      expect(mockGuild.members.unban).toHaveBeenCalledWith('123456789012345678', undefined);
    });
  });

  describe('timeout', () => {
    it('should timeout a member', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('timeout');
      const action: TimeoutAction = {
        action: 'timeout',
        user: '123456789012345678',
        duration: '5m',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.timeout).toHaveBeenCalledWith(5 * 60 * 1000, undefined);
    });

    it('should parse different duration formats', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('timeout');

      // Test seconds
      await handler.execute({
        action: 'timeout',
        user: '123',
        duration: '30s',
      }, context);
      expect(mockMember.timeout).toHaveBeenLastCalledWith(30 * 1000, undefined);

      // Test hours
      await handler.execute({
        action: 'timeout',
        user: '123',
        duration: '2h',
      }, context);
      expect(mockMember.timeout).toHaveBeenLastCalledWith(2 * 60 * 60 * 1000, undefined);

      // Test days
      await handler.execute({
        action: 'timeout',
        user: '123',
        duration: '1d',
      }, context);
      expect(mockMember.timeout).toHaveBeenLastCalledWith(24 * 60 * 60 * 1000, undefined);
    });

    it('should timeout with reason', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('timeout');
      const action: TimeoutAction = {
        action: 'timeout',
        user: '123456789012345678',
        duration: '10m',
        reason: 'Spamming',
      };

      await handler.execute(action, context);
      expect(mockMember.timeout).toHaveBeenCalledWith(10 * 60 * 1000, 'Spamming');
    });

    it('should DM user before timeout if configured', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('timeout');
      const action: TimeoutAction = {
        action: 'timeout',
        user: '123456789012345678',
        duration: '5m',
        dm_user: true,
        dm_message: 'You have been timed out.',
      };

      await handler.execute(action, context);
      expect(mockMember.send).toHaveBeenCalledWith('You have been timed out.');
    });
  });

  describe('remove_timeout', () => {
    it('should remove timeout from a member', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('remove_timeout');
      const action: RemoveTimeoutAction = {
        action: 'remove_timeout',
        user: '123456789012345678',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.timeout).toHaveBeenCalledWith(null, undefined);
    });

    it('should remove timeout with reason', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('remove_timeout');
      const action: RemoveTimeoutAction = {
        action: 'remove_timeout',
        user: '123456789012345678',
        reason: 'Good behavior',
      };

      await handler.execute(action, context);
      expect(mockMember.timeout).toHaveBeenCalledWith(null, 'Good behavior');
    });
  });

  describe('send_dm', () => {
    it('should send a DM to a user', async () => {
      const mockUser = createMockUser();
      mockClient.users.fetch = vi.fn().mockResolvedValue(mockUser);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('send_dm');
      const action: SendDMAction = {
        action: 'send_dm',
        user: '123456789012345678',
        content: 'Hello there!',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockUser.send).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello there!' }));
    });

    it('should send DM with embed', async () => {
      const mockUser = createMockUser();
      mockClient.users.fetch = vi.fn().mockResolvedValue(mockUser);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('send_dm');
      const action: SendDMAction = {
        action: 'send_dm',
        user: '123456789012345678',
        embed: {
          title: 'Welcome!',
          description: 'Thanks for joining.',
        },
      };

      await handler.execute(action, context);
      expect(mockUser.send).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) })
      );
    });

    it('should fail if user not found', async () => {
      mockClient.users.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('send_dm');
      const action: SendDMAction = {
        action: 'send_dm',
        user: '123456789012345678',
        content: 'Hello!',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'User not found');
    });

    it('should interpolate content', async () => {
      const mockUser = createMockUser();
      mockClient.users.fetch = vi.fn().mockResolvedValue(mockUser);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });
      (context as any).memberName = 'John';

      const handler = registry.get('send_dm');
      const action: SendDMAction = {
        action: 'send_dm',
        user: '123456789012345678',
        content: 'Hello ${memberName}!',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('Hello ${memberName}!', context);
    });
  });

  describe('set_nickname', () => {
    it('should set member nickname', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('set_nickname');
      const action: SetNicknameAction = {
        action: 'set_nickname',
        nickname: 'NewNick',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.setNickname).toHaveBeenCalledWith('NewNick', undefined);
    });

    it('should set nickname with reason', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('set_nickname');
      const action: SetNicknameAction = {
        action: 'set_nickname',
        nickname: 'NewNick',
        reason: 'User request',
      };

      await handler.execute(action, context);
      expect(mockMember.setNickname).toHaveBeenCalledWith('NewNick', 'User request');
    });

    it('should clear nickname when empty', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('set_nickname');
      const action: SetNicknameAction = {
        action: 'set_nickname',
        nickname: '',
      };

      await handler.execute(action, context);
      expect(mockMember.setNickname).toHaveBeenCalledWith(null, undefined);
    });

    it('should set nickname for specific user', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('set_nickname');
      const action: SetNicknameAction = {
        action: 'set_nickname',
        user: '999999999999999999',
        nickname: 'SpecificNick',
      };

      await handler.execute(action, context);
      expect(mockGuild.members.fetch).toHaveBeenCalledWith('999999999999999999');
    });
  });

  describe('move_member', () => {
    it('should move a member to a voice channel', async () => {
      const mockVoiceChannel = createMockVoiceChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockVoiceChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('move_member');
      const action: MoveMemberAction = {
        action: 'move_member',
        user: '123456789012345678',
        channel: '222333444555666777',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.voice.setChannel).toHaveBeenCalledWith(mockVoiceChannel);
    });

    it('should handle channel mention format', async () => {
      const mockVoiceChannel = createMockVoiceChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockVoiceChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('move_member');
      const action: MoveMemberAction = {
        action: 'move_member',
        user: '123456789012345678',
        channel: '<#222333444555666777>',
      };

      await handler.execute(action, context);
      expect(mockClient.channels.fetch).toHaveBeenCalledWith('222333444555666777');
    });

    it('should fail if channel is not voice', async () => {
      const mockTextChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockTextChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('move_member');
      const action: MoveMemberAction = {
        action: 'move_member',
        user: '123456789012345678',
        channel: '111222333444555666',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Voice channel not found');
    });
  });

  describe('disconnect_member', () => {
    it('should disconnect a member from voice', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('disconnect_member');
      const action: DisconnectMemberAction = {
        action: 'disconnect_member',
        user: '123456789012345678',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.voice.disconnect).toHaveBeenCalledWith(undefined);
    });

    it('should disconnect with reason', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('disconnect_member');
      const action: DisconnectMemberAction = {
        action: 'disconnect_member',
        user: '123456789012345678',
        reason: 'AFK too long',
      };

      await handler.execute(action, context);
      expect(mockMember.voice.disconnect).toHaveBeenCalledWith('AFK too long');
    });
  });

  describe('server_mute', () => {
    it('should server mute a member', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('server_mute');
      const action: ServerMuteAction = {
        action: 'server_mute',
        user: '123456789012345678',
        muted: true,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.voice.setMute).toHaveBeenCalledWith(true, undefined);
    });

    it('should unmute a member', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('server_mute');
      const action: ServerMuteAction = {
        action: 'server_mute',
        user: '123456789012345678',
        muted: false,
      };

      await handler.execute(action, context);
      expect(mockMember.voice.setMute).toHaveBeenCalledWith(false, undefined);
    });

    it('should include reason', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('server_mute');
      const action: ServerMuteAction = {
        action: 'server_mute',
        user: '123456789012345678',
        muted: true,
        reason: 'Music too loud',
      };

      await handler.execute(action, context);
      expect(mockMember.voice.setMute).toHaveBeenCalledWith(true, 'Music too loud');
    });
  });

  describe('server_deafen', () => {
    it('should server deafen a member', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('server_deafen');
      const action: ServerDeafenAction = {
        action: 'server_deafen',
        user: '123456789012345678',
        deafened: true,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMember.voice.setDeaf).toHaveBeenCalledWith(true, undefined);
    });

    it('should undeafen a member', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('server_deafen');
      const action: ServerDeafenAction = {
        action: 'server_deafen',
        user: '123456789012345678',
        deafened: false,
      };

      await handler.execute(action, context);
      expect(mockMember.voice.setDeaf).toHaveBeenCalledWith(false, undefined);
    });
  });
});
