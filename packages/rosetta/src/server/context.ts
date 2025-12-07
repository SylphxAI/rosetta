import { AsyncLocalStorage } from 'node:async_hooks';
import { hashText } from '../hash';
import { interpolate } from '../interpolate';
import { DEFAULT_LOCALE } from '../locales';
import type { RosettaContext, TranslateOptions } from '../types';

// ============================================
// AsyncLocalStorage for request-scoped context
// ============================================

export const rosettaStorage: AsyncLocalStorage<RosettaContext> = new AsyncLocalStorage<RosettaContext>();

/**
 * Get current Rosetta context
 */
export function getRosettaContext(): RosettaContext | undefined {
	return rosettaStorage.getStore();
}

/**
 * Run a function with Rosetta context
 * Initializes request-scoped string collection state
 */
export function runWithRosetta<T>(context: Omit<RosettaContext, 'collectedHashes' | 'pendingStrings'>, fn: () => T): T {
	// Warn about nested contexts in development
	const existingContext = rosettaStorage.getStore();
	if (existingContext && process.env.NODE_ENV === 'development') {
		console.warn(
			'[rosetta] Nested runWithRosetta detected. This may cause unexpected behavior. ' +
				'Ensure Rosetta.init() is only called once per request (usually in root layout).'
		);
	}

	// Create full context with request-scoped collection state
	const fullContext: RosettaContext = {
		...context,
		collectedHashes: new Set<string>(),
		pendingStrings: [],
	};
	return rosettaStorage.run(fullContext, fn);
}

// ============================================
// String Collection (Request-scoped, Production-safe)
// ============================================

/**
 * Queue a string for collection (sync, non-blocking)
 * Uses request-scoped state to prevent race conditions
 */
function queueForCollection(text: string, hash: string, context?: string): void {
	const ctx = getRosettaContext();
	if (!ctx) return;

	// Check request-scoped deduplication set
	if (ctx.collectedHashes.has(hash)) return;
	ctx.collectedHashes.add(hash);
	ctx.pendingStrings.push({ text, hash, context });
}

/**
 * Flush collected strings to storage (call at end of request)
 * This is async and non-blocking
 */
export async function flushCollectedStrings(): Promise<void> {
	const ctx = getRosettaContext();
	if (!ctx?.storage || ctx.pendingStrings.length === 0) return;

	// Copy and clear in one operation to avoid race conditions
	const items = [...ctx.pendingStrings];
	ctx.pendingStrings.length = 0;
	ctx.collectedHashes.clear();

	try {
		await ctx.storage.registerSources(items);
	} catch (error) {
		console.error('[rosetta] Failed to flush strings:', error);
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
 * // With interpolation (direct params - legacy API)
 * t("Hello {name}", { name: "John" })
 *
 * // With context for disambiguation
 * t("Submit", { context: "form" })
 *
 * // With both context and params (recommended for clarity)
 * t("Hello {name}", { context: "greeting", params: { name: "John" } })
 *
 * @param text - Source text to translate
 * @param paramsOrOptions - Interpolation params OR TranslateOptions with context/params
 */
export function t(
	text: string,
	paramsOrOptions?: Record<string, string | number> | TranslateOptions
): string {
	const store = rosettaStorage.getStore();

	// Determine if paramsOrOptions is TranslateOptions or direct interpolation params
	// TranslateOptions has 'context' or 'params' keys
	const isTranslateOptions =
		paramsOrOptions &&
		('context' in paramsOrOptions || 'params' in paramsOrOptions) &&
		// Heuristic: if it only has context/params keys, it's TranslateOptions
		// otherwise treat as interpolation params (allows { context: "form" } vs { name: "John" })
		Object.keys(paramsOrOptions).every((k) => k === 'context' || k === 'params');

	let context: string | undefined;
	let params: Record<string, string | number> | undefined;

	if (isTranslateOptions) {
		const opts = paramsOrOptions as TranslateOptions;
		context = opts.context;
		params = opts.params;
	} else {
		params = paramsOrOptions as Record<string, string | number> | undefined;
	}

	const hash = hashText(text, context);

	// Queue for collection (production-safe, non-blocking)
	queueForCollection(text, hash, context);

	// No store means Rosetta.init() wasn't called - fallback to source
	if (!store) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('[rosetta] t() called outside Rosetta.init() context');
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
	return rosettaStorage.getStore()?.locale ?? DEFAULT_LOCALE;
}

/**
 * Get default locale from context
 */
export function getDefaultLocale(): string {
	return rosettaStorage.getStore()?.defaultLocale ?? DEFAULT_LOCALE;
}

/**
 * Get translations map from context (hash -> translated text)
 */
export function getTranslations(): Map<string, string> {
	return rosettaStorage.getStore()?.translations ?? new Map();
}

/**
 * Get translations for client components
 * Returns hash -> translated text map (same as server)
 */
export function getTranslationsForClient(): Record<string, string> {
	const translations = rosettaStorage.getStore()?.translations;
	return translations ? Object.fromEntries(translations) : {};
}
