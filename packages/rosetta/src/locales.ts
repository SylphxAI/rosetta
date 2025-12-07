import type { LocaleInfo } from './types';

/**
 * Comprehensive list of supported locales
 */
export const ALL_LOCALES: readonly LocaleInfo[] = [
	// English variants
	{ code: 'en', name: 'English', nativeName: 'English' },
	{ code: 'en-US', name: 'English (US)', nativeName: 'English (US)' },
	{ code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)' },
	{ code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)' },
	{ code: 'en-CA', name: 'English (Canada)', nativeName: 'English (Canada)' },

	// Chinese variants
	{ code: 'zh-TW', name: 'Traditional Chinese (Taiwan)', nativeName: '繁體中文 (台灣)' },
	{ code: 'zh-HK', name: 'Traditional Chinese (Hong Kong)', nativeName: '繁體中文 (香港)' },
	{ code: 'zh-CN', name: 'Simplified Chinese (China)', nativeName: '简体中文 (中国)' },

	// Japanese & Korean
	{ code: 'ja', name: 'Japanese', nativeName: '日本語' },
	{ code: 'ko', name: 'Korean', nativeName: '한국어' },

	// Spanish variants
	{ code: 'es', name: 'Spanish', nativeName: 'Español' },
	{ code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)' },
	{ code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)' },

	// Portuguese variants
	{ code: 'pt', name: 'Portuguese', nativeName: 'Português' },
	{ code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
	{ code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)' },

	// French variants
	{ code: 'fr', name: 'French', nativeName: 'Français' },
	{ code: 'fr-FR', name: 'French (France)', nativeName: 'Français (France)' },
	{ code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)' },

	// German variants
	{ code: 'de', name: 'German', nativeName: 'Deutsch' },
	{ code: 'de-DE', name: 'German (Germany)', nativeName: 'Deutsch (Deutschland)' },
	{ code: 'de-AT', name: 'German (Austria)', nativeName: 'Deutsch (Österreich)' },
	{ code: 'de-CH', name: 'German (Switzerland)', nativeName: 'Deutsch (Schweiz)' },

	// Other European
	{ code: 'it', name: 'Italian', nativeName: 'Italiano' },
	{ code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
	{ code: 'ru', name: 'Russian', nativeName: 'Русский' },
	{ code: 'pl', name: 'Polish', nativeName: 'Polski' },
	{ code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
	{ code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
	{ code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
	{ code: 'da', name: 'Danish', nativeName: 'Dansk' },
	{ code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
	{ code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
	{ code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },

	// Middle Eastern
	{ code: 'ar', name: 'Arabic', nativeName: 'العربية' },
	{ code: 'he', name: 'Hebrew', nativeName: 'עברית' },

	// Asian
	{ code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
	{ code: 'th', name: 'Thai', nativeName: 'ภาษาไทย' },
	{ code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
	{ code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
] as const;

export type LocaleCode = (typeof ALL_LOCALES)[number]['code'];

/**
 * Default locale
 */
export const DEFAULT_LOCALE = 'en';

/**
 * Get locale info by code
 */
export function getLocaleInfo(code: string): LocaleInfo | undefined {
	return ALL_LOCALES.find((l) => l.code === code);
}

/**
 * Get native name for a locale code
 */
export function getLocaleNativeName(code: string): string {
	return getLocaleInfo(code)?.nativeName ?? code;
}

/**
 * Get English name for a locale code
 */
export function getLocaleEnglishName(code: string): string {
	return getLocaleInfo(code)?.name ?? code;
}

/**
 * Locale names map (code -> native name)
 */
export const localeNames: Record<string, string> = Object.fromEntries(
	ALL_LOCALES.map((l) => [l.code, l.nativeName])
);
