/**
 * Canvas layer drawing functions
 */

import type {
  CanvasLayer,
  ImageLayer,
  CircleImageLayer,
  TextLayer,
  RectLayer,
  ProgressBarLayer,
  GradientLayer,
  Color,
} from '@furlow/schema';

// Type definitions for canvas (defined locally since canvas is optional)
interface Canvas {
  width: number;
  height: number;
}

interface CanvasRenderingContext2D {
  fillStyle: string | CanvasGradient;
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
  font: string;
  textAlign: 'left' | 'center' | 'right';
  textBaseline: 'top' | 'middle' | 'bottom' | 'alphabetic';
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  strokeText(text: string, x: number, y: number, maxWidth?: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  fill(): void;
  stroke(): void;
  clip(): void;
  save(): void;
  restore(): void;
  drawImage(image: Image, dx: number, dy: number, dw?: number, dh?: number): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
}

interface CanvasGradient {
  addColorStop(offset: number, color: string): void;
}

interface Image {
  width: number;
  height: number;
}

export interface LayerContext {
  ctx: CanvasRenderingContext2D;
  canvas: Canvas;
  loadImage: (src: string) => Promise<Image>;
  resolveValue: <T>(value: T | string) => Promise<T>;
  resolveColor: (color: Color | string | undefined) => Promise<string>;
}

/**
 * Draw a layer based on its type
 */
export async function drawLayer(
  layer: CanvasLayer,
  context: LayerContext
): Promise<void> {
  // Check conditional rendering
  if (layer.when !== undefined) {
    const shouldRender = await context.resolveValue<boolean>(layer.when);
    if (!shouldRender) return;
  }

  switch (layer.type) {
    case 'image':
      await drawImageLayer(layer, context);
      break;
    case 'circle_image':
      await drawCircleImageLayer(layer, context);
      break;
    case 'text':
      await drawTextLayer(layer, context);
      break;
    case 'rect':
      await drawRectLayer(layer, context);
      break;
    case 'progress_bar':
      await drawProgressBarLayer(layer, context);
      break;
    case 'gradient':
      await drawGradientLayer(layer, context);
      break;
  }
}

/**
 * Draw an image layer
 */
async function drawImageLayer(
  layer: ImageLayer,
  context: LayerContext
): Promise<void> {
  const { ctx, loadImage, resolveValue } = context;

  const x = await resolveValue<number>(layer.x);
  const y = await resolveValue<number>(layer.y);
  const src = await resolveValue<string>(layer.src);

  try {
    const image = await loadImage(src);
    const width = layer.width ? await resolveValue<number>(layer.width) : image.width;
    const height = layer.height ? await resolveValue<number>(layer.height) : image.height;

    if (layer.opacity !== undefined && layer.opacity < 1) {
      ctx.save();
      ctx.globalAlpha = layer.opacity;
    }

    ctx.drawImage(image, x, y, width, height);

    if (layer.opacity !== undefined && layer.opacity < 1) {
      ctx.restore();
    }
  } catch (err) {
    console.warn(`Failed to load image: ${src}`, err);
  }
}

/**
 * Draw a circular image layer (commonly used for avatars)
 */
async function drawCircleImageLayer(
  layer: CircleImageLayer,
  context: LayerContext
): Promise<void> {
  const { ctx, loadImage, resolveValue, resolveColor } = context;

  const x = await resolveValue<number>(layer.x);
  const y = await resolveValue<number>(layer.y);
  const radius = await resolveValue<number>(layer.radius);
  const src = await resolveValue<string>(layer.src ?? layer.url ?? '');

  if (!src) return;

  try {
    const image = await loadImage(src);

    ctx.save();

    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw the image scaled to fit the circle
    ctx.drawImage(image, x, y, radius * 2, radius * 2);

    ctx.restore();

    // Draw border if specified
    if (layer.border) {
      const borderWidth = layer.border.width ?? 2;
      const borderColor = await resolveColor(layer.border.color);

      ctx.beginPath();
      ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }
  } catch (err) {
    console.warn(`Failed to load circle image: ${src}`, err);
  }
}

/**
 * Draw a text layer
 */
async function drawTextLayer(
  layer: TextLayer,
  context: LayerContext
): Promise<void> {
  const { ctx, resolveValue, resolveColor } = context;

  const x = await resolveValue<number>(layer.x);
  const y = await resolveValue<number>(layer.y);
  const text = await resolveValue<string>(layer.text);
  const color = await resolveColor(layer.color);

  // Set font
  const size = layer.size ?? 16;
  const font = layer.font ?? 'sans-serif';
  ctx.font = `${size}px ${font}`;

  // Set alignment
  ctx.textAlign = layer.align ?? 'left';
  ctx.textBaseline = layer.baseline ?? 'top';

  // Draw stroke first if specified
  if (layer.stroke) {
    const strokeColor = await resolveColor(layer.stroke.color);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = layer.stroke.width ?? 2;

    if (layer.max_width) {
      ctx.strokeText(text, x, y, layer.max_width);
    } else {
      ctx.strokeText(text, x, y);
    }
  }

  // Draw fill
  ctx.fillStyle = color;
  if (layer.max_width) {
    ctx.fillText(text, x, y, layer.max_width);
  } else {
    ctx.fillText(text, x, y);
  }
}

/**
 * Draw a rectangle layer
 */
async function drawRectLayer(
  layer: RectLayer,
  context: LayerContext
): Promise<void> {
  const { ctx, resolveValue, resolveColor } = context;

  const x = await resolveValue<number>(layer.x);
  const y = await resolveValue<number>(layer.y);
  const width = await resolveValue<number>(layer.width);
  const height = await resolveValue<number>(layer.height);
  const color = await resolveColor(layer.color);
  const radius = layer.radius ?? 0;

  ctx.beginPath();

  if (radius > 0) {
    // Rounded rectangle
    roundedRect(ctx, x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }

  // Fill
  if (color && color !== 'transparent') {
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Stroke
  if (layer.stroke) {
    const strokeColor = await resolveColor(layer.stroke.color);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = layer.stroke.width ?? 1;
    ctx.stroke();
  }
}

/**
 * Draw a progress bar layer
 */
async function drawProgressBarLayer(
  layer: ProgressBarLayer,
  context: LayerContext
): Promise<void> {
  const { ctx, resolveValue, resolveColor } = context;

  const x = await resolveValue<number>(layer.x);
  const y = await resolveValue<number>(layer.y);
  const width = await resolveValue<number>(layer.width);
  const height = await resolveValue<number>(layer.height);

  // Get progress value (0-1)
  let progress = layer.progress ?? layer.value ?? 0;
  progress = await resolveValue<number>(progress);

  // Handle max value if specified
  if (layer.max !== undefined) {
    const max = await resolveValue<number>(layer.max);
    progress = progress / max;
  }

  // Clamp progress to 0-1
  progress = Math.max(0, Math.min(1, progress));

  const bgColor = await resolveColor(layer.background);
  const fillColor = await resolveColor(layer.fill ?? layer.color);
  const radius = layer.radius ?? 0;
  const isVertical = layer.direction === 'vertical';

  // Draw background
  ctx.beginPath();
  if (radius > 0) {
    roundedRect(ctx, x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
  ctx.fillStyle = bgColor || '#333333';
  ctx.fill();

  // Draw fill
  if (progress > 0) {
    const fillWidth = isVertical ? width : width * progress;
    const fillHeight = isVertical ? height * progress : height;
    const fillX = x;
    const fillY = isVertical ? y + height - fillHeight : y;

    ctx.beginPath();
    if (radius > 0) {
      // Use smaller radius for fill to fit inside background
      const fillRadius = Math.min(radius, fillWidth / 2, fillHeight / 2);
      roundedRect(ctx, fillX, fillY, fillWidth, fillHeight, fillRadius);
    } else {
      ctx.rect(fillX, fillY, fillWidth, fillHeight);
    }
    ctx.fillStyle = fillColor || '#5865F2';
    ctx.fill();
  }
}

/**
 * Draw a gradient layer
 */
async function drawGradientLayer(
  layer: GradientLayer,
  context: LayerContext
): Promise<void> {
  const { ctx, resolveValue, resolveColor } = context;

  const x = await resolveValue<number>(layer.x);
  const y = await resolveValue<number>(layer.y);
  const width = await resolveValue<number>(layer.width);
  const height = await resolveValue<number>(layer.height);
  const radius = layer.radius ?? 0;

  // Create gradient based on direction
  let gradient: CanvasGradient;
  switch (layer.direction) {
    case 'vertical':
      gradient = ctx.createLinearGradient(x, y, x, y + height);
      break;
    case 'diagonal':
      gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      break;
    case 'horizontal':
    default:
      gradient = ctx.createLinearGradient(x, y, x + width, y);
      break;
  }

  // Add color stops
  for (const stop of layer.stops) {
    const color = await resolveColor(stop.color);
    gradient.addColorStop(stop.offset, color);
  }

  // Draw
  ctx.beginPath();
  if (radius > 0) {
    roundedRect(ctx, x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
  ctx.fillStyle = gradient;
  ctx.fill();
}

/**
 * Helper to draw a rounded rectangle
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Parse a color value to a CSS color string
 */
export function parseColor(color: Color | undefined): string {
  if (!color) return '#000000';
  if (typeof color === 'string') return color;
  if (typeof color === 'number') {
    // Convert number to hex color
    return '#' + color.toString(16).padStart(6, '0');
  }

  // Handle Color object with r, g, b, a
  if (typeof color === 'object' && 'r' in color && 'g' in color && 'b' in color) {
    if (color.a !== undefined) {
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
    }
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  return '#000000';
}
