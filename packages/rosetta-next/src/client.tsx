'use client';

import { hashText, interpolate } from '@sylphx/rosetta';
import type React from 'react';
import { type ReactNode, createContext, useContext, useMemo } from 'react';

// ============================================
// Safety Constants
// ============================================

const MAX_ICU_NESTING_DEPTH = 5;
const MAX_TEXT_LENGTH = 50000;

// ============================================
// Caches (Performance)
// ============================================

// Cache for Intl.PluralRules instances (2-5x faster for plurals)
const pluralRulesCache = new Map<string, Intl.PluralRules>();

// ============================================
// Types
// ============================================

/**
 * Translation options with context for disambiguation
 */
export interface TranslateOptions {
	/** Context for disambiguation (e.g., "button", "menu") */
	context?: string;
	/** Interpolation params for variables like {name} */
	params?: Record<string, string | number>;
}

/**
 * Translation function type (matches server-side t() API)
 */
export type TranslateFunction = (
	text: string,
	paramsOrOptions?: Record<string, string | number> | TranslateOptions
) => string;

/**
 * Translation context value for React
 */
export interface TranslationContextValue {
	locale: string;
	defaultLocale: string;
	t: TranslateFunction;
}

/**
 * Props for RosettaClientProvider
 */
export interface RosettaClientProviderProps {
	children: ReactNode;
	/** Current locale code */
	locale: string;
	/** Default locale code (defaults to 'en') */
	defaultLocale?: string;
	/** Translations map (hash -> translated text) */
	translations: Record<string, string>;
}

// ============================================
// ICU MessageFormat Support
// ============================================

/**
 * Format message with ICU-like syntax support
 * Supports: {name}, {count, plural, one {...} other {...}}, {gender, select, ...}
 *
 * Features:
 * - Depth limiting to prevent DoS attacks
 * - Length limiting for safety
 * - Pattern caching for performance
 */
function formatMessage(
	text: string,
	params?: Record<string, string | number>,
	locale?: string
): string {
	if (!params) return text;

	// Safety: Limit text length
	if (text.length > MAX_TEXT_LENGTH) {
		console.warn('[rosetta] Translation too long, truncating');
		text = text.slice(0, MAX_TEXT_LENGTH);
	}

	// Check for ICU patterns
	if (text.includes(', plural,') || text.includes(', select,')) {
		try {
			return formatICU(text, params, locale, 0);
		} catch (error) {
			// Graceful fallback on ICU parsing errors
			console.error('[rosetta] ICU formatting error:', error);
			return interpolate(text, params);
		}
	}

	// Simple interpolation
	return interpolate(text, params);
}

/**
 * Basic ICU MessageFormat support
 * Handles plural and select patterns
 *
 * Security features:
 * - Depth limiting to prevent stack overflow
 * - Iteration limiting to prevent infinite loops
 */
