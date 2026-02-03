/**
 * UI Components module
 */

import type {
  ButtonComponent,
  SelectMenuComponent,
  ModalDefinition,
} from '@furlow/schema';
import type { ExpressionEvaluator } from '../expression/evaluator.js';

export interface ComponentRegistry {
  buttons: Map<string, ButtonComponent>;
  selects: Map<string, SelectMenuComponent>;
  modals: Map<string, ModalDefinition>;
}

export class ComponentManager {
  private buttons: Map<string, ButtonComponent> = new Map();
  private selects: Map<string, SelectMenuComponent> = new Map();
  private modals: Map<string, ModalDefinition> = new Map();

  /**
   * Register components
   */
  register(components: {
    buttons?: Record<string, ButtonComponent>;
    selects?: Record<string, SelectMenuComponent>;
    modals?: Record<string, ModalDefinition>;
  }): void {
    if (components.buttons) {
      for (const [name, button] of Object.entries(components.buttons)) {
        this.buttons.set(name, button);
      }
    }

    if (components.selects) {
      for (const [name, select] of Object.entries(components.selects)) {
        this.selects.set(name, select);
      }
    }

    if (components.modals) {
      for (const [name, modal] of Object.entries(components.modals)) {
        this.modals.set(name, modal);
      }
    }
  }

  /**
   * Get a button by name
   */
  getButton(name: string): ButtonComponent | undefined {
    return this.buttons.get(name);
  }

  /**
   * Get a select menu by name
   */
  getSelect(name: string): SelectMenuComponent | undefined {
    return this.selects.get(name);
  }

  /**
   * Get a modal by name
   */
  getModal(name: string): ModalDefinition | undefined {
    return this.modals.get(name);
  }

  /**
   * Build a button for Discord.js
   */
  async buildButton(
    config: ButtonComponent,
    context: Record<string, unknown>,
    evaluator: ExpressionEvaluator
  ): Promise<Record<string, unknown>> {
    const button: Record<string, unknown> = {
      type: 2, // Button type
      style: this.getButtonStyle(config.style ?? 'primary'),
    };

    if (config.custom_id) {
      button.custom_id = config.custom_id;
    }

    if (config.label) {
      button.label = await evaluator.interpolate(config.label, context);
    }

    if (config.emoji) {
      const emoji = await evaluator.interpolate(config.emoji, context);
      button.emoji = this.parseEmoji(emoji);
    }

    if (config.url) {
      button.url = await evaluator.interpolate(config.url, context);
    }

    if (config.disabled) {
      button.disabled = config.disabled;
    }

    return button;
  }

  /**
   * Build a select menu for Discord.js
   */
  async buildSelect(
    config: SelectMenuComponent,
    context: Record<string, unknown>,
    evaluator: ExpressionEvaluator
  ): Promise<Record<string, unknown>> {
    const select: Record<string, unknown> = {
      type: this.getSelectType(config.type),
      custom_id: config.custom_id,
    };

    if (config.placeholder) {
      select.placeholder = await evaluator.interpolate(config.placeholder, context);
    }

    if (config.min_values !== undefined) {
      select.min_values = config.min_values;
    }

    if (config.max_values !== undefined) {
      select.max_values = config.max_values;
    }

    if (config.disabled) {
      select.disabled = config.disabled;
    }

    if (config.options) {
      // Handle options as either expression or array
      const resolvedOptions = typeof config.options === 'string'
        ? await evaluator.evaluate(config.options, context) as Array<{ label: string; value: string; description?: string; emoji?: string; default?: boolean }>
        : config.options;

      if (Array.isArray(resolvedOptions)) {
        select.options = await Promise.all(
          resolvedOptions.map(async (opt) => ({
            label: typeof opt.label === 'string' && opt.label.includes('${')
              ? await evaluator.interpolate(opt.label, context)
              : opt.label,
            value: typeof opt.value === 'string' && opt.value.includes('${')
              ? await evaluator.interpolate(opt.value, context)
              : opt.value,
            description: opt.description
              ? typeof opt.description === 'string' && opt.description.includes('${')
                ? await evaluator.interpolate(opt.description, context)
                : opt.description
              : undefined,
            emoji: opt.emoji ? this.parseEmoji(typeof opt.emoji === 'string' && opt.emoji.includes('${')
              ? await evaluator.interpolate(opt.emoji, context)
              : opt.emoji) : undefined,
            default: opt.default,
          }))
        );
      }
    }

    return select;
  }

  /**
   * Build a modal for Discord.js
   */
  async buildModal(
    config: ModalDefinition,
    context: Record<string, unknown>,
    evaluator: ExpressionEvaluator
  ): Promise<Record<string, unknown>> {
    return {
      custom_id: config.custom_id,
      title: await evaluator.interpolate(config.title, context),
      components: await Promise.all(
        config.components.map(async (row) => ({
          type: 1, // Action row
          components: await Promise.all(
            row.components.map(async (comp) => {
              if (comp.type === 'text_input') {
                return {
                  type: 4, // Text input
                  custom_id: comp.custom_id,
                  label: await evaluator.interpolate(comp.label, context),
                  style: comp.style === 'paragraph' ? 2 : 1,
                  placeholder: comp.placeholder
                    ? await evaluator.interpolate(comp.placeholder, context)
                    : undefined,
                  value: comp.value
                    ? await evaluator.interpolate(comp.value, context)
                    : undefined,
                  min_length: comp.min_length,
                  max_length: comp.max_length,
                  required: comp.required,
                };
              }
              return comp;
            })
          ),
        }))
      ),
    };
  }

  /**
   * Get Discord button style number
   */
  private getButtonStyle(style: string): number {
    const styles: Record<string, number> = {
      primary: 1,
      secondary: 2,
      success: 3,
      danger: 4,
      link: 5,
    };
    return styles[style] ?? 1;
  }

  /**
   * Get Discord select type number
   */
  private getSelectType(type: string): number {
    const types: Record<string, number> = {
      select: 3,
      string_select: 3,
      user_select: 5,
      role_select: 6,
      mentionable_select: 7,
      channel_select: 8,
    };
    return types[type] ?? 3;
  }

  /**
   * Parse emoji string to object
   */
  private parseEmoji(emoji: string): Record<string, unknown> | string {
    // Check if it's a custom emoji <:name:id> or <a:name:id>
    const customMatch = emoji.match(/^<(a)?:(\w+):(\d+)>$/);
    if (customMatch) {
      return {
        name: customMatch[2],
        id: customMatch[3],
        animated: !!customMatch[1],
      };
    }

    // Unicode emoji
    return { name: emoji };
  }
}

/**
 * Create a component manager
 */
export function createComponentManager(): ComponentManager {
  return new ComponentManager();
}
