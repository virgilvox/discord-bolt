/**
 * Component action handlers (modals, buttons, select menus)
 */

import type { ActionRegistry } from '../registry.js';
import type { ActionHandler, ActionContext, ActionResult } from '../types.js';
import type { HandlerDependencies } from './index.js';
import type { ShowModalAction } from '@furlow/schema';
import {
  type ModalBuilder,
  type TextInputBuilder,
  type ActionRowBuilder,
  ModalBuilder as DiscordModalBuilder,
  TextInputBuilder as DiscordTextInputBuilder,
  ActionRowBuilder as DiscordActionRowBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';

/**
 * Build a modal from configuration
 */
async function buildModal(
  config: any,
  context: ActionContext,
  deps: HandlerDependencies
): Promise<ModalBuilder> {
  const { evaluator } = deps;

  const modal = new DiscordModalBuilder();

  // Set custom ID
  const customId = config.custom_id || config.customId || config.id;
  if (customId) {
    const resolvedId = await evaluator.interpolate(String(customId), context);
    modal.setCustomId(resolvedId);
  }

  // Set title
  if (config.title) {
    const title = await evaluator.interpolate(String(config.title), context);
    modal.setTitle(title);
  }

  // Add components (text inputs)
  if (config.components || config.fields || config.inputs) {
    const components = config.components || config.fields || config.inputs;
    const rows: ActionRowBuilder<TextInputBuilder>[] = [];

    for (const component of components) {
      const row = new DiscordActionRowBuilder<TextInputBuilder>();
      const input = new DiscordTextInputBuilder();

      // Custom ID
      const inputId = component.custom_id || component.customId || component.id || component.name;
      if (inputId) {
        input.setCustomId(await evaluator.interpolate(String(inputId), context));
      }

      // Label
      if (component.label) {
        input.setLabel(await evaluator.interpolate(String(component.label), context));
      }

      // Style
      const style = component.style || 'short';
      input.setStyle(style === 'paragraph' || style === 'long'
        ? TextInputStyle.Paragraph
        : TextInputStyle.Short);

      // Placeholder
      if (component.placeholder) {
        input.setPlaceholder(await evaluator.interpolate(String(component.placeholder), context));
      }

      // Default value
      if (component.value || component.default) {
        const value = component.value || component.default;
        input.setValue(await evaluator.interpolate(String(value), context));
      }

      // Required
      if (component.required !== undefined) {
        input.setRequired(component.required);
      }

      // Min/max length
      if (component.min_length !== undefined) {
        input.setMinLength(component.min_length);
      }
      if (component.max_length !== undefined) {
        input.setMaxLength(component.max_length);
      }

      row.addComponents(input);
      rows.push(row);
    }

    modal.addComponents(...rows);
  }

  return modal;
}

/**
 * Show modal action handler
 */
const showModalHandler: ActionHandler<ShowModalAction> = {
  name: 'show_modal',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;

    const interaction = context.interaction as
      | ChatInputCommandInteraction
      | ButtonInteraction
      | StringSelectMenuInteraction
      | undefined;

    if (!interaction) {
      return { success: false, error: new Error('No interaction to show modal') };
    }

    if (!('showModal' in interaction)) {
      return { success: false, error: new Error('This interaction type cannot show modals') };
    }

    try {
      let modal: ModalBuilder;

      if (typeof config.modal === 'string') {
        // Modal is a reference to a pre-defined modal
        // Look up in spec.components
        const components = (context as any)._components;
        if (components && components[config.modal]) {
          modal = await buildModal(components[config.modal], context, deps);
        } else {
          return { success: false, error: new Error(`Modal "${config.modal}" not found`) };
        }
      } else {
        // Modal is inline definition
        modal = await buildModal(config.modal, context, deps);
      }

      await interaction.showModal(modal);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Register all component handlers
 */
export function registerComponentHandlers(
  registry: ActionRegistry,
  deps: HandlerDependencies
): void {
  registry.register(showModalHandler);
}
