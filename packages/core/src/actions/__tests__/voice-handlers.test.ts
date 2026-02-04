/**
 * Voice and music action handler tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionRegistry } from '../registry.js';
import { registerVoiceHandlers } from '../handlers/voice.js';
import {
  createMockEvaluator,
  createMockClient,
  createMockVoiceManager,
  createMockVoiceChannel,
  createHandlerContext,
  expectSuccess,
  expectFailure,
} from './test-utils.js';
import { ChannelType } from 'discord.js';
import type { ActionRegistry } from '../registry.js';
import type {
  VoiceJoinAction,
  VoiceLeaveAction,
  VoicePlayAction,
  VoicePauseAction,
  VoiceResumeAction,
  VoiceStopAction,
  VoiceSkipAction,
  VoiceSeekAction,
  VoiceVolumeAction,
  VoiceSetFilterAction,
  VoiceSearchAction,
  QueueAddAction,
  QueueRemoveAction,
  QueueClearAction,
  QueueShuffleAction,
  QueueLoopAction,
  QueueGetAction,
} from '@furlow/schema';

describe('Voice Handlers', () => {
  let registry: ActionRegistry;
  let mockEvaluator: ReturnType<typeof createMockEvaluator>;
  let mockClient: ReturnType<typeof createMockClient>;
  let mockVoiceManager: ReturnType<typeof createMockVoiceManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createActionRegistry();
    mockEvaluator = createMockEvaluator();
    mockClient = createMockClient();
    mockVoiceManager = createMockVoiceManager();

    registerVoiceHandlers(registry, {
      client: mockClient as any,
      evaluator: mockEvaluator as any,
      voiceManager: mockVoiceManager as any,
    });
  });

  describe('Handler Registration', () => {
    it('should register all voice handlers', () => {
      expect(registry.has('voice_join')).toBe(true);
      expect(registry.has('voice_leave')).toBe(true);
      expect(registry.has('voice_play')).toBe(true);
      expect(registry.has('voice_pause')).toBe(true);
      expect(registry.has('voice_resume')).toBe(true);
      expect(registry.has('voice_stop')).toBe(true);
      expect(registry.has('voice_skip')).toBe(true);
      expect(registry.has('voice_seek')).toBe(true);
      expect(registry.has('voice_volume')).toBe(true);
      expect(registry.has('voice_set_filter')).toBe(true);
      expect(registry.has('voice_search')).toBe(true);
      expect(registry.has('queue_get')).toBe(true);
      expect(registry.has('queue_add')).toBe(true);
      expect(registry.has('queue_remove')).toBe(true);
      expect(registry.has('queue_clear')).toBe(true);
      expect(registry.has('queue_shuffle')).toBe(true);
      expect(registry.has('queue_loop')).toBe(true);
    });
  });

  describe('voice_join', () => {
    it('should join a voice channel', async () => {
      const mockVoiceChannel = createMockVoiceChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockVoiceChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_join');
      const action: VoiceJoinAction = {
        action: 'voice_join',
        channel: '222333444555666777',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.join).toHaveBeenCalledWith(mockVoiceChannel, expect.any(Object));
    });

    it('should join with self_deaf option', async () => {
      const mockVoiceChannel = createMockVoiceChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockVoiceChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_join');
      const action: VoiceJoinAction = {
        action: 'voice_join',
        channel: '222333444555666777',
        self_deaf: true,
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.join).toHaveBeenCalledWith(
        mockVoiceChannel,
        expect.objectContaining({ selfDeaf: true })
      );
    });

    it('should join with self_mute option', async () => {
      const mockVoiceChannel = createMockVoiceChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockVoiceChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_join');
      const action: VoiceJoinAction = {
        action: 'voice_join',
        channel: '222333444555666777',
        self_mute: true,
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.join).toHaveBeenCalledWith(
        mockVoiceChannel,
        expect.objectContaining({ selfMute: true })
      );
    });

    it('should fail without voice manager', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('voice_join');
      const action: VoiceJoinAction = {
        action: 'voice_join',
        channel: '222333444555666777',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Voice manager not available');
    });

    it('should fail if channel not found', async () => {
      mockClient.channels.fetch = vi.fn().mockResolvedValue(null);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_join');
      const action: VoiceJoinAction = {
        action: 'voice_join',
        channel: '123',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Voice channel not found');
    });

    it('should handle channel mention format', async () => {
      const mockVoiceChannel = createMockVoiceChannel();
      mockClient.channels.fetch = vi.fn().mockResolvedValue(mockVoiceChannel);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_join');
      const action: VoiceJoinAction = {
        action: 'voice_join',
        channel: '<#222333444555666777>',
      };

      await handler.execute(action, context);
      expect(mockClient.channels.fetch).toHaveBeenCalledWith('222333444555666777');
    });
  });

  describe('voice_leave', () => {
    it('should leave voice channel', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_leave');
      const action: VoiceLeaveAction = {
        action: 'voice_leave',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.leave).toHaveBeenCalledWith(context.guildId);
    });

    it('should leave specific guild', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_leave');
      const action: VoiceLeaveAction = {
        action: 'voice_leave',
        guild: '999888777666555444',
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.leave).toHaveBeenCalledWith('999888777666555444');
    });

    it('should fail without voice manager', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('voice_leave');
      const action: VoiceLeaveAction = {
        action: 'voice_leave',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Voice manager not available');
    });
  });

  describe('voice_play', () => {
    it('should play audio', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_play');
      const action: VoicePlayAction = {
        action: 'voice_play',
        source: 'https://example.com/audio.mp3',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.play).toHaveBeenCalledWith(
        context.guildId,
        'https://example.com/audio.mp3',
        expect.any(Object)
      );
    });

    it('should play with volume', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_play');
      const action: VoicePlayAction = {
        action: 'voice_play',
        source: 'https://example.com/audio.mp3',
        volume: 0.5,
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.play).toHaveBeenCalledWith(
        context.guildId,
        expect.any(String),
        expect.objectContaining({ volume: 0.5 })
      );
    });

    it('should play with seek position', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_play');
      const action: VoicePlayAction = {
        action: 'voice_play',
        source: 'https://example.com/audio.mp3',
        seek: '30s',
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.play).toHaveBeenCalledWith(
        context.guildId,
        expect.any(String),
        expect.objectContaining({ seek: 30000 })
      );
    });

    it('should interpolate source', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });
      (context as any).url = 'https://example.com/track.mp3';

      const handler = registry.get('voice_play');
      const action: VoicePlayAction = {
        action: 'voice_play',
        source: '${url}',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.interpolate).toHaveBeenCalledWith('${url}', context);
    });
  });

  describe('voice_pause', () => {
    it('should pause playback', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_pause');
      const action: VoicePauseAction = {
        action: 'voice_pause',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.pause).toHaveBeenCalledWith(context.guildId);
    });
  });

  describe('voice_resume', () => {
    it('should resume playback', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_resume');
      const action: VoiceResumeAction = {
        action: 'voice_resume',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.resume).toHaveBeenCalledWith(context.guildId);
    });
  });

  describe('voice_stop', () => {
    it('should stop playback', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_stop');
      const action: VoiceStopAction = {
        action: 'voice_stop',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.stop).toHaveBeenCalledWith(context.guildId);
    });
  });

  describe('voice_skip', () => {
    it('should skip current track', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_skip');
      const action: VoiceSkipAction = {
        action: 'voice_skip',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.skip).toHaveBeenCalledWith(context.guildId);
    });
  });

  describe('voice_seek', () => {
    it('should seek to position in ms', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_seek');
      const action: VoiceSeekAction = {
        action: 'voice_seek',
        position: 60000,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.seek).toHaveBeenCalledWith(context.guildId, 60000);
    });

    it('should parse duration string', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_seek');
      const action: VoiceSeekAction = {
        action: 'voice_seek',
        position: '1m30s',
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.seek).toHaveBeenCalledWith(context.guildId, 90000);
    });

    it('should fail if no track playing', async () => {
      mockVoiceManager.seek = vi.fn().mockResolvedValue(false);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_seek');
      const action: VoiceSeekAction = {
        action: 'voice_seek',
        position: 30000,
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'No track currently playing');
    });
  });

  describe('voice_volume', () => {
    it('should set volume', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_volume');
      const action: VoiceVolumeAction = {
        action: 'voice_volume',
        volume: 0.75,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.setVolume).toHaveBeenCalledWith(context.guildId, 0.75);
    });

    it('should use level alias', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_volume');
      const action = {
        action: 'voice_volume',
        level: 50,
      } as VoiceVolumeAction;

      await handler.execute(action, context);
      expect(mockVoiceManager.setVolume).toHaveBeenCalledWith(context.guildId, 50);
    });

    it('should evaluate expression', async () => {
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(80);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_volume');
      const action: VoiceVolumeAction = {
        action: 'voice_volume',
        volume: 'userVolume',
      };

      await handler.execute(action, context);
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('userVolume', context);
    });
  });

  describe('voice_set_filter', () => {
    it('should enable a filter', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_set_filter');
      const action: VoiceSetFilterAction = {
        action: 'voice_set_filter',
        filter: 'bassboost',
        enabled: true,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.setFilter).toHaveBeenCalledWith(context.guildId, 'bassboost', true);
    });

    it('should disable a filter', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_set_filter');
      const action: VoiceSetFilterAction = {
        action: 'voice_set_filter',
        filter: 'nightcore',
        enabled: false,
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.setFilter).toHaveBeenCalledWith(context.guildId, 'nightcore', false);
    });

    it('should enable by default', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_set_filter');
      const action: VoiceSetFilterAction = {
        action: 'voice_set_filter',
        filter: '8d',
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.setFilter).toHaveBeenCalledWith(context.guildId, '8d', true);
    });

    it('should fail for invalid filter', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_set_filter');
      const action: VoiceSetFilterAction = {
        action: 'voice_set_filter',
        filter: 'invalid_filter',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Invalid filter');
    });

    it('should fail if not connected', async () => {
      mockVoiceManager.setFilter = vi.fn().mockResolvedValue(false);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_set_filter');
      const action: VoiceSetFilterAction = {
        action: 'voice_set_filter',
        filter: 'bassboost',
      };

      const result = await handler.execute(action, context);
      expectFailure(result, 'Not connected to voice');
    });
  });

  describe('voice_search', () => {
    it('should search for tracks', async () => {
      mockVoiceManager.search = vi.fn().mockResolvedValue([
        { url: 'https://example.com/1', title: 'Track 1', duration: 180 },
        { url: 'https://example.com/2', title: 'Track 2', duration: 240 },
      ]);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_search');
      const action: VoiceSearchAction = {
        action: 'voice_search',
        query: 'test song',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.search).toHaveBeenCalledWith('test song', { limit: 5, source: undefined });
      expect(result.data).toHaveLength(2);
    });

    it('should respect limit', async () => {
      mockVoiceManager.search = vi.fn().mockResolvedValue([]);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_search');
      const action: VoiceSearchAction = {
        action: 'voice_search',
        query: 'test',
        limit: 10,
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.search).toHaveBeenCalledWith(expect.any(String), { limit: 10, source: undefined });
    });

    it('should store results with as', async () => {
      const mockResults = [{ url: 'https://example.com', title: 'Test', duration: 100 }];
      mockVoiceManager.search = vi.fn().mockResolvedValue(mockResults);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('voice_search');
      const action: VoiceSearchAction = {
        action: 'voice_search',
        query: 'test',
        as: 'searchResults',
      };

      await handler.execute(action, context);
      expect((context as any).searchResults).toBe(mockResults);
    });

    it('should handle URL directly', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator } as any,
      });

      const handler = registry.get('voice_search');
      const action: VoiceSearchAction = {
        action: 'voice_search',
        query: 'https://youtube.com/watch?v=123',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toEqual([expect.objectContaining({ url: 'https://youtube.com/watch?v=123' })]);
    });
  });

  describe('queue_get', () => {
    it('should get queue info', async () => {
      mockVoiceManager.getQueue = vi.fn().mockReturnValue([{ title: 'Track 1' }, { title: 'Track 2' }]);
      mockVoiceManager.getCurrentTrack = vi.fn().mockReturnValue({ title: 'Current Track' });
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_get');
      const action: QueueGetAction = {
        action: 'queue_get',
        as: 'queueInfo',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(result.data).toEqual({
        queue: [{ title: 'Track 1' }, { title: 'Track 2' }],
        currentTrack: { title: 'Current Track' },
        length: 2,
      });
      expect((context as any).queueInfo).toEqual(result.data);
    });
  });

  describe('queue_add', () => {
    it('should add track from source', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_add');
      const action: QueueAddAction = {
        action: 'queue_add',
        source: 'https://example.com/track.mp3',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.addToQueue).toHaveBeenCalledWith(
        context.guildId,
        expect.objectContaining({ url: 'https://example.com/track.mp3' }),
        undefined
      );
    });

    it('should add track object', async () => {
      mockEvaluator.evaluate = vi.fn().mockResolvedValue({ url: 'https://example.com', title: 'Test' });
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_add');
      const action: QueueAddAction = {
        action: 'queue_add',
        track: 'searchResults[0]',
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.addToQueue).toHaveBeenCalled();
    });

    it('should add at specific position', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_add');
      const action: QueueAddAction = {
        action: 'queue_add',
        source: 'https://example.com/track.mp3',
        position: 0,
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.addToQueue).toHaveBeenCalledWith(
        context.guildId,
        expect.any(Object),
        0
      );
    });

    it('should fail without track or source', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_add');
      const action = {
        action: 'queue_add',
      } as QueueAddAction;

      const result = await handler.execute(action, context);
      expectFailure(result, 'Either track or source is required');
    });

    it('should set requester', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_add');
      const action: QueueAddAction = {
        action: 'queue_add',
        source: 'https://example.com/track.mp3',
        requester: '123456789012345678',
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.addToQueue).toHaveBeenCalledWith(
        context.guildId,
        expect.objectContaining({ requesterId: '123456789012345678' }),
        undefined
      );
    });
  });

  describe('queue_remove', () => {
    it('should remove track from queue', async () => {
      mockVoiceManager.removeFromQueue = vi.fn().mockReturnValue({ title: 'Removed Track' });
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_remove');
      const action: QueueRemoveAction = {
        action: 'queue_remove',
        position: 2,
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.removeFromQueue).toHaveBeenCalledWith(context.guildId, 2);
      expect(result.data).toEqual({ title: 'Removed Track' });
    });
  });

  describe('queue_clear', () => {
    it('should clear the queue', async () => {
      mockVoiceManager.clearQueue = vi.fn().mockReturnValue(5);
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_clear');
      const action: QueueClearAction = {
        action: 'queue_clear',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.clearQueue).toHaveBeenCalledWith(context.guildId);
      expect(result.data).toEqual({ cleared: 5 });
    });
  });

  describe('queue_shuffle', () => {
    it('should shuffle the queue', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_shuffle');
      const action: QueueShuffleAction = {
        action: 'queue_shuffle',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.shuffleQueue).toHaveBeenCalledWith(context.guildId);
    });
  });

  describe('queue_loop', () => {
    it('should set loop mode to track', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_loop');
      const action: QueueLoopAction = {
        action: 'queue_loop',
        mode: 'track',
      };

      const result = await handler.execute(action, context);
      expectSuccess(result);
      expect(mockVoiceManager.setLoopMode).toHaveBeenCalledWith(context.guildId, 'track');
    });

    it('should set loop mode to queue', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_loop');
      const action: QueueLoopAction = {
        action: 'queue_loop',
        mode: 'queue',
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.setLoopMode).toHaveBeenCalledWith(context.guildId, 'queue');
    });

    it('should disable loop with off', async () => {
      const context = createHandlerContext({
        _deps: { client: mockClient, evaluator: mockEvaluator, voiceManager: mockVoiceManager } as any,
      });

      const handler = registry.get('queue_loop');
      const action: QueueLoopAction = {
        action: 'queue_loop',
        mode: 'off',
      };

      await handler.execute(action, context);
      expect(mockVoiceManager.setLoopMode).toHaveBeenCalledWith(context.guildId, 'off');
    });
  });
});
