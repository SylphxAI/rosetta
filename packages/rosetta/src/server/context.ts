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
 * Check if we're inside a Rosetta context
 */
export function isInsideRosettaContext(): boolean {
	return rosettaStorage.getStore()?.initialized === true;
}

// ============================================
// Locale Utilities
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
 * Validate locale format (basic validation)
 */
export function isValidLocale(locale: string): boolean {
	// BCP 47 basic pattern: xx or xx-XX
	return /^[a-z]{2}(-[A-Z]{2})?$/.test(locale) || /^[a-z]{2}-[a-z]{4}$/i.test(locale);
}

// ============================================
// Context Management
// ============================================

export interface RunWithRosettaOptions {
	locale: string;
	defaultLocale: string;
	localeChain?: string[];
	translations: Map<string, string>;
	storage?: RosettaContext['storage'];
}

/**
 * Run a function with Rosetta context
 * Initializes request-scoped string collection state
 */
export function runWithRosetta<T>(options: RunWithRosettaOptions, fn: () => T): T {
	// Warn about nested contexts in development
	const existingContext = rosettaStorage.getStore();
	if (existingContext?.initialized && process.env.NODE_ENV === 'development') {
		console.warn(
			'[rosetta] Nested runWithRosetta detected. This may cause unexpected behavior. ' +
				'Ensure RosettaProvider is only used once per request (usually in root layout).'
		);
	}

	// Build locale chain if not provided
	const localeChain = options.localeChain ?? buildLocaleChain(options.locale, options.defaultLocale);

	// Create context
	const fullContext: RosettaContext = {
		locale: options.locale,
		defaultLocale: options.defaultLocale,
		localeChain,
		translations: options.translations,
		storage: options.storage,
		initialized: true,
	};

	return rosettaStorage.run(fullContext, fn);
}

// ============================================
// Legacy exports (no-op, kept for compatibility)
// ============================================

/**
 * @deprecated Use `rosetta extract` CLI for compile-time string extraction
 */
export async function flushCollectedStrings(): Promise<void> {
	// No-op: Use compile-time extraction instead
}

/**
 * @deprecated Use `rosetta extract` CLI for compile-time string extraction
 */
export function scheduleFlush(): void {
	// No-op: Use compile-time extraction instead
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
 * // With both context and params
 * t("Hello {name}", { context: "greeting", params: { name: "John" } })
 *
 * // Pluralization (ICU format)
 * t("{count, plural, one {# item} other {# items}}", { count: 5 })
 */
export function t(
	text: string,
	paramsOrOptions?: Record<string, string | number> | TranslateOptions
): string {
	const store = rosettaStorage.getStore();

	// Parse options
	const { context, params } = parseTranslateOptions(paramsOrOptions);
	const hash = hashText(text, context);

	// Check if called outside context
	if (!store?.initialized) {
		if (process.env.NODE_ENV === 'development') {
			// Check if this is module scope (likely a mistake)
			const stack = new Error().stack;
			const isModuleScope = stack?.includes('at Module._compile') ||
				stack?.includes('at Object.<anonymous>') ||
				!stack?.includes('renderWithHooks');

			if (isModuleScope) {
				console.warn(
					`[rosetta] t("${text.slice(0, 30)}${text.length > 30 ? '...' : ''}") called outside RosettaProvider context.\n` +
					'This usually means t() was called at module scope instead of inside a component.\n' +
					'Move t() calls inside component functions to ensure proper context.'
				);
			} else {
				console.warn('[rosetta] t() called outside RosettaProvider context');
			}
		}
		return formatMessage(text, params);
	}

	// Default locale = source language, no translation needed
	if (store.locale === store.defaultLocale) {
		return formatMessage(text, params);
	}

	// Get translated text or fallback to source
	const translated = store.translations.get(hash) ?? text;
	return formatMessage(translated, params);
}

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
		keys.length > 0 &&
		keys.every((k) => k === 'context' || k === 'params');

	if (isTranslateOptions) {
		const opts = paramsOrOptions as TranslateOptions;
		return { context: opts.context, params: opts.params };
	}

	// Otherwise treat as direct params
	return { params: paramsOrOptions as Record<string, string | number> };
}

/**
 * Format message with ICU-like syntax support
 * Supports: {name}, {count, plural, one {...} other {...}}, {gender, select, ...}
 */
