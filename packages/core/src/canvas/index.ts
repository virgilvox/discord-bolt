/**
 * Canvas module - image generation for welcome cards, rank cards, etc.
 */

import type {
  CanvasConfig,
  CanvasGenerator,
  CanvasLayer,
  Color,
} from '@furlow/schema';
import type { ExpressionEvaluator } from '../expression/evaluator.js';
import { drawLayer, parseColor, type LayerContext } from './layers.js';

// Re-export layer utilities
export { drawLayer, parseColor } from './layers.js';
export type { LayerContext } from './layers.js';

// Re-export built-in generators
export {
  createWelcomeGenerator,
  welcomeGenerator,
  welcomeDarkGenerator,
  welcomeLightGenerator,
  welcomeMinimalGenerator,
  createRankGenerator,
  rankGenerator,
  rankDarkGenerator,
  rankGradientGenerator,
  rankMinimalGenerator,
} from './generators/index.js';
export type { WelcomeCardOptions, RankCardOptions } from './generators/index.js';

export interface RenderOptions {
  /** Output format */
  format?: 'png' | 'jpeg';
  /** JPEG quality (0-1) */
  quality?: number;
}

export interface CanvasRendererOptions {
  /** Expression evaluator for dynamic values */
  evaluator?: ExpressionEvaluator;
}

// Canvas module types (defined locally since canvas is optional)
interface CanvasModule {
  createCanvas(width: number, height: number): Canvas;
  loadImage(src: string): Promise<Image>;
  registerFont(path: string, options: { family: string }): void;
}

interface Canvas {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D;
  toBuffer(mime: 'image/png'): Buffer;
  toBuffer(mime: 'image/jpeg', options?: { quality?: number }): Buffer;
}

interface CanvasRenderingContext2D {
  fillStyle: string | CanvasGradient;
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
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

type CanvasTextAlign = 'left' | 'center' | 'right';
type CanvasTextBaseline = 'top' | 'middle' | 'bottom' | 'alphabetic';

/**
 * Canvas renderer for generating images from layer definitions
 */
export class CanvasRenderer {
  private generators: Map<string, CanvasGenerator> = new Map();
  private fonts: Map<string, string> = new Map();
  private evaluator?: ExpressionEvaluator;
  private canvasModule?: CanvasModule;
  private initialized = false;

  constructor(options: CanvasRendererOptions = {}) {
    this.evaluator = options.evaluator;
  }

  /**
   * Initialize the canvas module (lazy load)
   */
  private async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import of canvas module (typed as unknown first since it's optional)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const canvasModule = await (Function('return import("canvas")')() as Promise<unknown>);
      this.canvasModule = canvasModule as CanvasModule;
      this.initialized = true;

      // Register fonts
      for (const [name, path] of this.fonts) {
        this.canvasModule!.registerFont(path, { family: name });
      }
    } catch {
      throw new Error(
        'Canvas module not available. Install it with: npm install canvas\n' +
        'Note: canvas requires native build tools. See https://github.com/Automattic/node-canvas#compiling'
      );
    }
  }

  /**
   * Configure the renderer with fonts and generators
   */
  configure(config: CanvasConfig): void {
    if (config.fonts) {
      for (const [name, path] of Object.entries(config.fonts)) {
        this.fonts.set(name, path);
      }
    }

    if (config.generators) {
      for (const [name, generator] of Object.entries(config.generators)) {
        this.generators.set(name, generator);
      }
    }
  }

  /**
   * Set the expression evaluator
   */
  setEvaluator(evaluator: ExpressionEvaluator): void {
    this.evaluator = evaluator;
  }

  /**
   * Render an image using a generator
   */
  async render(
    generatorName: string,
    context: Record<string, unknown> = {},
    options: RenderOptions = {}
  ): Promise<Buffer> {
    const generator = this.generators.get(generatorName);
    if (!generator) {
      throw new Error(`Canvas generator not found: ${generatorName}`);
    }

    return this.renderGenerator(generator, context, options);
  }

  /**
   * Render an image directly from a generator definition
   */
  async renderGenerator(
    generator: CanvasGenerator,
    context: Record<string, unknown> = {},
    options: RenderOptions = {}
  ): Promise<Buffer> {
    await this.init();

    const { createCanvas, loadImage } = this.canvasModule!;
    const canvas = createCanvas(generator.width, generator.height);
    const ctx = canvas.getContext('2d');

    // Draw background
    if (generator.background) {
      const bgColor = await this.resolveColor(generator.background, context);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, generator.width, generator.height);
    }

