/**
 * Message action handler tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionRegistry } from '../registry.js';
import { registerMessageHandlers } from '../handlers/message.js';
import {
  createMockEvaluator,
  createMockClient,
  createHandlerContext,
  createInteractionContext,
  createMockChannel,
  createMockMessage,
  expectSuccess,
  expectFailure,
} from './test-utils.js';
import { ChannelType } from 'discord.js';
import type { ActionRegistry } from '../registry.js';
import type {
  ReplyAction,
  SendMessageAction,
  EditMessageAction,
  DeleteMessageAction,
  DeferAction,
  UpdateMessageAction,
  AddReactionAction,
  AddReactionsAction,
  RemoveReactionAction,
  ClearReactionsAction,
  BulkDeleteAction,
} from '@furlow/schema';

describe('Message Handlers', () => {
  let registry: ActionRegistry;
  let mockEvaluator: ReturnType<typeof createMockEvaluator>;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createActionRegistry();
    mockEvaluator = createMockEvaluator();
    mockClient = createMockClient();
    registerMessageHandlers(registry, {
      client: mockClient as any,
      evaluator: mockEvaluator as any,
    });
  });

  describe('Handler Registration', () => {
    it('should register all message handlers', () => {
      expect(registry.has('reply')).toBe(true);
      expect(registry.has('send_message')).toBe(true);
      expect(registry.has('edit_message')).toBe(true);
      expect(registry.has('delete_message')).toBe(true);
      expect(registry.has('defer')).toBe(true);
      expect(registry.has('update_message')).toBe(true);
      expect(registry.has('add_reaction')).toBe(true);
      expect(registry.has('add_reactions')).toBe(true);
      expect(registry.has('remove_reaction')).toBe(true);
      expect(registry.has('clear_reactions')).toBe(true);
      expect(registry.has('bulk_delete')).toBe(true);
    });
  });

  describe('reply', () => {
    it('should reply to an interaction', async () => {
      const context = createInteractionContext();
      const handler = registry.get('reply');
      const action: ReplyAction = {
        action: 'reply',
        content: 'Hello!',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect((context.interaction as any).reply).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Hello!', fetchReply: true })
      );
    });

    it('should send followUp if already replied', async () => {
      const context = createInteractionContext();
      (context.interaction as any).replied = true;
      const handler = registry.get('reply');
      const action: ReplyAction = {
        action: 'reply',
        content: 'Follow up!',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect((context.interaction as any).followUp).toHaveBeenCalled();
    });

    it('should send followUp if deferred', async () => {
      const context = createInteractionContext();
      (context.interaction as any).deferred = true;
      const handler = registry.get('reply');
      const action: ReplyAction = {
        action: 'reply',
        content: 'After defer!',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect((context.interaction as any).followUp).toHaveBeenCalled();
    });

    it('should fail without interaction', async () => {
      const context = createHandlerContext();
      const handler = registry.get('reply');
      const action: ReplyAction = {
        action: 'reply',
        content: 'Hello!',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'No interaction');
    });

    it('should interpolate content', async () => {
      const context = createInteractionContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });
      (context as any).username = 'TestUser';
      const handler = registry.get('reply');
      const action: ReplyAction = {
        action: 'reply',
        content: 'Hello, ${username}!',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('Hello, ${username}!', context);
    });

    it('should handle ephemeral replies', async () => {
      const context = createInteractionContext();
      const handler = registry.get('reply');
      const action: ReplyAction = {
        action: 'reply',
        content: 'Secret!',
        ephemeral: true,
      };

      await handler.execute(action, context);
      expect((context.interaction as any).reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true })
      );
    });

    it('should handle embeds', async () => {
      const context = createInteractionContext();
      const handler = registry.get('reply');
      const action: ReplyAction = {
        action: 'reply',
        embed: {
          title: 'Test Embed',
          description: 'Test description',
        },
      };

      await handler.execute(action, context);
      expect((context.interaction as any).reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [expect.objectContaining({ title: 'Test Embed' })],
        })
      );
    });

    it('should handle multiple embeds', async () => {
      const context = createInteractionContext();
      const handler = registry.get('reply');
      const action: ReplyAction = {
        action: 'reply',
        embeds: [
          { title: 'Embed 1' },
          { title: 'Embed 2' },
        ],
      };

      await handler.execute(action, context);
      expect((context.interaction as any).reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({ title: 'Embed 1' }),
            expect.objectContaining({ title: 'Embed 2' }),
          ]),
        })
      );
    });

    it('should handle components', async () => {
      const context = createInteractionContext();
      const handler = registry.get('reply');
      const action: ReplyAction = {
        action: 'reply',
        content: 'Click me!',
        components: [
          {
            type: 1,
            components: [
              { type: 2, style: 1, label: 'Button', custom_id: 'btn_1' },
            ],
          },
        ],
      };

      await handler.execute(action, context);
      expect((context.interaction as any).reply).toHaveBeenCalledWith(
        expect.objectContaining({ components: expect.any(Array) })
      );
    });
  });

  describe('send_message', () => {
    it('should send a message to the context channel', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('send_message');
      const action: SendMessageAction = {
        action: 'send_message',
        content: 'Hello!',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockChannel.send).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello!' }));
    });

    it('should send to a specific channel', async () => {
      const mockChannel = createMockChannel({ id: '999999999999999999' });
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('send_message');
      const action: SendMessageAction = {
        action: 'send_message',
        channel: '999999999999999999',
        content: 'Hello specific channel!',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockClient.channels.fetch).toHaveBeenCalledWith('999999999999999999');
    });

    it('should handle channel mentions', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('send_message');
      const action: SendMessageAction = {
        action: 'send_message',
        channel: '<#111222333444555666>',
        content: 'Hello!',
      };

      await handler.execute(action, context);
      expect(mockClient.channels.fetch).toHaveBeenCalledWith('111222333444555666');
    });

    it('should fail if channel not found', async () => {
      mockClient.channels.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('send_message');
      const action: SendMessageAction = {
        action: 'send_message',
        content: 'Hello!',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Channel not found');
    });

    it('should store result in variable with as', async () => {
      const mockChannel = createMockChannel();
      const mockMessage = createMockMessage({ id: 'sent-message-123' });
      mockChannel.send = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('send_message');
      const action: SendMessageAction = {
        action: 'send_message',
        content: 'Hello!',
        as: 'sentMessage',
      };

      await handler.execute(action, context);
      expect((context as any).sentMessage).toBe(mockMessage);
    });

    it('should handle files', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('send_message');
      const action: SendMessageAction = {
        action: 'send_message',
        content: 'Check this file!',
        files: ['https://example.com/image.png'],
      };

      await handler.execute(action, context);
      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({ files: expect.any(Array) })
      );
    });
  });

  describe('edit_message', () => {
    it('should edit a message', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('edit_message');
      const action: EditMessageAction = {
        action: 'edit_message',
        message: '999888777666555444',
        content: 'Edited content!',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMessage.edit).toHaveBeenCalledWith(expect.objectContaining({ content: 'Edited content!' }));
    });

    it('should use message_id alias', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('edit_message');
      const action: EditMessageAction = {
        action: 'edit_message',
        message_id: '999888777666555444',
        content: 'Edited!',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
    });

    it('should fail if message not found', async () => {
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(null);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('edit_message');
      const action: EditMessageAction = {
        action: 'edit_message',
        message: '123',
        content: 'Edited!',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Message not found');
    });

    it('should edit embed', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('edit_message');
      const action: EditMessageAction = {
        action: 'edit_message',
        message: '999888777666555444',
        embed: { title: 'New Title' },
      };

      await handler.execute(action, context);
      expect(mockMessage.edit).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) })
      );
    });
  });

  describe('delete_message', () => {
    it('should delete a message', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('delete_message');
      const action: DeleteMessageAction = {
        action: 'delete_message',
        message: '999888777666555444',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMessage.delete).toHaveBeenCalled();
    });

    it('should handle delay', async () => {
      vi.useFakeTimers();
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('delete_message');
      const action: DeleteMessageAction = {
        action: 'delete_message',
        message: '999888777666555444',
        delay: '1s',
      };

      const resultPromise = handler.execute(action, context);
      expect(mockMessage.delete).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);
      await resultPromise;

      expect(mockMessage.delete).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should fail if channel not found', async () => {
      mockClient.channels.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('delete_message');
      const action: DeleteMessageAction = {
        action: 'delete_message',
        message: '123',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Channel not found');
    });
  });

  describe('defer', () => {
    it('should defer an interaction', async () => {
      const context = createInteractionContext();
      const handler = registry.get('defer');
      const action: DeferAction = {
        action: 'defer',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect((context.interaction as any).deferReply).toHaveBeenCalledWith({ ephemeral: undefined });
    });

    it('should defer with ephemeral flag', async () => {
      const context = createInteractionContext();
      const handler = registry.get('defer');
      const action: DeferAction = {
        action: 'defer',
        ephemeral: true,
      };

      await handler.execute(action, context);
      expect((context.interaction as any).deferReply).toHaveBeenCalledWith({ ephemeral: true });
    });

    it('should succeed if already deferred', async () => {
      const context = createInteractionContext();
      (context.interaction as any).deferred = true;
      const handler = registry.get('defer');
      const action: DeferAction = {
        action: 'defer',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect((context.interaction as any).deferReply).not.toHaveBeenCalled();
    });

    it('should succeed if already replied', async () => {
      const context = createInteractionContext();
      (context.interaction as any).replied = true;
      const handler = registry.get('defer');
      const action: DeferAction = {
        action: 'defer',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
    });

    it('should fail without interaction', async () => {
      const context = createHandlerContext();
      const handler = registry.get('defer');
      const action: DeferAction = {
        action: 'defer',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'No interaction');
    });
  });

  describe('update_message', () => {
    it('should update a component interaction message', async () => {
      const mockInteraction = {
        ...createInteractionContext().interaction,
        update: vi.fn().mockResolvedValue(undefined),
      };
      const context = createHandlerContext({
        interaction: mockInteraction,
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('update_message');
      const action: UpdateMessageAction = {
        action: 'update_message',
        content: 'Updated!',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockInteraction.update).toHaveBeenCalledWith(expect.objectContaining({ content: 'Updated!' }));
    });

    it('should fail without component interaction', async () => {
      const context = createHandlerContext();
      const handler = registry.get('update_message');
      const action: UpdateMessageAction = {
        action: 'update_message',
        content: 'Updated!',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'No component interaction');
    });
  });

  describe('add_reaction', () => {
    it('should add a reaction to a message', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('add_reaction');
      const action: AddReactionAction = {
        action: 'add_reaction',
        message: '999888777666555444',
        emoji: '👍',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMessage.react).toHaveBeenCalledWith('👍');
    });

    it('should interpolate emoji', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });
      (context as any).myEmoji = '🎉';

      const handler = registry.get('add_reaction');
      const action: AddReactionAction = {
        action: 'add_reaction',
        message: '999888777666555444',
        emoji: '${myEmoji}',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('${myEmoji}', context);
    });
  });

  describe('add_reactions', () => {
    it('should add multiple reactions sequentially', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('add_reactions');
      const action: AddReactionsAction = {
        action: 'add_reactions',
        message_id: '999888777666555444',
        emojis: ['👍', '👎', '❤️'],
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMessage.react).toHaveBeenCalledTimes(3);
      expect(mockMessage.react).toHaveBeenNthCalledWith(1, '👍');
      expect(mockMessage.react).toHaveBeenNthCalledWith(2, '👎');
      expect(mockMessage.react).toHaveBeenNthCalledWith(3, '❤️');
    });

    it('should fail without emojis array', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('add_reactions');
      const action = {
        action: 'add_reactions',
        message_id: '999888777666555444',
      } as AddReactionsAction;

      const result = await handler.execute(action, context);
      expectFailure(result, 'Emojis array is required');
    });

    it('should return count of added reactions', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('add_reactions');
      const action: AddReactionsAction = {
        action: 'add_reactions',
        message_id: '999888777666555444',
        emojis: ['👍', '👎'],
      };

      const result = await handler.execute(action, context);
      expect(result.data).toBe(2);
    });
  });

  describe('remove_reaction', () => {
    it('should remove a reaction from a message', async () => {
      const mockReaction = {
        users: {
          remove: vi.fn().mockResolvedValue(undefined),
        },
      };
      const mockMessage = createMockMessage();
      (mockMessage.reactions.cache as Map<string, unknown>).set('👍', mockReaction);
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('remove_reaction');
      const action: RemoveReactionAction = {
        action: 'remove_reaction',
        message_id: '999888777666555444',
        emoji: '👍',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockReaction.users.remove).toHaveBeenCalled();
    });

    it('should succeed even if reaction not found', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('remove_reaction');
      const action: RemoveReactionAction = {
        action: 'remove_reaction',
        message_id: '999888777666555444',
        emoji: '👍',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
    });
  });

  describe('clear_reactions', () => {
    it('should clear all reactions from a message', async () => {
      const mockMessage = createMockMessage();
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('clear_reactions');
      const action: ClearReactionsAction = {
        action: 'clear_reactions',
        message_id: '999888777666555444',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockMessage.reactions.removeAll).toHaveBeenCalled();
    });

    it('should clear specific emoji reaction', async () => {
      const mockReaction = {
        remove: vi.fn().mockResolvedValue(undefined),
      };
      const mockMessage = createMockMessage();
      (mockMessage.reactions.cache as Map<string, unknown>).set('👍', mockReaction);
      const mockChannel = createMockChannel();
      mockChannel.messages.fetch = vi.fn().mockResolvedValue(mockMessage);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('clear_reactions');
      const action: ClearReactionsAction = {
        action: 'clear_reactions',
        message_id: '999888777666555444',
        emoji: '👍',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockReaction.remove).toHaveBeenCalled();
      expect(mockMessage.reactions.removeAll).not.toHaveBeenCalled();
    });
  });

  describe('bulk_delete', () => {
    it('should bulk delete messages', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('bulk_delete');
      const action: BulkDeleteAction = {
        action: 'bulk_delete',
        count: 10,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockChannel.bulkDelete).toHaveBeenCalledWith(10, true);
    });

    it('should default to 100 messages', async () => {
      const mockChannel = createMockChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('bulk_delete');
      const action: BulkDeleteAction = {
        action: 'bulk_delete',
      };

      await handler.execute(action, context);
      expect(mockChannel.bulkDelete).toHaveBeenCalledWith(100, true);
    });

    it('should return number of deleted messages', async () => {
      const deletedMessages = new Map([['1', {}], ['2', {}], ['3', {}]]);
      const mockChannel = createMockChannel();
      mockChannel.bulkDelete = vi.fn().mockResolvedValue(deletedMessages);
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('bulk_delete');
      const action: BulkDeleteAction = {
        action: 'bulk_delete',
        count: 10,
      };

      const result = await handler.execute(action, context);
      expect(result.data).toBe(3);
    });

    it('should handle specific channel', async () => {
      const mockChannel = createMockChannel({ id: '999999999999999999' });
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockChannel);
      const context = createHandlerContext({ _deps: { client: mockClient, evaluator: mockEvaluator } as any });

      const handler = registry.get('bulk_delete');
      const action: BulkDeleteAction = {
        action: 'bulk_delete',
        channel: '999999999999999999',
        count: 5,
      };

      await handler.execute(action, context);
      expect(mockClient.channels.fetch).toHaveBeenCalledWith('999999999999999999');
    });
  });
});
