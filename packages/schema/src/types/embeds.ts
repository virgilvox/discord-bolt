/**
 * Embed and Theme types
 */

import type { Expression, Color, Url } from './common.js';

/** Embed author */
export interface EmbedAuthor {
  name: Expression;
  url?: Url;
  icon_url?: Url;
}

/** Embed footer */
export interface EmbedFooter {
  text: Expression;
  icon_url?: Url;
}

/** Embed field */
export interface EmbedField {
  name: Expression;
  value: Expression;
  inline?: boolean;
}

/** Embed image/thumbnail */
export interface EmbedImage {
  url: Url;
  width?: number;
  height?: number;
}

/** Embed definition */
export interface EmbedDefinition {
  title?: Expression;
  description?: Expression;
  url?: Url;
  color?: Color | Expression;
  timestamp?: Expression | 'now';
  author?: EmbedAuthor;
  footer?: EmbedFooter;
  fields?: EmbedField[];
  image?: EmbedImage | Url;
  thumbnail?: EmbedImage | Url;
}

/** Named embed template */
export interface EmbedTemplate extends EmbedDefinition {
  name: string;
}

/** Theme colors */
export interface ThemeColors {
  primary?: Color;
  secondary?: Color;
  success?: Color;
  warning?: Color;
  error?: Color;
  info?: Color;
}

/** Theme configuration */
export interface ThemeConfig {
  colors?: ThemeColors;
  embeds?: EmbedTemplate[];
  default_footer?: EmbedFooter;
  default_author?: EmbedAuthor;
}

/** Embeds configuration */
export interface EmbedsConfig {
  theme?: ThemeConfig;
  templates?: Record<string, EmbedDefinition>;
}