    // Create layer context
    const layerContext: LayerContext = {
      ctx,
      canvas,
      loadImage: async (src: string) => {
        return loadImage(src) as Promise<Image>;
      },
      resolveValue: async <T>(value: T | string): Promise<T> => {
        return this.resolveValue(value, context);
      },
      resolveColor: async (color: Color | string | undefined): Promise<string> => {
        return this.resolveColor(color, context);
      },
    };

    // Draw each layer
    for (const layer of generator.layers) {
      await drawLayer(layer, layerContext);
    }

    // Convert to buffer
    const format = options.format ?? 'png';
    if (format === 'jpeg') {
      return canvas.toBuffer('image/jpeg', { quality: options.quality ?? 0.9 });
    }
    return canvas.toBuffer('image/png');
  }

  /**
   * Render layers directly (without a generator)
   */
  async renderLayers(
    width: number,
    height: number,
    layers: CanvasLayer[],
    context: Record<string, unknown> = {},
    options: RenderOptions & { background?: Color | string } = {}
  ): Promise<Buffer> {
    await this.init();

    const { createCanvas, loadImage } = this.canvasModule!;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw background
    if (options.background) {
      const bgColor = await this.resolveColor(options.background, context);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Create layer context
    const layerContext: LayerContext = {
      ctx,
      canvas,
      loadImage: async (src: string) => {
        return loadImage(src) as Promise<Image>;
      },
      resolveValue: async <T>(value: T | string): Promise<T> => {
        return this.resolveValue(value, context);
      },
      resolveColor: async (color: Color | string | undefined): Promise<string> => {
        return this.resolveColor(color, context);
      },
    };

    // Draw each layer
    for (const layer of layers) {
      await drawLayer(layer, layerContext);
    }

    // Convert to buffer
    const format = options.format ?? 'png';
    if (format === 'jpeg') {
      return canvas.toBuffer('image/jpeg', { quality: options.quality ?? 0.9 });
    }
    return canvas.toBuffer('image/png');
  }

  /**
   * Resolve a value that may be an expression
   */
  private async resolveValue<T>(
    value: T | string,
    context: Record<string, unknown>
  ): Promise<T> {
    if (typeof value !== 'string') {
      return value;
    }

    // Check if it looks like an expression
    if (this.evaluator && (value.includes('${') || value.includes('.'))) {
      try {
        // Try interpolation first for ${} syntax
        if (value.includes('${')) {
          const result = await this.evaluator.interpolate(value, context);
          // Try to parse as number if it looks like one
          const num = Number(result);
          if (!isNaN(num)) {
            return num as unknown as T;
          }
          return result as unknown as T;
        }

        // Otherwise evaluate as expression
        return await this.evaluator.evaluate<T>(value, context);
      } catch {
        // If evaluation fails, return the string as-is
        return value as unknown as T;
      }
    }

    return value as unknown as T;
  }

  /**
   * Resolve a color value
   */
  private async resolveColor(
    color: Color | string | undefined,
    context: Record<string, unknown>
  ): Promise<string> {
    if (!color) return '#000000';

    if (typeof color === 'string') {
      // Check if it's an expression
      if (this.evaluator && color.includes('${')) {
        const resolved = await this.evaluator.interpolate(color, context);
        return resolved;
      }
      return color;
    }

    return parseColor(color);
  }

  /**
   * Get a generator by name
   */
  getGenerator(name: string): CanvasGenerator | undefined {
    return this.generators.get(name);
  }

  /**
   * Get all generator names
   */
  getGeneratorNames(): string[] {
    return [...this.generators.keys()];
  }

  /**
   * Register a custom generator
   */
  registerGenerator(name: string, generator: CanvasGenerator): void {
    this.generators.set(name, generator);
  }

  /**
   * Register a font (must be called before rendering)
   */
  registerFont(name: string, path: string): void {
    this.fonts.set(name, path);

    // If already initialized, register immediately
    if (this.initialized && this.canvasModule) {
      this.canvasModule.registerFont(path, { family: name });
    }
  }

  /**
   * Check if canvas module is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.init();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a canvas renderer
 */
export function createCanvasRenderer(
  options?: CanvasRendererOptions
): CanvasRenderer {
  return new CanvasRenderer(options);
}
