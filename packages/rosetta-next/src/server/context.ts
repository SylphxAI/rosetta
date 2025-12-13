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
 */
function parseTranslateOptions(
	paramsOrOptions?: Record<string, string | number> | TranslateOptions
): { context?: string; params?: Record<string, string | number> } {
	if (!paramsOrOptions) {
		return {};
	}

	// Check if it's TranslateOptions (has context or params keys only)
	const keys = Object.keys(paramsOrOptions);
	const isTranslateOptions =
		keys.length > 0 && keys.every((k) => k === 'context' || k === 'params');

	if (isTranslateOptions) {
		const opts = paramsOrOptions as TranslateOptions;
		return { context: opts.context, params: opts.params };
	}

	// Otherwise treat as direct params
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
// Legacy API (deprecated - for migration)
// ============================================

/**
 * @deprecated Use createTranslator() or rosetta.getTranslations() instead.
 * This function is kept for backward compatibility during migration.
 */
export function getLocale(): string {
	console.warn(
		'[rosetta] getLocale() is deprecated. Pass locale explicitly or use rosetta.getTranslations(locale).'
	);
	return DEFAULT_LOCALE;
}

/**
 * @deprecated Use createTranslator() or rosetta.getTranslations() instead.
 * This function is kept for backward compatibility during migration.
 */
export function getDefaultLocale(): string {
	console.warn(
		'[rosetta] getDefaultLocale() is deprecated. Pass locale explicitly or use rosetta.getTranslations(locale).'
	);
	return DEFAULT_LOCALE;
}

/**
 * @deprecated Use createTranslator() or rosetta.getTranslations() instead.
 * This function is kept for backward compatibility during migration.
 */
export function getLocaleChain(): string[] {
	console.warn(
		'[rosetta] getLocaleChain() is deprecated. Pass locale explicitly or use rosetta.getTranslations(locale).'
	);
	return [DEFAULT_LOCALE];
}

/**
 * @deprecated Use createTranslator() or rosetta.getTranslations() instead.
 * This function is kept for backward compatibility during migration.
 */
export async function getTranslationsAsync(): Promise<TranslateFunction> {
	console.warn(
		'[rosetta] getTranslationsAsync() is deprecated. Use rosetta.getTranslations(locale) instead.'
	);
	return (text: string) => text;
}
