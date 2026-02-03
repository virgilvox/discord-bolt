/**
 * Voice connection and audio management
 */

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  type VoiceConnection,
  type AudioPlayer,
  type AudioResource,
  type DiscordGatewayAdapterCreator,
} from '@discordjs/voice';
import type { VoiceChannel, StageChannel, Guild } from 'discord.js';

/** Voice configuration */
export interface VoiceConfig {
  connection?: {
    self_deaf?: boolean;
    self_mute?: boolean;
    timeout?: string;
  };
  default_volume?: number;
  default_loop?: QueueLoopMode;
  max_queue_size?: number;
  filters?: string[];
}

/** Audio filter types */
export type AudioFilter =
  | 'bassboost'
  | 'nightcore'
  | 'vaporwave'
  | '8d'
  | 'treble'
  | 'normalizer'
  | 'karaoke'
  | 'tremolo'
  | 'vibrato'
  | 'reverse';

/** Queue loop mode */
export type QueueLoopMode = 'off' | 'track' | 'queue';

export interface QueueItem {
  url: string;
  title: string;
  duration?: number;
  thumbnail?: string;
  requesterId: string;
}

export interface GuildVoiceState {
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: QueueItem[];
  currentTrack: QueueItem | null;
  volume: number;
  loopMode: QueueLoopMode;
  filters: Set<AudioFilter>;
  paused: boolean;
}

export class VoiceManager {
  private guildStates: Map<string, GuildVoiceState> = new Map();
  private config: VoiceConfig = {};

  /**
   * Configure the voice manager
   */
  configure(config: VoiceConfig): void {
    this.config = config;
  }

  /**
   * Join a voice channel
   */
  async join(
    channel: VoiceChannel | StageChannel,
    options: { selfDeaf?: boolean; selfMute?: boolean } = {}
  ): Promise<VoiceConnection> {
    const guildId = channel.guild.id;

    // Leave existing connection if any
    const existing = getVoiceConnection(guildId);
    if (existing) {
      existing.destroy();
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guildId,
      adapterCreator: channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
      selfDeaf: options.selfDeaf ?? this.config.connection?.self_deaf ?? true,
      selfMute: options.selfMute ?? this.config.connection?.self_mute ?? false,
    });

    // Wait for connection to be ready
    await entersState(connection, VoiceConnectionStatus.Ready, 30000);

    // Create audio player
    const player = createAudioPlayer();

    // Set up player events
    player.on(AudioPlayerStatus.Idle, () => {
      this.handleTrackEnd(guildId);
    });

    player.on('error', (error) => {
      console.error(`Audio player error in ${guildId}:`, error);
      this.handleTrackEnd(guildId);
    });

    // Subscribe connection to player
    connection.subscribe(player);

    // Store state
    this.guildStates.set(guildId, {
      connection,
      player,
      queue: [],
      currentTrack: null,
      volume: this.config.default_volume ?? 100,
      loopMode: this.config.default_loop ?? 'off',
      filters: new Set(),
      paused: false,
    });

