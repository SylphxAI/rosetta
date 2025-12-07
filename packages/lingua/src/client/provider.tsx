'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import { interpolate } from '../interpolate';
import type { TranslationContextValue } from '../types';

// ============================================
// Context
// ============================================

const I18nContext = createContext<TranslationContextValue>({
	locale: 'en',
	t: (text) => text,
});

// ============================================
// Provider
// ============================================

interface I18nProviderProps {
	/** Current locale code */
	locale: string;
	/** Translations map (source text -> translated text) */
	translations: Record<string, string>;
	children: ReactNode;
}

/**
 * I18nProvider - wrap your app to enable client-side translations
 *
 * @example
 * // In layout.tsx (server component)
 * import { I18nProvider } from '@sylphx/lingua/client';
 * import { getTranslationsForClient, getLocale } from '@sylphx/lingua/server';
 *
 * export default async function Layout({ children }) {
 *   return i18n.init(async () => (
 *     <html>
 *       <body>
 *         <I18nProvider
 *           locale={getLocale()}
 *           translations={getTranslationsForClient()}
 *         >
 *           {children}
 *         </I18nProvider>
 *       </body>
 *     </html>
 *   ));
 * }
 */
export function I18nProvider({ locale, translations, children }: I18nProviderProps): React.ReactElement {
	const t = (text: string, params?: Record<string, string | number>): string => {
		// Direct lookup by source text (no hashing needed on client)
		const translated = translations[text] ?? text;
		return interpolate(translated, params);
	};

	return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>;
}

// ============================================
// Hooks
// ============================================

/**
 * Get the full translation context
 */
export function useTranslation(): TranslationContextValue {
	return useContext(I18nContext);
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
	const { t } = useContext(I18nContext);
	return t;
}

/**
 * Get current locale
 */
export function useLocale(): string {
	const { locale } = useContext(I18nContext);
	return locale;
}
