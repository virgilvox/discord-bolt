/**
 * Voice and Audio types
 */

import type { Expression, Duration } from './common.js';

/** Audio filter */
export type AudioFilter =
  | 'nightcore'
  | 'vaporwave'
  | 'bass_boost'
  | '8d'
  | 'karaoke'
  | 'tremolo'
  | 'vibrato'
  | 'reverse'
  | 'treble'
  | 'normalize'
  | 'surrounding'
  | 'pulsator'
  | 'subboost'
  | 'flanger'
  | 'gate'
  | 'haas'
  | 'mcompand';

/** Queue loop mode */
export type QueueLoopMode = 'off' | 'track' | 'queue';

/** Audio source type */
export type AudioSourceType = 'youtube' | 'soundcloud' | 'spotify' | 'url' | 'file' | 'attachment';

/** Audio source */
export interface AudioSource {
  type: AudioSourceType;
  url: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  requester?: string;
}

/** Voice connection config */
export interface VoiceConnectionConfig {
  self_deaf?: boolean;
  self_mute?: boolean;
  inactivity_timeout?: Duration;
  alone_timeout?: Duration;
}

/** Voice recording config */
export interface VoiceRecordingConfig {
  enabled?: boolean;
  format?: 'pcm' | 'ogg' | 'mp3';
  per_user?: boolean;
  max_duration?: Duration;
  output_dir?: string;
}

/** Voice configuration */
export interface VoiceConfig {
  connection?: VoiceConnectionConfig;
  recording?: VoiceRecordingConfig;
  default_volume?: number;
  max_queue_size?: number;
  default_loop?: QueueLoopMode;
  vote_skip?: {
    enabled?: boolean;
    threshold?: number | string;
  };
  filters?: AudioFilter[];
}

/** Video/streaming configuration */
export interface VideoConfig {
  stream_detection?: boolean;
  notify_channel?: Expression;
  notify_role?: Expression;
}
