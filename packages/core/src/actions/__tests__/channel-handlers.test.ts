/**
 * Channel and role action handler tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionRegistry } from '../registry.js';
import { registerChannelHandlers } from '../handlers/channel.js';
import {
  createMockEvaluator,
  createMockClient,
  createHandlerContext,
  createMockGuild,
  createMockChannel,
  createMockRole,
  createMockThread,
  expectSuccess,
  expectFailure,
} from './test-utils.js';
import { ChannelType } from 'discord.js';
import type { ActionRegistry } from '../registry.js';
import type {
  CreateChannelAction,
  EditChannelAction,
  DeleteChannelAction,
  CreateThreadAction,
  ArchiveThreadAction,
  SetChannelPermissionsAction,
  CreateRoleAction,
  EditRoleAction,
  DeleteRoleAction,
} from '@furlow/schema';

describe('Channel Handlers', () => {
  let registry: ActionRegistry;
  let mockEvaluator: ReturnType<typeof createMockEvaluator>;
  let mockClient: ReturnType<typeof createMockClient>;
  let mockGuild: ReturnType<typeof createMockGuild>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createActionRegistry();
    mockEvaluator = createMockEvaluator();
    mockClient = createMockClient();
    mockGuild = createMockGuild();

    mockClient.guilds.fetch = vi.fn().mockResolvedValue(mockGuild);

    registerChannelHandlers(registry, {
      client: mockClient as any,
      evaluator: mockEvaluator as any,
    });
  });

  describe('Handler Registration', () => {
    it('should register all channel handlers', () => {
      expect(registry.has('create_channel')).toBe(true);
      expect(registry.has('edit_channel')).toBe(true);
      expect(registry.has('delete_channel')).toBe(true);
      expect(registry.has('create_thread')).toBe(true);
      expect(registry.has('archive_thread')).toBe(true);
      expect(registry.has('set_channel_permissions')).toBe(true);
      expect(registry.has('create_role')).toBe(true);
      expect(registry.has('edit_role')).toBe(true);
      expect(registry.has('delete_role')).toBe(true);
    });
  });

  describe('create_channel', () => {
    it('should create a text channel', async () => {
      const newChannel = createMockChannel({ id: 'new-channel-123' });
      mockGuild.channels.create = vi.fn().mockResolvedValue(newChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_channel');
      const action: CreateChannelAction = {
        action: 'create_channel',
        name: 'new-channel',
        type: 'text',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockGuild.channels.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'new-channel',
          type: ChannelType.GuildText,
        })
      );
    });

    it('should create a voice channel', async () => {
      const newChannel = createMockChannel({ id: 'voice-123', type: ChannelType.GuildVoice });
      mockGuild.channels.create = vi.fn().mockResolvedValue(newChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_channel');
      const action: CreateChannelAction = {
        action: 'create_channel',
        name: 'Voice Chat',
        type: 'voice',
        bitrate: 128000,
        user_limit: 10,
      };

      await handler.execute(action, context);
      expect(mockGuild.channels.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Voice Chat',
          type: ChannelType.GuildVoice,
          bitrate: 128000,
          userLimit: 10,
        })
      );
    });

    it('should create a category', async () => {
      const newChannel = createMockChannel({ type: ChannelType.GuildCategory });
      mockGuild.channels.create = vi.fn().mockResolvedValue(newChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_channel');
      const action: CreateChannelAction = {
        action: 'create_channel',
        name: 'My Category',
        type: 'category',
      };

      await handler.execute(action, context);
      expect(mockGuild.channels.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChannelType.GuildCategory,
        })
      );
    });

    it('should set channel topic', async () => {
      mockGuild.channels.create = vi.fn().mockResolvedValue(createMockChannel());
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_channel');
      const action: CreateChannelAction = {
        action: 'create_channel',
        name: 'announcements',
        type: 'text',
        topic: 'Server announcements here!',
      };

      await handler.execute(action, context);
      expect(mockGuild.channels.create).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'Server announcements here!',
        })
      );
    });

    it('should set parent category', async () => {
      mockGuild.channels.create = vi.fn().mockResolvedValue(createMockChannel());
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_channel');
      const action: CreateChannelAction = {
        action: 'create_channel',
        name: 'sub-channel',
        type: 'text',
        parent: '999888777666555444',
      };

      await handler.execute(action, context);
      expect(mockGuild.channels.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: '999888777666555444',
        })
      );
    });

    it('should handle NSFW flag', async () => {
      mockGuild.channels.create = vi.fn().mockResolvedValue(createMockChannel());
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_channel');
      const action: CreateChannelAction = {
        action: 'create_channel',
        name: 'nsfw-channel',
        type: 'text',
        nsfw: true,
      };

      await handler.execute(action, context);
      expect(mockGuild.channels.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nsfw: true,
        })
      );
    });

    it('should set rate limit', async () => {
      mockGuild.channels.create = vi.fn().mockResolvedValue(createMockChannel());
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_channel');
      const action: CreateChannelAction = {
        action: 'create_channel',
        name: 'slow-chat',
        type: 'text',
        rate_limit: 30,
      };

      await handler.execute(action, context);
      expect(mockGuild.channels.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rateLimitPerUser: 30,
        })
      );
    });

    it('should store result with as', async () => {
      const newChannel = createMockChannel({ id: 'created-channel' });
      mockGuild.channels.create = vi.fn().mockResolvedValue(newChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_channel');
      const action: CreateChannelAction = {
        action: 'create_channel',
        name: 'test',
        type: 'text',
        as: 'newChannel',
      };

      await handler.execute(action, context);
      expect((context as any).newChannel).toBe(newChannel);
    });

    it('should fail if guild not found', async () => {
      mockClient.guilds.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        guildId: undefined,
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });
      (context.guild as any) = undefined;

      const handler = registry.get('create_channel');
      const action: CreateChannelAction = {
        action: 'create_channel',
        name: 'test',
        type: 'text',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Guild not found');
    });

    it('should interpolate channel name', async () => {
      mockGuild.channels.create = vi.fn().mockResolvedValue(createMockChannel());
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });
      (context as any).userName = 'alice';

      const handler = registry.get('create_channel');
      const action: CreateChannelAction = {
        action: 'create_channel',
        name: '${userName}-channel',
        type: 'text',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('${userName}-channel', context);
    });
  });

  describe('edit_channel', () => {
    it('should edit a channel', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('edit_channel');
      const action: EditChannelAction = {
        action: 'edit_channel',
        channel: '111222333444555666',
        name: 'renamed-channel',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockChannel.edit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'renamed-channel' })
      );
    });

    it('should edit multiple properties', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('edit_channel');
      const action: EditChannelAction = {
        action: 'edit_channel',
        channel: '111222333444555666',
        name: 'new-name',
        topic: 'New topic',
        nsfw: true,
        rate_limit: 10,
      };

      await handler.execute(action, context);
      expect(mockChannel.edit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'new-name',
          topic: 'New topic',
          nsfw: true,
          rateLimitPerUser: 10,
        })
      );
    });

    it('should fail if channel not found', async () => {
      mockClient.channels.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('edit_channel');
      const action: EditChannelAction = {
        action: 'edit_channel',
        channel: '123',
        name: 'test',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Channel not found');
    });

    it('should handle channel mention format', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('edit_channel');
      const action: EditChannelAction = {
        action: 'edit_channel',
        channel: '<#111222333444555666>',
        name: 'test',
      };

      await handler.execute(action, context);
      expect(mockClient.channels.fetch).toHaveBeenCalledWith('111222333444555666');
    });
  });

  describe('delete_channel', () => {
    it('should delete a channel', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('delete_channel');
      const action: DeleteChannelAction = {
        action: 'delete_channel',
        channel: '111222333444555666',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockChannel.delete).toHaveBeenCalledWith(undefined);
    });

    it('should delete with reason', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('delete_channel');
      const action: DeleteChannelAction = {
        action: 'delete_channel',
        channel: '111222333444555666',
        reason: 'No longer needed',
      };

      await handler.execute(action, context);
      expect(mockChannel.delete).toHaveBeenCalledWith('No longer needed');
    });

    it('should fail if channel not found', async () => {
      mockClient.channels.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('delete_channel');
      const action: DeleteChannelAction = {
        action: 'delete_channel',
        channel: '123',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Channel not found');
    });
  });

  describe('create_thread', () => {
    it('should create a thread', async () => {
      const mockChannel = createMockChannel();
      const mockThread = createMockThread();
      mockChannel.threads.create = vi.fn().mockResolvedValue(mockThread);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_thread');
      const action: CreateThreadAction = {
        action: 'create_thread',
        name: 'Discussion Thread',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockChannel.threads.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Discussion Thread',
          type: ChannelType.PublicThread,
        })
      );
    });

    it('should create a private thread', async () => {
      const mockChannel = createMockChannel();
      mockChannel.threads.create = vi.fn().mockResolvedValue(createMockThread());
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_thread');
      const action: CreateThreadAction = {
        action: 'create_thread',
        name: 'Private Thread',
        type: 'private',
      };

      await handler.execute(action, context);
      expect(mockChannel.threads.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChannelType.PrivateThread,
        })
      );
    });

    it('should create thread from message', async () => {
      const mockMessage = { id: 'msg-123', startThread: vi.fn().mockResolvedValue(createMockThread()) };
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_thread');
      const action: CreateThreadAction = {
        action: 'create_thread',
        name: 'Thread from Message',
        message: 'msg-123',
      };

      await handler.execute(action, context);
      expect(mockMessage.startThread).toHaveBeenCalled();
    });

    it('should set auto archive duration', async () => {
      const mockChannel = createMockChannel();
      mockChannel.threads.create = vi.fn().mockResolvedValue(createMockThread());
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_thread');
      const action: CreateThreadAction = {
        action: 'create_thread',
        name: 'Thread',
        auto_archive_duration: 60,
      };

      await handler.execute(action, context);
      expect(mockChannel.threads.create).toHaveBeenCalledWith(
        expect.objectContaining({
          autoArchiveDuration: 60,
        })
      );
    });

    it('should fail if channel not found', async () => {
      mockClient.channels.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        channelId: undefined,
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });
      (context.channel as any) = undefined;

      const handler = registry.get('create_thread');
      const action: CreateThreadAction = {
        action: 'create_thread',
        name: 'Thread',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Channel not found');
    });
  });

  describe('archive_thread', () => {
    it('should archive a thread', async () => {
      const mockThread = createMockThread();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockThread);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('archive_thread');
      const action: ArchiveThreadAction = {
        action: 'archive_thread',
        thread: 'thread-123',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockThread.setArchived).toHaveBeenCalledWith(true);
    });

    it('should archive and lock a thread', async () => {
      const mockThread = createMockThread();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockThread);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('archive_thread');
      const action: ArchiveThreadAction = {
        action: 'archive_thread',
        thread: 'thread-123',
        locked: true,
      };

      await handler.execute(action, context);
      expect(mockThread.setArchived).toHaveBeenCalledWith(true);
      expect(mockThread.setLocked).toHaveBeenCalledWith(true);
    });

    it('should fail if thread not found', async () => {
      mockClient.channels.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('archive_thread');
      const action: ArchiveThreadAction = {
        action: 'archive_thread',
        thread: 'invalid',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Thread not found');
    });
  });

  describe('set_channel_permissions', () => {
    it('should set permissions for a user', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('set_channel_permissions');
      const action: SetChannelPermissionsAction = {
        action: 'set_channel_permissions',
        channel: '111222333444555666',
        user: '123456789012345678',
        allow: ['SendMessages', 'ViewChannel'],
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockChannel.permissionOverwrites.edit).toHaveBeenCalled();
    });

    it('should set permissions for a role', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('set_channel_permissions');
      const action: SetChannelPermissionsAction = {
        action: 'set_channel_permissions',
        channel: '111222333444555666',
        role: '444555666777888999',
        deny: ['SendMessages'],
      };

      await handler.execute(action, context);
      expect(mockChannel.permissionOverwrites.edit).toHaveBeenCalled();
    });

    it('should fail without user or role', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('set_channel_permissions');
      const action = {
        action: 'set_channel_permissions',
        channel: '111222333444555666',
        allow: ['SendMessages'],
      } as SetChannelPermissionsAction;

      const result = await handler.execute(action, context);
      expectFailure(result, 'Either user or role is required');
    });

    it('should fail if channel not found', async () => {
      mockClient.channels.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('set_channel_permissions');
      const action: SetChannelPermissionsAction = {
        action: 'set_channel_permissions',
        channel: '123',
        user: '456',
        allow: ['SendMessages'],
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Channel not found');
    });
  });

  describe('create_role', () => {
    it('should create a role', async () => {
      const newRole = createMockRole({ id: 'new-role-123' });
      mockGuild.roles.create = vi.fn().mockResolvedValue(newRole);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_role');
      const action: CreateRoleAction = {
        action: 'create_role',
        name: 'New Role',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockGuild.roles.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Role' })
      );
    });

    it('should create role with color', async () => {
      mockGuild.roles.create = vi.fn().mockResolvedValue(createMockRole());
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_role');
      const action: CreateRoleAction = {
        action: 'create_role',
        name: 'Colored Role',
        color: 0xFF0000,
      };

      await handler.execute(action, context);
      expect(mockGuild.roles.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 0xFF0000 })
      );
    });

    it('should create role with hoist and mentionable', async () => {
      mockGuild.roles.create = vi.fn().mockResolvedValue(createMockRole());
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_role');
      const action: CreateRoleAction = {
        action: 'create_role',
        name: 'Special Role',
        hoist: true,
        mentionable: true,
      };

      await handler.execute(action, context);
      expect(mockGuild.roles.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hoist: true,
          mentionable: true,
        })
      );
    });

    it('should create role with permissions', async () => {
      mockGuild.roles.create = vi.fn().mockResolvedValue(createMockRole());
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('create_role');
      const action: CreateRoleAction = {
        action: 'create_role',
        name: 'Mod Role',
        permissions: ['KickMembers', 'BanMembers', 'ManageMessages'],
      };

      await handler.execute(action, context);
      expect(mockGuild.roles.create).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: expect.anything(),
        })
      );
    });

    it('should fail if guild not found', async () => {
      mockClient.guilds.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        guildId: undefined,
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });
      (context.guild as any) = undefined;

      const handler = registry.get('create_role');
      const action: CreateRoleAction = {
        action: 'create_role',
        name: 'Test',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Guild not found');
    });
  });

  describe('edit_role', () => {
    it('should edit a role', async () => {
      const mockRole = createMockRole();
      mockGuild.roles.fetch = vi.fn().mockResolvedValue(mockRole);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('edit_role');
      const action: EditRoleAction = {
        action: 'edit_role',
        role: '444555666777888999',
        name: 'Renamed Role',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockRole.edit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Renamed Role' })
      );
    });

    it('should edit multiple properties', async () => {
      const mockRole = createMockRole();
      mockGuild.roles.fetch = vi.fn().mockResolvedValue(mockRole);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('edit_role');
      const action: EditRoleAction = {
        action: 'edit_role',
        role: '444555666777888999',
        name: 'Updated',
        color: 0x00FF00,
        hoist: true,
        mentionable: false,
      };

      await handler.execute(action, context);
      expect(mockRole.edit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated',
          color: 0x00FF00,
          hoist: true,
          mentionable: false,
        })
      );
    });

    it('should fail if role not found', async () => {
      mockGuild.roles.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('edit_role');
      const action: EditRoleAction = {
        action: 'edit_role',
        role: '123',
        name: 'Test',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Role not found');
    });
  });

  describe('delete_role', () => {
    it('should delete a role', async () => {
      const mockRole = createMockRole();
      mockGuild.roles.fetch = vi.fn().mockResolvedValue(mockRole);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('delete_role');
      const action: DeleteRoleAction = {
        action: 'delete_role',
        role: '444555666777888999',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockRole.delete).toHaveBeenCalledWith(undefined);
    });

    it('should delete with reason', async () => {
      const mockRole = createMockRole();
      mockGuild.roles.fetch = vi.fn().mockResolvedValue(mockRole);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('delete_role');
      const action: DeleteRoleAction = {
        action: 'delete_role',
        role: '444555666777888999',
        reason: 'Role cleanup',
      };

      await handler.execute(action, context);
      expect(mockRole.delete).toHaveBeenCalledWith('Role cleanup');
    });

    it('should fail if role not found', async () => {
      mockGuild.roles.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('delete_role');
      const action: DeleteRoleAction = {
        action: 'delete_role',
        role: '123',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Role not found');
    });

    it('should handle role mention format', async () => {
      const mockRole = createMockRole();
      mockGuild.roles.fetch = vi.fn().mockResolvedValue(mockRole);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('delete_role');
      const action: DeleteRoleAction = {
        action: 'delete_role',
        role: '<@&444555666777888999>',
      };

      await handler.execute(action, context);
      expect(mockGuild.roles.fetch).toHaveBeenCalledWith('444555666777888999');
    });
  });
});
