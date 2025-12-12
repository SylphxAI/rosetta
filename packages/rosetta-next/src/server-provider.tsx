/**
 * Server-side RosettaProvider component
 */

import { buildLocaleChain } from '@sylphx/rosetta';
import type { ReactNode } from 'react';
import { RosettaClientProvider } from './client';
import { runWithRosetta } from './server/context';
import type { Rosetta } from './server/rosetta';

// Re-export locale utilities
export {
	getReadyLocales,
	buildLocaleCookie,
	parseLocaleCookie,
	LOCALE_COOKIE_NAME,
	LOCALE_COOKIE_MAX_AGE,
	type LocaleConfig,
	type LocaleEntry,
	type LocaleWithStats,
	type GetReadyLocalesOptions,
	type LocaleCookieOptions,
} from './locale';

// ============================================
// Types
// ============================================

/**
 * Route manifest mapping routes to required hashes
 */
export type RosettaManifest = Record<string, string[]>;

export interface RosettaProviderProps {
	/** Rosetta instance */
	rosetta: Rosetta;
	/** Current locale (e.g., from URL params) */
	locale: string;
	/** Children to render */
	children: ReactNode;
	/**
	 * Specific hashes to load (fine-grained loading)
	 * If not provided, loads all translations for the locale
	 */
	hashes?: string[];
}

// ============================================
// Server Provider
// ============================================

/**
 * RosettaProvider - Server component that sets up translation context
 *
 * @example
 * // app/[locale]/layout.tsx
 * import { RosettaProvider } from '@sylphx/rosetta-next/server'
 * import { rosetta } from '@/lib/i18n'
 *
 * export default async function Layout({ children, params }) {
 *   const { locale } = await params
 *   return (
 *     <RosettaProvider rosetta={rosetta} locale={locale}>
 *       <html lang={locale}>
 *         <body>{children}</body>
 *       </html>
 *     </RosettaProvider>
 *   )
 * }
 *
 * @example
 * // Server Component - use getTranslations()
 * import { getTranslations } from '@sylphx/rosetta-next/server'
 *
 * export default async function Page() {
 *   const t = await getTranslations()
 *   return <h1>{t("Hello World")}</h1>
 * }
 *
 * @example
 * // Client Component - use useT hook
 * 'use client'
 * import { useT } from '@sylphx/rosetta-next'
 *
 * export function Button() {
 *   const t = useT()
 *   return <button>{t("Click me")}</button>
 * }
 */
export async function RosettaProvider({
	rosetta,
	locale,
	children,
	hashes,
}: RosettaProviderProps): Promise<React.ReactElement> {
	// Load translations
	const translations = hashes
		? await rosetta.loadTranslationsByHashes(locale, hashes)
		: await rosetta.loadTranslations(locale);
	const defaultLocale = rosetta.getDefaultLocale();
	const localeChain = buildLocaleChain(locale, defaultLocale);

	// Run within AsyncLocalStorage context for server components
	// and provide React context for client components
	return runWithRosetta(
		{
			locale,
			defaultLocale,
			localeChain,
			translations,
			storage: rosetta.getStorage(),
		},
		() => (
			<RosettaClientProvider
				locale={locale}
				defaultLocale={defaultLocale}
				translations={Object.fromEntries(translations)}
			>
				{children}
			</RosettaClientProvider>
		)
	);
}
