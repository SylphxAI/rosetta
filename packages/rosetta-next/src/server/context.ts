/**
 * Server-side translation utilities (Edge-compatible)
 *
 * This module provides translation functions that work in all JavaScript runtimes:
 * - Node.js
 * - Vercel Edge Runtime
 * - Cloudflare Workers
 * - Deno Deploy
 *
 * Uses React's cache() for per-request memoization instead of AsyncLocalStorage.
 */

import {
	DEFAULT_LOCALE,
	type PluralRulesCache,
	type TranslateOptions,
	createPluralRulesCache,
	formatMessage,
	hashText,
} from '@sylphx/rosetta';
import { cache } from 'react';

// ============================================
// Request-scoped Locale Storage (Edge-compatible)
// ============================================

/**
 * Request-scoped locale store using React cache()
 * This replaces AsyncLocalStorage for Edge compatibility
 *
 * How it works:
 * - React's cache() memoizes per-request during RSC rendering
 * - Each request gets its own isolated store object
 * - Multiple calls to getRequestLocaleStore() in the same request return the same object
 *
 * For testing:
 * - Outside RSC, cache() doesn't memoize (each call returns new object)
 * - Use _setTestLocale() to set a test-only fallback
 */
interface RequestLocaleStore {
	locale: string | null;
}

// Test-only fallback (NOT used in production RSC rendering)
let testLocale: string | null = null;
let isTestMode = false;

// React cache() for RSC context - creates isolated store per request
const getRequestLocaleStore = cache((): RequestLocaleStore => {
	// In RSC: This returns the same object for all calls within one request
	// Each new request gets a fresh object with locale: null
	return { locale: null };
});

/**
 * Enable test mode with a specific locale
 * @internal - Only for testing
 */
export function _setTestLocale(locale: string | null): void {
	isTestMode = true;
	testLocale = locale;
}

/**
 * Reset the locale store (for testing)
 * @internal
 */
export function _resetLocaleStore(): void {
	isTestMode = false;
	testLocale = null;
}

/**
 * Set the locale for the current request
 *
 * Call this once in your layout to enable `getLocale()` and
 * parameterless `getTranslations()` in all server components.
 *
 * @example
 * // app/[locale]/layout.tsx
 * import { setRequestLocale } from '@sylphx/rosetta-next/server'
 *
 * export default async function Layout({ params, children }) {
 *   const { locale } = await params
 *   setRequestLocale(locale)
 *   // ...
 * }
 *
 * // app/[locale]/page.tsx - no need to pass locale!
 * import { getTranslations } from '@sylphx/rosetta-next/server'
 *
 * export default async function Page() {
 *   const t = await getTranslations()  // Uses locale from setRequestLocale
 *   return <h1>{t("Welcome")}</h1>
 * }
 */
export function setRequestLocale(locale: string): void {
	if (isTestMode) {
		testLocale = locale;
		return;
	}
	// In RSC: cache() ensures this is the same object for the entire request
	getRequestLocaleStore().locale = locale;
}

/**
 * Get the locale set by setRequestLocale()
 * Returns null if setRequestLocale() was not called
 */
export function getRequestLocale(): string | null {
	if (isTestMode) {
		return testLocale;
	}
	// In RSC: cache() ensures this returns the same object set by setRequestLocale
	return getRequestLocaleStore().locale;
}

// ============================================
// Types
// ============================================

/**
 * Translation function type
 */
export type TranslateFunction = (
	text: string,
	paramsOrOptions?: Record<string, string | number> | TranslateOptions
) => string;

/**
 * Context for creating a translator
 */
export interface TranslatorContext {
	locale: string;
	defaultLocale: string;
	translations: Map<string, string>;
}

// ============================================
// Server-side PluralRules Cache
// ============================================

// Shared cache for server - larger size for multi-locale support
const serverPluralRulesCache: PluralRulesCache = createPluralRulesCache({ maxSize: 50 });

// ============================================
// Translation Function Factory
// ============================================

/**
 * Parse t() options to extract context and params
 *
 * Distinguishes between:
 * - TranslateOptions: { context?: string, params?: Record<string, string|number> }
 * - Direct params: Record<string, string|number> for interpolation
 *
 * Key insight: if 'params' is present and is an object, it's TranslateOptions
 */
