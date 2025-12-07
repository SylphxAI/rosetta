'use client';

import { hashText, interpolate } from '@sylphx/rosetta';
import type React from 'react';
import { type ReactNode, createContext, useContext, useMemo } from 'react';

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
 * Get plural category for a number
 */
function getPluralCategory(count: number): string {
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
// Context
// ============================================

export const RosettaContext = createContext<TranslationContextValue>({
	locale: 'en',
	defaultLocale: 'en',
	t: (text, paramsOrOptions) => {
		// Default fallback: format without translation
		const params =
			paramsOrOptions && 'params' in paramsOrOptions
				? (paramsOrOptions as TranslateOptions).params
				: (paramsOrOptions as Record<string, string | number> | undefined);
		return formatMessage(text, params);
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
	// Memoize t function to prevent unnecessary re-renders
	const t = useMemo<TranslateFunction>(() => {
		return (text, paramsOrOptions) => {
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
			const hash = hashText(text, context);
			const translated = translations[hash] ?? text;
			// Use formatMessage for ICU support (plural, select)
			return formatMessage(translated, params);
		};
	}, [translations]);

	return (
		<RosettaContext.Provider value={{ locale, defaultLocale, t }}>{children}</RosettaContext.Provider>
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
