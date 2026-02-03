/**
 * UI Component types
 */

import type { Expression, SimpleCondition } from './common.js';
import type { Action } from './actions.js';

/** Button style */
export type ButtonStyle = 'primary' | 'secondary' | 'success' | 'danger' | 'link';

/** Button component */
export interface ButtonComponent {
  type: 'button';
  custom_id?: string;
  label?: Expression;
  style?: ButtonStyle;
  emoji?: Expression;
  url?: Expression;
  disabled?: boolean;
  actions?: Action[];
  when?: SimpleCondition;
}

/** Select menu option */
export interface SelectOption {
  label: Expression;
  value: Expression;
  description?: Expression;
  emoji?: Expression;
  default?: boolean;
}

/** Select menu component */
export interface SelectMenuComponent {
  type: 'select' | 'select_menu' | 'string_select' | 'user_select' | 'role_select' | 'channel_select' | 'mentionable_select';
  custom_id: string | Expression;
  placeholder?: Expression;
  min_values?: number;
  max_values?: number | Expression;
  disabled?: boolean;
  options?: SelectOption[] | Expression;
  channel_types?: ('text' | 'voice' | 'category' | 'announcement' | 'stage' | 'forum')[];
  actions?: Action[];
  when?: SimpleCondition;
}

/** Text input style */
export type TextInputStyle = 'short' | 'paragraph';

/** Text input component (for modals) */
export interface TextInputComponent {
  type: 'text_input';
  custom_id: string;
  label: Expression;
  style?: TextInputStyle;
  placeholder?: Expression;
  value?: Expression;
  min_length?: number;
  max_length?: number;
  required?: boolean;
}

/** Action row component */
export interface ActionRowComponent {
  type: 'action_row';
  components: (ButtonComponent | SelectMenuComponent | TextInputComponent)[];
}

/** Modal definition */
export interface ModalDefinition {
  custom_id: string;
  title: Expression;
  components: ActionRowComponent[];
  actions?: Action[];
}

/** Any component */
export type ComponentDefinition =
  | ButtonComponent
  | SelectMenuComponent
  | TextInputComponent
  | ActionRowComponent
  | ModalDefinition;

/** Components configuration */
export interface ComponentsConfig {
  buttons?: Record<string, ButtonComponent>;
  selects?: Record<string, SelectMenuComponent>;
  modals?: Record<string, ModalDefinition>;
}