    return connection;
  }

  /**
   * Leave a voice channel
   */
  leave(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.player.stop();
    state.connection.destroy();
    this.guildStates.delete(guildId);

    return true;
  }

  /**
   * Play audio from a URL or file
   */
  async play(
    guildId: string,
    source: string,
    options: { volume?: number; seek?: number } = {}
  ): Promise<void> {
    const state = this.guildStates.get(guildId);
    if (!state) {
      throw new Error('Not connected to voice in this guild');
    }

    // Create audio resource
    const resource = createAudioResource(source, {
      inlineVolume: true,
    });

    // Set volume
    const volume = options.volume ?? state.volume;
    resource.volume?.setVolume(volume / 100);

    // Play
    state.player.play(resource);
    state.paused = false;
  }

  /**
   * Add a track to the queue
   */
  addToQueue(
    guildId: string,
    item: QueueItem,
    position?: number | 'next' | 'last'
  ): number {
    const state = this.guildStates.get(guildId);
    if (!state) {
      throw new Error('Not connected to voice in this guild');
    }

    // Check queue size limit
    const maxSize = this.config.max_queue_size ?? 1000;
    if (state.queue.length >= maxSize) {
      throw new Error(`Queue is full (max ${maxSize} tracks)`);
    }

    if (position === 'next' || position === 0) {
      state.queue.unshift(item);
      return 0;
    } else if (position === 'last' || position === undefined) {
      state.queue.push(item);
      return state.queue.length - 1;
    } else if (typeof position === 'number') {
      state.queue.splice(position, 0, item);
      return position;
    }

    state.queue.push(item);
    return state.queue.length - 1;
  }

  /**
   * Remove a track from the queue
   */
  removeFromQueue(guildId: string, position: number): QueueItem | null {
    const state = this.guildStates.get(guildId);
    if (!state) return null;

    const [removed] = state.queue.splice(position, 1);
    return removed ?? null;
  }

  /**
   * Clear the queue
   */
  clearQueue(guildId: string): number {
    const state = this.guildStates.get(guildId);
    if (!state) return 0;

    const count = state.queue.length;
    state.queue = [];
    return count;
  }

  /**
   * Shuffle the queue
   */
  shuffleQueue(guildId: string): void {
    const state = this.guildStates.get(guildId);
    if (!state) return;

    for (let i = state.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.queue[i], state.queue[j]] = [state.queue[j]!, state.queue[i]!];
    }
  }

  /**
   * Skip the current track
   */
  skip(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.player.stop();
    return true;
  }

  /**
   * Pause playback
   */
  pause(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.player.pause();
    state.paused = true;
    return true;
  }

  /**
   * Resume playback
   */
  resume(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.player.unpause();
    state.paused = false;
    return true;
  }

  /**
   * Stop playback
   */
  stop(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.player.stop();
    state.queue = [];
    state.currentTrack = null;
    return true;
  }

  /**
   * Set volume
   */
  setVolume(guildId: string, volume: number): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.volume = Math.max(0, Math.min(200, volume));
    return true;
  }

  /**
   * Set loop mode
   */
  setLoopMode(guildId: string, mode: QueueLoopMode): void {
    const state = this.guildStates.get(guildId);
    if (!state) return;

    state.loopMode = mode;
  }

  /**
   * Get the current state for a guild
   */
  getState(guildId: string): GuildVoiceState | undefined {
    return this.guildStates.get(guildId);
  }

  /**
   * Check if connected to a guild
   */
  isConnected(guildId: string): boolean {
    return this.guildStates.has(guildId);
  }

  /**
   * Get the queue for a guild
   */
  getQueue(guildId: string): QueueItem[] {
    return this.guildStates.get(guildId)?.queue ?? [];
  }

  /**
   * Get the current track for a guild
   */
  getCurrentTrack(guildId: string): QueueItem | null {
    return this.guildStates.get(guildId)?.currentTrack ?? null;
  }

  /**
   * Handle track end (play next or loop)
   */
  private async handleTrackEnd(guildId: string): Promise<void> {
    const state = this.guildStates.get(guildId);
    if (!state) return;

    // Handle loop modes
    if (state.loopMode === 'track' && state.currentTrack) {
      await this.play(guildId, state.currentTrack.url);
      return;
    }

    if (state.loopMode === 'queue' && state.currentTrack) {
      state.queue.push(state.currentTrack);
    }

    // Play next track
    const next = state.queue.shift();
    if (next) {
      state.currentTrack = next;
      await this.play(guildId, next.url);
    } else {
      state.currentTrack = null;
    }
  }

  /**
   * Disconnect from all voice channels
   */
  disconnectAll(): void {
    for (const [guildId] of this.guildStates) {
      this.leave(guildId);
    }
  }
}

/**
 * Create a voice manager
 */
export function createVoiceManager(): VoiceManager {
  return new VoiceManager();
}
