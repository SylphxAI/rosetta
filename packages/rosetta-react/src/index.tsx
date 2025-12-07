'use client';

import { hashText, interpolate } from '@sylphx/rosetta';
import type React from 'react';
import { type ReactNode, createContext, useContext } from 'react';

// ============================================
// Types
// ============================================

/**
 * Translation context value for React
 */
export interface TranslationContextValue {
	locale: string;
	t: (text: string, params?: Record<string, string | number>) => string;
}

/**
 * Props for RosettaProvider
 */
export interface RosettaProviderProps {
	children: ReactNode;
	/** Current locale code */
	locale: string;
	/** Translations map (hash -> translated text) */
	translations: Record<string, string>;
}

// ============================================
// Context
// ============================================

const RosettaReactContext = createContext<TranslationContextValue>({
	locale: 'en',
	t: (text) => text,
});

// ============================================
// Provider
// ============================================

/**
 * RosettaProvider - wrap your app to enable client-side translations
 *
 * @example
 * // In layout.tsx (server component)
 * import { RosettaProvider } from '@sylphx/rosetta-react';
 * import { getTranslations, getLocale } from '@sylphx/rosetta/server';
 *
 * export default async function Layout({ children }) {
 *   return rosetta.init(async () => (
 *     <html>
 *       <body>
 *         <RosettaProvider
 *           locale={getLocale()}
 *           translations={getTranslations()}
 *         >
 *           {children}
 *         </RosettaProvider>
 *       </body>
 *     </html>
 *   ));
 * }
 */
export function RosettaProvider({
	locale,
	translations,
	children,
}: RosettaProviderProps): React.ReactElement {
	const t = (text: string, params?: Record<string, string | number>): string => {
		// Use same hash-based lookup as server
		const hash = hashText(text);
		const translated = translations[hash] ?? text;
		return interpolate(translated, params);
	};

	return <RosettaReactContext.Provider value={{ locale, t }}>{children}</RosettaReactContext.Provider>;
}

// ============================================
// Hooks
// ============================================

/**
 * Get the full translation context
 */
export function useTranslation(): TranslationContextValue {
	return useContext(RosettaReactContext);
}

/**
 * Get just the translation function
 *
 * @example
 * const t = useT();
 * return <button>{t("Sign In")}</button>;
 * return <p>{t("Hello {name}", { name: user.name })}</p>;
 */
export function useT(): (text: string, params?: Record<string, string | number>) => string {
	const { t } = useContext(RosettaReactContext);
	return t;
}

/**
 * Get current locale
 */
export function useLocale(): string {
	const { locale } = useContext(RosettaReactContext);
	return locale;
}
