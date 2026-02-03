/**
 * Canvas and image generation types
 */

import type { Expression, Color } from './common.js';

/** Canvas layer type */
export type CanvasLayerType = 'image' | 'circle_image' | 'text' | 'rect' | 'progress_bar' | 'gradient';

/** Base canvas layer */
export interface BaseCanvasLayer {
  type: CanvasLayerType;
  x: number | Expression;
  y: number | Expression;
  when?: Expression;
}

/** Image layer */
export interface ImageLayer extends BaseCanvasLayer {
  type: 'image';
  src: Expression;
  width?: number | Expression;
  height?: number | Expression;
  opacity?: number;
}

/** Circle image layer (for avatars) */
export interface CircleImageLayer extends BaseCanvasLayer {
  type: 'circle_image';
  src: Expression;
  radius: number | Expression;
  border?: {
    width?: number;
    color?: Color;
  };
}

/** Text layer */
export interface TextLayer extends BaseCanvasLayer {
  type: 'text';
  text: Expression;
  font?: string;
  size?: number;
  color?: Color | Expression;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom';
  max_width?: number;
  stroke?: {
    color?: Color;
    width?: number;
  };
}

/** Rectangle layer */
export interface RectLayer extends BaseCanvasLayer {
  type: 'rect';
  width: number | Expression;
  height: number | Expression;
  color?: Color | Expression;
  radius?: number;
  stroke?: {
    color?: Color;
    width?: number;
  };
}

/** Progress bar layer */
export interface ProgressBarLayer extends BaseCanvasLayer {
  type: 'progress_bar';
  width: number | Expression;
  height: number | Expression;
  value: number | Expression;
  max?: number | Expression;
  background?: Color;
  fill?: Color | Expression;
  radius?: number;
  direction?: 'horizontal' | 'vertical';
}

/** Gradient stop */
export interface GradientStop {
  offset: number;
  color: Color;
}

/** Gradient layer */
export interface GradientLayer extends BaseCanvasLayer {
  type: 'gradient';
  width: number | Expression;
  height: number | Expression;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  stops: GradientStop[];
  radius?: number;
}

/** Canvas layer union */
export type CanvasLayer =
  | ImageLayer
  | CircleImageLayer
  | TextLayer
  | RectLayer
  | ProgressBarLayer
  | GradientLayer;

/** Canvas generator definition */
export interface CanvasGenerator {
  name: string;
  width: number;
  height: number;
  background?: Color | Expression;
  layers: CanvasLayer[];
}

/** Canvas configuration */
export interface CanvasConfig {
  fonts?: Record<string, string>;
  generators?: Record<string, CanvasGenerator>;
}
