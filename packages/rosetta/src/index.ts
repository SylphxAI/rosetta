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
	RosettaContext,
} from './types';

// Validation utilities (browser-safe)
export {
	// Constants
	MAX_TEXT_LENGTH,
	MAX_LOCALE_LENGTH,
	MAX_CONTEXT_LENGTH,
	MAX_HASH_LENGTH,
	MAX_BATCH_SIZE,
	// Validation functions
	validateText,
	validateLocale,
	validateContext,
	validateHash,
	validateBatchSize,
	// Assertion helpers
	assertValidText,
	assertValidLocale,
	assertValidContext,
	assertValidHash,
	assertValidBatchSize,
	// Types
	type ValidationResult,
} from './validation';
