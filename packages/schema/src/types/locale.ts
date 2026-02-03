/**
 * Localization types
 */

import type { Expression } from './common.js';

/** Supported Discord locales */
export type DiscordLocale =
  | 'en-US'
  | 'en-GB'
  | 'bg'
  | 'zh-CN'
  | 'zh-TW'
  | 'hr'
  | 'cs'
  | 'da'
  | 'nl'
  | 'fi'
  | 'fr'
  | 'de'
  | 'el'
  | 'hi'
  | 'hu'
  | 'id'
  | 'it'
  | 'ja'
  | 'ko'
  | 'lt'
  | 'no'
  | 'pl'
  | 'pt-BR'
  | 'ro'
  | 'ru'
  | 'es-ES'
  | 'sv-SE'
  | 'th'
  | 'tr'
  | 'uk'
  | 'vi';

/** Locale strings */
export type LocaleStrings = Record<string, string | Record<string, string>>;

/** Locale configuration */
export interface LocaleConfig {
  default?: DiscordLocale;
  fallback?: DiscordLocale;
  locales?: Record<DiscordLocale, LocaleStrings>;
}
