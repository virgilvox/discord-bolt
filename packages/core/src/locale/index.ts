/**
 * Localization module
 */

import type { LocaleConfig, DiscordLocale } from '@furlow/schema';

export class LocaleManager {
  private locales: Map<DiscordLocale, Record<string, string | Record<string, string>>> = new Map();
  private defaultLocale: DiscordLocale = 'en-US';
  private fallbackLocale: DiscordLocale = 'en-US';

  /**
   * Configure the locale manager
   */
  configure(config: LocaleConfig): void {
    this.defaultLocale = config.default ?? 'en-US';
    this.fallbackLocale = config.fallback ?? 'en-US';

    if (config.locales) {
      for (const [locale, strings] of Object.entries(config.locales)) {
        this.locales.set(locale as DiscordLocale, strings);
      }
    }
  }

  /**
   * Get a localized string
   */
  get(key: string, locale?: DiscordLocale, params?: Record<string, unknown>): string {
    const targetLocale = locale ?? this.defaultLocale;
    const strings = this.locales.get(targetLocale) ?? this.locales.get(this.fallbackLocale);

    if (!strings) return key;

    // Handle nested keys like "commands.ban.description"
    const parts = key.split('.');
    let value: unknown = strings;

    for (const part of parts) {
      if (typeof value !== 'object' || value === null) {
        return key;
      }
      value = (value as Record<string, unknown>)[part];
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Interpolate params
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, name) => {
        return String(params[name] ?? `{${name}}`);
      });
    }

    return value;
  }

  /**
   * Check if a key exists
   */
  has(key: string, locale?: DiscordLocale): boolean {
    const targetLocale = locale ?? this.defaultLocale;
    const strings = this.locales.get(targetLocale);

    if (!strings) return false;

    const parts = key.split('.');
    let value: unknown = strings;

    for (const part of parts) {
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      value = (value as Record<string, unknown>)[part];
    }

    return typeof value === 'string';
  }

  /**
   * Get all available locales
   */
  getAvailableLocales(): DiscordLocale[] {
    return [...this.locales.keys()];
  }

  /**
   * Get the default locale
   */
  getDefaultLocale(): DiscordLocale {
    return this.defaultLocale;
  }

  /**
   * Add strings for a locale
   */
  addStrings(
    locale: DiscordLocale,
    strings: Record<string, string | Record<string, string>>
  ): void {
    const existing = this.locales.get(locale) ?? {};
    this.locales.set(locale, { ...existing, ...strings });
  }
}

/**
 * Create a locale manager
 */
export function createLocaleManager(): LocaleManager {
  return new LocaleManager();
}