function parseTranslateOptions(
	paramsOrOptions?: Record<string, string | number> | TranslateOptions
): { context?: string; params?: Record<string, string | number> } {
	if (!paramsOrOptions) {
		return {};
	}

	// If 'params' is present and is an object, this is definitely TranslateOptions
	if (
		'params' in paramsOrOptions &&
		typeof paramsOrOptions.params === 'object' &&
		paramsOrOptions.params !== null
	) {
		const opts = paramsOrOptions as TranslateOptions;
		return { context: opts.context, params: opts.params };
	}

	// If only 'context' is present (and it's a string), this is TranslateOptions with just context
	if (
		'context' in paramsOrOptions &&
		typeof paramsOrOptions.context === 'string' &&
		Object.keys(paramsOrOptions).length === 1
	) {
		return { context: paramsOrOptions.context as string };
	}

	// Otherwise treat as direct interpolation params
	return { params: paramsOrOptions as Record<string, string | number> };
}

/**
 * Create a translation function for a specific locale and translations
 *
 * @example
 * const translations = await rosetta.loadTranslations('zh-TW')
 * const t = createTranslator({ locale: 'zh-TW', defaultLocale: 'en', translations })
 * t("Hello World") // => "你好世界"
 */
export function createTranslator(ctx: TranslatorContext): TranslateFunction {
	const { locale, defaultLocale, translations } = ctx;

	return (
		text: string,
		paramsOrOptions?: Record<string, string | number> | TranslateOptions
	): string => {
		// Parse options
		const { context, params } = parseTranslateOptions(paramsOrOptions);
		const hash = hashText(text, context);

		// Format options for ICU
		const formatOptions = {
			locale,
			pluralRulesCache: serverPluralRulesCache,
			onError: (error: Error, ctx: string) => {
				console.error(`[rosetta] ${ctx} error:`, error.message);
			},
		};

		// Default locale = source language, no translation needed
		if (locale === defaultLocale) {
			return formatMessage(text, params, formatOptions);
		}

		// Get translated text or fallback to source
		const translated = translations.get(hash) ?? text;
		return formatMessage(translated, params, formatOptions);
	};
}

// ============================================
// Cached Translation Loader
// ============================================

/**
 * Per-request cached translation loader factory
 *
 * Creates a getTranslations function that:
 * 1. Loads translations for the given locale
 * 2. Caches the result per-request using React's cache()
 * 3. Returns a t() function for translating strings
 *
 * @example
 * // lib/i18n.ts
 * import { createRosetta, createCachedTranslations } from '@sylphx/rosetta-next/server'
 *
 * export const rosetta = createRosetta({ storage, defaultLocale: 'en' })
 * export const getTranslations = createCachedTranslations(rosetta)
 *
 * // page.tsx
 * export default async function Page({ params }) {
 *   const { locale } = await params
 *   const t = await getTranslations(locale)
 *   return <h1>{t("Welcome")}</h1>
 * }
 */
export function createCachedTranslations(
	loadTranslations: (locale: string) => Promise<Map<string, string>>,
	defaultLocale: string
): (locale: string) => Promise<TranslateFunction> {
	// React's cache() memoizes per-request
	return cache(async (locale: string): Promise<TranslateFunction> => {
		const translations = await loadTranslations(locale);
		return createTranslator({ locale, defaultLocale, translations });
	});
}

// ============================================
// Standalone Translation Function
// ============================================

/**
 * Translate text synchronously (requires pre-loaded translations)
 *
 * This is a convenience function for simple cases.
 * For server components, prefer using `rosetta.getTranslations(locale)`.
 *
 * @example
 * const translations = await rosetta.loadTranslations('zh-TW')
 * const result = t("Hello", { locale: 'zh-TW', defaultLocale: 'en', translations })
 */
export function t(
	text: string,
	ctx: TranslatorContext,
	paramsOrOptions?: Record<string, string | number> | TranslateOptions
): string {
	const translator = createTranslator(ctx);
	return translator(text, paramsOrOptions);
}

// ============================================
// Utilities
// ============================================

/**
 * Get translations as a plain object for client hydration
 */
export function translationsToRecord(translations: Map<string, string>): Record<string, string> {
	return Object.fromEntries(translations);
}

// ============================================
// Convenience Accessors (use setRequestLocale first)
// ============================================

/**
 * Get current locale from request context
 *
 * Requires setRequestLocale() to be called first (usually in layout).
 * Returns DEFAULT_LOCALE if not set.
 *
 * @example
 * // In layout: setRequestLocale(locale)
 * // In component:
 * const locale = getLocale()  // Returns the locale set in layout
 */
export function getLocale(): string {
	const locale = getRequestLocale();
	if (!locale && typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
		console.warn(
			'[rosetta] getLocale() called without setRequestLocale(). ' +
				'Call setRequestLocale(locale) in your layout first.'
		);
	}
	return locale ?? DEFAULT_LOCALE;
}

