/**
 * Embeds and theming module
 */

import type {
  EmbedDefinition,
  ThemeConfig,
  Color,
} from '@furlow/schema';
import type { ExpressionEvaluator } from '../expression/evaluator.js';

export class EmbedBuilder {
  private theme: ThemeConfig = {};
  private templates: Map<string, EmbedDefinition> = new Map();

  /**
   * Configure the embed builder
   */
  configure(config: {
    theme?: ThemeConfig;
    templates?: Record<string, EmbedDefinition>;
  }): void {
    if (config.theme) {
      this.theme = config.theme;
    }

    if (config.templates) {
      for (const [name, template] of Object.entries(config.templates)) {
        this.templates.set(name, template);
      }
    }
  }

  /**
   * Build an embed for Discord.js
   */
  async build(
    definition: EmbedDefinition | string,
    context: Record<string, unknown>,
    evaluator: ExpressionEvaluator
  ): Promise<Record<string, unknown>> {
    // If string, look up template
    let def: EmbedDefinition;
    if (typeof definition === 'string') {
      const template = this.templates.get(definition);
      if (!template) {
        throw new Error(`Embed template not found: ${definition}`);
      }
      def = template;
    } else {
      def = definition;
    }

    const embed: Record<string, unknown> = {};

    if (def.title) {
      embed.title = await evaluator.interpolate(def.title, context);
    }

    if (def.description) {
      embed.description = await evaluator.interpolate(def.description, context);
    }

    if (def.url) {
      embed.url = def.url;
    }

    if (def.color) {
      embed.color = await this.resolveColor(def.color, context, evaluator);
    }

    if (def.timestamp) {
      if (def.timestamp === 'now') {
        embed.timestamp = new Date().toISOString();
      } else {
        const ts = await evaluator.interpolate(def.timestamp, context);
        embed.timestamp = new Date(ts).toISOString();
      }
    }

    if (def.author) {
      embed.author = {
        name: await evaluator.interpolate(def.author.name, context),
        url: def.author.url,
        icon_url: def.author.icon_url,
      };
    } else if (this.theme.default_author) {
      embed.author = {
        name: await evaluator.interpolate(this.theme.default_author.name, context),
        url: this.theme.default_author.url,
        icon_url: this.theme.default_author.icon_url,
      };
    }

    if (def.footer) {
      embed.footer = {
        text: await evaluator.interpolate(def.footer.text, context),
        icon_url: def.footer.icon_url,
      };
    } else if (this.theme.default_footer) {
      embed.footer = {
        text: await evaluator.interpolate(this.theme.default_footer.text, context),
        icon_url: this.theme.default_footer.icon_url,
      };
    }

    if (def.fields) {
      embed.fields = await Promise.all(
        def.fields.map(async (field) => ({
          name: await evaluator.interpolate(field.name, context),
          value: await evaluator.interpolate(field.value, context),
          inline: field.inline ?? false,
        }))
      );
    }

    if (def.image) {
      if (typeof def.image === 'string') {
        embed.image = { url: def.image };
      } else {
        embed.image = {
          url: def.image.url,
          width: def.image.width,
          height: def.image.height,
        };
      }
    }

    if (def.thumbnail) {
      if (typeof def.thumbnail === 'string') {
        embed.thumbnail = { url: def.thumbnail };
      } else {
        embed.thumbnail = {
          url: def.thumbnail.url,
          width: def.thumbnail.width,
          height: def.thumbnail.height,
        };
      }
    }

    return embed;
  }

  /**
   * Build multiple embeds
   */
  async buildMany(
    definitions: (EmbedDefinition | string)[],
    context: Record<string, unknown>,
    evaluator: ExpressionEvaluator
  ): Promise<Record<string, unknown>[]> {
    return Promise.all(definitions.map((def) => this.build(def, context, evaluator)));
  }

  /**
   * Resolve a color to a number
   */
  private async resolveColor(
    color: Color | string,
    context: Record<string, unknown>,
    evaluator: ExpressionEvaluator
  ): Promise<number> {
    // If it's a number, return directly
    if (typeof color === 'number') {
      return color;
    }

    // If it's an RGB object, convert to number
    if (typeof color === 'object' && color !== null && 'r' in color) {
      return (color.r << 16) | (color.g << 8) | color.b;
    }

    // Check if it's a theme color name
    if (typeof color === 'string' && this.theme.colors && color in this.theme.colors) {
      const themeColor = this.theme.colors[color as keyof typeof this.theme.colors];
      if (typeof themeColor === 'number') {
        return themeColor;
      }
      color = themeColor as string;
    }

    // If it contains ${}, evaluate as expression
    if (typeof color === 'string' && color.includes('${')) {
      color = await evaluator.interpolate(color, context);
    }

    // Parse hex color
    if (typeof color === 'string' && color.startsWith('#')) {
      return parseInt(color.slice(1), 16);
    }

    // Parse named colors
    const namedColors: Record<string, number> = {
      red: 0xff0000,
      green: 0x00ff00,
      blue: 0x0000ff,
      yellow: 0xffff00,
      orange: 0xffa500,
      purple: 0x800080,
      pink: 0xffc0cb,
      white: 0xffffff,
      black: 0x000000,
      gray: 0x808080,
      grey: 0x808080,
      gold: 0xffd700,
      blurple: 0x5865f2,
    };

    if (typeof color === 'string') {
      return namedColors[color.toLowerCase()] ?? 0x000000;
    }

    return 0x000000;
  }

  /**
   * Get a template by name
   */
  getTemplate(name: string): EmbedDefinition | undefined {
    return this.templates.get(name);
  }

  /**
   * Get all template names
   */
  getTemplateNames(): string[] {
    return [...this.templates.keys()];
  }

  /**
   * Get theme colors
   */
  getThemeColors(): ThemeConfig['colors'] {
    return this.theme.colors;
  }
}

/**
 * Create an embed builder
 */
export function createEmbedBuilder(): EmbedBuilder {
  return new EmbedBuilder();
}
