'use client';

import { hashText } from '@sylphx/rosetta';
import { createPluralRulesCache, formatMessage } from '@sylphx/rosetta/icu';
import type React from 'react';
import { type ReactNode, createContext, useContext, useMemo } from 'react';

// ============================================
// Client-side PluralRules Cache
// ============================================

// Smaller cache for client (browser memory constraints)
// LRU eviction prevents memory leaks in long-lived sessions
const clientPluralRulesCache = createPluralRulesCache({ maxSize: 10 });

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
			return formatMessage(text, params, {
				locale: 'en',
				pluralRulesCache: clientPluralRulesCache,
			});
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
	const translationsMap = useMemo(() => new Map(Object.entries(translations)), [translations]);

	// Memoize t function to prevent unnecessary re-renders
	// Include locale in deps to update when locale changes
	const t = useMemo<TranslateFunction>(() => {
		return (text, paramsOrOptions) => {
			try {
				// Determine if paramsOrOptions is TranslateOptions or direct interpolation params
				// TranslateOptions has: context (string for disambiguation) and/or params (object for interpolation)
				// Direct params has: any keys with string/number values
				// Key insight: if 'params' is present and is an object, it's TranslateOptions
				const isTranslateOptions =
					paramsOrOptions &&
					('params' in paramsOrOptions &&
						typeof paramsOrOptions.params === 'object' &&
						paramsOrOptions.params !== null);

				let context: string | undefined;
				let params: Record<string, string | number> | undefined;

				if (isTranslateOptions) {
					const opts = paramsOrOptions as TranslateOptions;
					context = opts.context;
					params = opts.params;
				} else if (
					paramsOrOptions &&
					'context' in paramsOrOptions &&
					typeof paramsOrOptions.context === 'string' &&
					Object.keys(paramsOrOptions).length === 1
				) {
					// Only context, no params - this is TranslateOptions with just context
					context = paramsOrOptions.context as string;
				} else {
					params = paramsOrOptions as Record<string, string | number> | undefined;
				}

				// Use same hash-based lookup as server (with context support)
				// Map.get() is safe from prototype pollution
				const hash = hashText(text, context);
				const translated = translationsMap.get(hash) ?? text;
				// Use shared formatMessage for ICU support with correct locale and LRU cache
				return formatMessage(translated, params, {
					locale,
					pluralRulesCache: clientPluralRulesCache,
					onError: (error, ctx) => {
						console.error(`[rosetta] ${ctx} error:`, error.message);
					},
				});
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