function formatICU(
	text: string,
	params: Record<string, string | number>,
	locale?: string,
	depth: number = 0
): string {
	// Security: Prevent deeply nested patterns (DoS attack vector)
	if (depth > MAX_ICU_NESTING_DEPTH) {
		console.warn('[rosetta] Max ICU nesting depth exceeded, aborting');
		return text;
	}

	let result = text;
	let startIndex = 0;
	let iterations = 0;
	const maxIterations = 100; // Prevent infinite loops

	while (startIndex < result.length && iterations < maxIterations) {
		iterations++;

		// Find pattern start: {varName, plural/select,
		const patternMatch = result.slice(startIndex).match(/\{(\w+),\s*(plural|select),\s*/);
		if (!patternMatch || patternMatch.index === undefined) break;

		const matchStart = startIndex + patternMatch.index;
		const varName = patternMatch[1]!;
		const type = patternMatch[2]!;
		const optionsStart = matchStart + patternMatch[0].length;

		// Find matching closing brace by counting brace depth
		let braceCount = 1;
		let braceDepth = 1;
		let i = optionsStart;
		while (i < result.length && braceCount > 0) {
			if (result[i] === '{') {
				braceCount++;
				braceDepth++;
				// Security: Check nesting depth during parsing
				if (braceDepth > MAX_ICU_NESTING_DEPTH) {
					console.warn('[rosetta] Max brace nesting depth exceeded');
					return text;
				}
			} else if (result[i] === '}') {
				braceCount--;
			}
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
				// Then try plural category (using actual locale)
				const category = getPluralCategory(count, locale);
				const template = optionMap[category] ?? optionMap.other;
				replacement = template ? replaceHash(template, count) : result.slice(matchStart, matchEnd);
			}
		} else if (type === 'select') {
			const key = String(value);
			replacement = optionMap[key] ?? optionMap.other ?? result.slice(matchStart, matchEnd);
		} else {
			startIndex = matchEnd;
			continue;
		}

		// Recursively format nested patterns (with increased depth)
		if (replacement.includes(', plural,') || replacement.includes(', select,')) {
			replacement = formatICU(replacement, params, locale, depth + 1);
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
 * Get plural category for a number using the correct locale
 * Uses Intl.PluralRules for proper CLDR pluralization
 * Caches PluralRules instances for 2-5x performance improvement
 */
function getPluralCategory(count: number, locale?: string): string {
	if (typeof Intl !== 'undefined' && Intl.PluralRules) {
		const key = locale ?? 'en';

		// Use cached PluralRules instance
		let rules = pluralRulesCache.get(key);
		if (!rules) {
			rules = new Intl.PluralRules(key);
			pluralRulesCache.set(key, rules);
		}

		return rules.select(count);
	}
	// Fallback for environments without Intl
	return count === 1 ? 'one' : 'other';
}

/**
 * Replace # with the count in plural templates
 * Uses replacer function to avoid $ interpretation security issue
 */
function replaceHash(template: string, count: number): string {
	// Use replacer function to avoid $ special character interpretation
	return template.replace(/#/g, () => String(count));
}

// ============================================
// Context
// ============================================

export const RosettaContext: React.Context<TranslationContextValue> =
	createContext<TranslationContextValue>({
		locale: 'en',
		defaultLocale: 'en',
		t: (text, paramsOrOptions) => {
			// Default fallback: format without translation (uses 'en' as default locale)
			const params =
				paramsOrOptions && 'params' in paramsOrOptions
					? (paramsOrOptions as TranslateOptions).params
					: (paramsOrOptions as Record<string, string | number> | undefined);
			return formatMessage(text, params, 'en');
		},
	});

// ============================================
// Client Provider
// ============================================

/**
 * RosettaClientProvider - Client-side translation context
 *
 * This is used internally by RosettaProvider (server) to hydrate client components.
 * You can also use it directly for client-only apps.
 *
 * @example
 * // For client-only apps (SPA)
 * <RosettaClientProvider locale="zh-TW" defaultLocale="en" translations={translations}>
 *   {children}
 * </RosettaClientProvider>
 */
export function RosettaClientProvider({
	locale,
	defaultLocale = 'en',
	translations,
	children,
}: RosettaClientProviderProps): React.ReactElement {
	// Convert to Map for safe lookup (prevents prototype pollution attacks)
	// Also memoize to avoid recreating on every render
	const translationsMap = useMemo(
		() => new Map(Object.entries(translations)),
		[translations]
	);

	// Memoize t function to prevent unnecessary re-renders
	// Include locale in deps to update when locale changes
	const t = useMemo<TranslateFunction>(() => {
		return (text, paramsOrOptions) => {
			try {
				// Determine if paramsOrOptions is TranslateOptions or direct interpolation params
				const isTranslateOptions =
					paramsOrOptions &&
					('context' in paramsOrOptions || 'params' in paramsOrOptions) &&
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

				// Use same hash-based lookup as server (with context support)
				// Map.get() is safe from prototype pollution
				const hash = hashText(text, context);
				const translated = translationsMap.get(hash) ?? text;
				// Use formatMessage for ICU support (plural, select) with correct locale
				return formatMessage(translated, params, locale);
			} catch (error) {
				// Error boundary: return original text on any error
				console.error('[rosetta] Translation error:', error);
				return text;
			}
		};
	}, [translationsMap, locale]);

	return (
		<RosettaContext.Provider value={{ locale, defaultLocale, t }}>
			{children}
		</RosettaContext.Provider>
	);
}

// ============================================
// Hooks
// ============================================

/**
 * Get the full translation context
 */
export function useTranslation(): TranslationContextValue {
	return useContext(RosettaContext);
}

/**
 * Get just the translation function
 *
 * @example
 * const t = useT();
 * return <button>{t("Sign In")}</button>;
 * return <p>{t("Hello {name}", { name: user.name })}</p>;
 * // With context for disambiguation
 * return <button>{t("Submit", { context: "form" })}</button>;
 */
export function useT(): TranslateFunction {
	const { t } = useContext(RosettaContext);
	return t;
}

/**
 * Get current locale
 */
export function useLocale(): string {
	const { locale } = useContext(RosettaContext);
	return locale;
}

/**
 * Get default locale
 */
export function useDefaultLocale(): string {
	const { defaultLocale } = useContext(RosettaContext);
	return defaultLocale;
}