function formatMessage(text: string, params?: Record<string, string | number>): string {
	if (!params) return text;

	// Check for ICU patterns
	if (text.includes(', plural,') || text.includes(', select,')) {
		return formatICU(text, params);
	}

	// Simple interpolation
	return interpolate(text, params);
}

/**
 * Basic ICU MessageFormat support
 * Handles plural and select patterns
 */
function formatICU(text: string, params: Record<string, string | number>): string {
	// Pattern: {varName, plural, one {singular} other {plural}}
	// Pattern: {varName, select, male {He} female {She} other {They}}

	let result = text;
	let startIndex = 0;

	while (startIndex < result.length) {
		// Find pattern start: {varName, plural/select,
		const patternMatch = result.slice(startIndex).match(/\{(\w+),\s*(plural|select),\s*/);
		if (!patternMatch || patternMatch.index === undefined) break;

		const matchStart = startIndex + patternMatch.index;
		const varName = patternMatch[1]!;
		const type = patternMatch[2]!;
		const optionsStart = matchStart + patternMatch[0].length;

		// Find matching closing brace by counting brace depth
		let braceCount = 1;
		let i = optionsStart;
		while (i < result.length && braceCount > 0) {
			if (result[i] === '{') braceCount++;
			else if (result[i] === '}') braceCount--;
			i++;
		}

		if (braceCount !== 0) {
			startIndex = matchStart + 1;
			continue;
		}

		const matchEnd = i;
		const options = result.slice(optionsStart, matchEnd - 1);
		const value = params[varName];

		if (value === undefined) {
			startIndex = matchEnd;
			continue;
		}

		// Parse options like "one {text}" or "=0 {text}"
		const optionMap = parseICUOptions(options);
		let replacement: string;

		if (type === 'plural') {
			const count = Number(value);
			// Try exact match first (=0, =1, etc.)
			if (optionMap[`=${count}`]) {
				replacement = replaceHash(optionMap[`=${count}`]!, count);
			} else {
				// Then try plural category
				const category = getPluralCategory(count);
				const template = optionMap[category] ?? optionMap['other'];
				replacement = template ? replaceHash(template, count) : result.slice(matchStart, matchEnd);
			}
		} else if (type === 'select') {
			const key = String(value);
			replacement = optionMap[key] ?? optionMap['other'] ?? result.slice(matchStart, matchEnd);
		} else {
			startIndex = matchEnd;
			continue;
		}

		result = result.slice(0, matchStart) + replacement + result.slice(matchEnd);
		startIndex = matchStart + replacement.length;
	}

	return result;
}

/**
 * Parse ICU options string into a map
 * Handles nested braces in option values
 */
function parseICUOptions(options: string): Record<string, string> {
	const result: Record<string, string> = {};
	let i = 0;

	while (i < options.length) {
		// Skip whitespace
		while (i < options.length && /\s/.test(options[i]!)) i++;
		if (i >= options.length) break;

		// Find key (word or =N)
		const keyMatch = options.slice(i).match(/^([\w=]+)\s*\{/);
		if (!keyMatch) break;

		const key = keyMatch[1]!;
		i += keyMatch[0].length;

		// Find matching closing brace
		let braceCount = 1;
		const valueStart = i;
		while (i < options.length && braceCount > 0) {
			if (options[i] === '{') braceCount++;
			else if (options[i] === '}') braceCount--;
			i++;
		}

		if (braceCount === 0) {
			result[key] = options.slice(valueStart, i - 1);
		}
	}

	return result;
}

/**
 * Get plural category for a number (simplified English rules)
 */
function getPluralCategory(count: number): string {
	// Simplified: just one/other for English
	// Full ICU would use Intl.PluralRules
	if (typeof Intl !== 'undefined' && Intl.PluralRules) {
		return new Intl.PluralRules('en').select(count);
	}
	return count === 1 ? 'one' : 'other';
}

/**
 * Replace # with the count in plural templates
 */
function replaceHash(template: string, count: number): string {
	return template.replace(/#/g, String(count));
}

// ============================================
// Context Accessors
// ============================================

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
 * Get locale fallback chain
 */
export function getLocaleChain(): string[] {
	const store = rosettaStorage.getStore();
	return store?.localeChain ?? [DEFAULT_LOCALE];
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
