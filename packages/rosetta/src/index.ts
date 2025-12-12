/**
 * @sylphx/rosetta - Lightweight i18n with LLM-powered translation
 *
 * Core package exports pure functions only - zero Node.js dependencies.
 * For server-side features (Rosetta class, context), use '@sylphx/rosetta-next/server'
 * For React hooks, use '@sylphx/rosetta-next'
 *
 * @example
 * // Pure utility functions
 * import { hashText, formatMessage, validateLocale } from '@sylphx/rosetta'
 *
 * const hash = hashText("Hello World")
 * const formatted = formatMessage("Hello {name}", { name: "World" })
 *
 * @example
 * // Server-side (Next.js)
 * import { createRosetta, getTranslations } from '@sylphx/rosetta-next/server'
 *
 * @example
 * // Client-side (React)
 * import { useTranslations, useLocale } from '@sylphx/rosetta-next'
 */

// ============================================
// Hash Function
// ============================================

export { hashText } from './hash';

// ============================================
// ICU MessageFormat
// ============================================

export {
	formatMessage,
	createPluralRulesCache,
	getPluralCategory,
	MAX_ICU_NESTING_DEPTH,
	MAX_TEXT_LENGTH as MAX_ICU_TEXT_LENGTH,
	MAX_ICU_ITERATIONS,
	type PluralRulesCache,
	type FormatMessageOptions,
} from './icu';

// ============================================
// Simple Interpolation
// ============================================

export { interpolate } from './interpolate';

// ============================================
// Locale Utilities
// ============================================

export {
	ALL_LOCALES,
	DEFAULT_LOCALE,
	getLocaleEnglishName,
	getLocaleInfo,
	getLocaleNativeName,
	type LocaleCode,
	localeNames,
} from './locales';

// ============================================
// Validation
// ============================================

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

// ============================================
// Locale Chain Utility
// ============================================

/**
 * Build locale fallback chain
 * e.g., 'zh-TW' → ['zh-TW', 'zh', 'en']
 */
export function buildLocaleChain(locale: string, defaultLocale: string): string[] {
	const chain: string[] = [locale];

	// Add parent locale if exists (zh-TW → zh)
	if (locale.includes('-')) {
		const parent = locale.split('-')[0]!;
		if (!chain.includes(parent)) {
			chain.push(parent);
		}
	}

	// Add default locale as final fallback
	if (!chain.includes(defaultLocale)) {
		chain.push(defaultLocale);
	}

	return chain;
}

/**
 * Validate locale format (BCP 47 basic pattern)
 */
export function isValidLocale(locale: string): boolean {
	// BCP 47 basic pattern: xx or xx-XX or xx-xxxx (script)
	return /^[a-z]{2}(-[A-Z]{2})?$/.test(locale) || /^[a-z]{2}-[a-z]{4}$/i.test(locale);
}

// ============================================
// Types
// ============================================

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
	CacheAdapter,
	// Context types
	RosettaContext,
} from './types';
