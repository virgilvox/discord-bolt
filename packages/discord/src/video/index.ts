/**
 * Video/streaming detection
 */

import type { Client, VoiceState, GuildMember } from 'discord.js';
import type { VideoConfig } from '@furlow/schema';

export interface StreamEvent {
  type: 'start' | 'stop';
  member: GuildMember;
  channelId: string;
  guildId: string;
}

export type StreamEventCallback = (event: StreamEvent) => void;

export class VideoManager {
  private client: Client;
  private config: VideoConfig = {};
  private streamingMembers: Map<string, Set<string>> = new Map(); // guildId -> Set<memberId>
  private listeners: StreamEventCallback[] = [];

  constructor(client: Client) {
    this.client = client;
    this.setupListener();
  }

  /**
   * Configure the video manager
   */
  configure(config: VideoConfig): void {
    this.config = config;
  }

  /**
   * Set up voice state update listener for stream detection
   */
  private setupListener(): void {
    if (!this.config.stream_detection) return;

    this.client.on('voiceStateUpdate', (oldState, newState) => {
      this.handleVoiceStateUpdate(oldState, newState);
    });
  }

  /**
   * Handle voice state update for stream detection
   */
  private handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState
  ): void {
    const guildId = newState.guild.id;
    const memberId = newState.member?.id;

    if (!memberId || !newState.member) return;

    // Get or create streaming set for guild
    if (!this.streamingMembers.has(guildId)) {
      this.streamingMembers.set(guildId, new Set());
    }
    const streaming = this.streamingMembers.get(guildId)!;

    const wasStreaming = oldState.streaming;
    const isStreaming = newState.streaming;

    // Stream started
    if (!wasStreaming && isStreaming) {
      streaming.add(memberId);
      this.emit({
        type: 'start',
        member: newState.member,
        channelId: newState.channelId!,
        guildId,
      });
    }

    // Stream stopped
    if (wasStreaming && !isStreaming) {
      streaming.delete(memberId);
      this.emit({
        type: 'stop',
        member: newState.member,
        channelId: oldState.channelId!,
        guildId,
      });
    }

    // Left voice while streaming
    if (wasStreaming && !newState.channelId) {
      streaming.delete(memberId);
      this.emit({
        type: 'stop',
        member: newState.member,
        channelId: oldState.channelId!,
        guildId,
      });
    }
  }

  /**
   * Emit a stream event to all listeners
   */
  private emit(event: StreamEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Stream event listener error:', error);
      }
    }
  }

  /**
   * Register a stream event listener
   */
  onStreamEvent(callback: StreamEventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get all members currently streaming in a guild
   */
  getStreamingMembers(guildId: string): string[] {
    return [...(this.streamingMembers.get(guildId) ?? [])];
  }

  /**
   * Check if a member is streaming
   */
  isStreaming(guildId: string, memberId: string): boolean {
    return this.streamingMembers.get(guildId)?.has(memberId) ?? false;
  }

  /**
   * Get stream count in a guild
   */
  getStreamCount(guildId: string): number {
    return this.streamingMembers.get(guildId)?.size ?? 0;
  }

  /**
   * Check if stream detection is enabled
   */
  isEnabled(): boolean {
    return this.config.stream_detection ?? false;
  }
}

/**
 * Create a video manager
 */
export function createVideoManager(client: Client): VideoManager {
  return new VideoManager(client);
}
