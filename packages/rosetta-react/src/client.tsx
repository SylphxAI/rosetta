'use client';

import { hashText, interpolate } from '@sylphx/rosetta';
import type React from 'react';
import { type ReactNode, createContext, useContext } from 'react';

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

export const RosettaContext = createContext<TranslationContextValue>({
	locale: 'en',
	defaultLocale: 'en',
	t: (text, paramsOrOptions) => {
		// Default fallback: just interpolate without translation
		const params =
			paramsOrOptions && 'params' in paramsOrOptions
				? (paramsOrOptions as TranslateOptions).params
				: (paramsOrOptions as Record<string, string | number> | undefined);
		return interpolate(text, params);
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
	const t: TranslateFunction = (text, paramsOrOptions) => {
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
		return interpolate(translated, params);
	};

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
