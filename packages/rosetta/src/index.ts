/**
 * @sylphx/rosetta - Lightweight i18n with LLM-powered translation
 *
 * Main entry point exports browser-safe utilities only.
 * For server-side features, import from '@sylphx/rosetta/server'
 * For React bindings, use '@sylphx/rosetta-react'
 * For adapters, import from '@sylphx/rosetta/adapters'
 */

// Hash function (browser-safe)
export { hashText } from './hash';

// Interpolation (browser-safe)
export { interpolate } from './interpolate';

// Locale utilities (browser-safe)
export {
	ALL_LOCALES,
	DEFAULT_LOCALE,
	getLocaleEnglishName,
	getLocaleInfo,
	getLocaleNativeName,
	type LocaleCode,
	localeNames,
} from './locales';

// Type exports
export type {
	// Core types
	SourceString,
	Translation,
	TranslationStatus,
	SourceWithStatus,
	TranslationStats,
	LocaleInfo,
	TranslateOptions,
	// Adapter interfaces
	StorageAdapter,
	TranslateAdapter,
	// Context types
	I18nContext,
} from './types';
