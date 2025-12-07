import { AsyncLocalStorage } from 'node:async_hooks';
import { hashText } from '../hash';
import { interpolate } from '../interpolate';
import { DEFAULT_LOCALE } from '../locales';
import type { I18nContext, StorageAdapter, TranslateOptions } from '../types';

// ============================================
// AsyncLocalStorage for request-scoped context
// ============================================

export const i18nStorage: AsyncLocalStorage<I18nContext> = new AsyncLocalStorage<I18nContext>();

/**
 * Get current i18n context
 */
export function getI18nContext(): I18nContext | undefined {
	return i18nStorage.getStore();
}

/**
 * Run a function with i18n context
 */
export function runWithI18n<T>(context: I18nContext, fn: () => T): T {
	return i18nStorage.run(context, fn);
}

// ============================================
// String Collection (Production-safe)
// ============================================

// Track collected hashes per request to avoid duplicates
const collectedThisRequest = new Set<string>();

// Pending strings to flush (batched at end of request)
const pendingStrings: Array<{
	text: string;
	hash: string;
	context?: string;
}> = [];

/**
 * Queue a string for collection (sync, non-blocking)
 */
function queueForCollection(text: string, hash: string, context?: string): void {
	if (collectedThisRequest.has(hash)) return;
	collectedThisRequest.add(hash);
	pendingStrings.push({ text, hash, context });
}

/**
 * Flush collected strings to storage (call at end of request)
 * This is async and non-blocking
 */
export async function flushCollectedStrings(): Promise<void> {
	if (pendingStrings.length === 0) return;

	const ctx = getI18nContext();
	if (!ctx?.storage) return;

	const items = [...pendingStrings];
	pendingStrings.length = 0;
	collectedThisRequest.clear();

	try {
		await ctx.storage.registerSources(items);
	} catch (error) {
		console.error('[lingua] Failed to flush strings:', error);
	}
}

// ============================================
// Translation Function
// ============================================

/**
 * Translate text (sync, for server components)
 *
 * @example
 * // Simple translation
 * t("Hello World")
 *
 * // With interpolation
 * t("Hello {name}", { name: "John" })
 *
 * // With context for disambiguation
 * t("Submit", { context: "form" })
 *
 * @param text - Source text to translate
 * @param paramsOrOptions - Either interpolation params or TranslateOptions
 */
export function t(
	text: string,
	paramsOrOptions?: Record<string, string | number> | TranslateOptions
): string {
	const store = i18nStorage.getStore();

	// Determine if paramsOrOptions is TranslateOptions or interpolation params
	const isTranslateOptions = paramsOrOptions && 'context' in paramsOrOptions;
	const context = isTranslateOptions ? (paramsOrOptions as TranslateOptions).context : undefined;
	const params = isTranslateOptions
		? undefined
		: (paramsOrOptions as Record<string, string | number> | undefined);

	const hash = hashText(text, context);

	// Queue for collection (production-safe, non-blocking)
	queueForCollection(text, hash, context);

	// No store means initI18n wasn't called - fallback to source
	if (!store) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('[lingua] t() called outside initI18n context');
		}
		return interpolate(text, params);
	}

	// Default locale = source language, no translation needed
	if (store.locale === store.defaultLocale) {
		return interpolate(text, params);
	}

	// Get translated text or fallback to source
	const translated = store.translations.get(hash) ?? text;
	return interpolate(translated, params);
}

/**
 * Get current locale from context
 */
export function getLocale(): string {
	return i18nStorage.getStore()?.locale ?? DEFAULT_LOCALE;
}

/**
 * Get default locale from context
 */
export function getDefaultLocale(): string {
	return i18nStorage.getStore()?.defaultLocale ?? DEFAULT_LOCALE;
}

/**
 * Get translations map from context
 */
export function getTranslations(): Map<string, string> {
	return i18nStorage.getStore()?.translations ?? new Map();
}

/**
 * Get translations for client components
 * Returns source text -> translated text map
 */
export function getTranslationsForClient(): Record<string, string> {
	return i18nStorage.getStore()?.translationsForClient ?? {};
}
