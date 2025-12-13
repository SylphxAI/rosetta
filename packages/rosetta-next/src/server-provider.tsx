/**
 * Server-side RosettaProvider utilities
 *
 * This file contains server-only code for AsyncLocalStorage context.
 * It does NOT import any client code to prevent bundling issues.
 */

import { buildLocaleChain } from '@sylphx/rosetta';
import type { ReactNode } from 'react';
import { getTranslationsForClient, runWithRosetta } from './server/context';
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
	/** Children to render - should include RosettaClientProvider */
	children: ReactNode;
	/**
	 * Specific hashes to load (fine-grained loading)
	 * If not provided, loads all translations for the locale
	 */
	hashes?: string[];
}

/**
 * Client data structure for hydration
 */
export interface RosettaClientData {
	locale: string;
	defaultLocale: string;
	translations: Record<string, string>;
}

// ============================================
// Server Provider
// ============================================

/**
 * RosettaProvider - Server component that sets up AsyncLocalStorage context
 *
 * Sets up server-side context for `getTranslations()` and `t()`.
 * Children should be wrapped with `RosettaClientProvider` for client components.
 *
 * @example
 * // app/[locale]/layout.tsx
 * import { RosettaProvider } from '@sylphx/rosetta-next/server'
 * import { RosettaClientProvider } from '@sylphx/rosetta-next'
 * import { rosetta } from '@/lib/i18n'
 *
 * export default async function Layout({ children, params }) {
 *   const { locale } = await params
 *   const clientData = await rosetta.getClientData(locale)
 *
 *   return (
 *     <RosettaProvider rosetta={rosetta} locale={locale}>
 *       <RosettaClientProvider {...clientData}>
 *         <html lang={locale}>
 *           <body>{children}</body>
 *         </html>
 *       </RosettaClientProvider>
 *     </RosettaProvider>
 *   )
 * }
 *
 * @example Simpler pattern with spread
 * // app/[locale]/layout.tsx
 * import { RosettaProvider } from '@sylphx/rosetta-next/server'
 * import { RosettaClientProvider } from '@sylphx/rosetta-next'
 *
 * export default async function Layout({ children, params }) {
 *   const { locale } = await params
 *   return (
 *     <RosettaProvider rosetta={rosetta} locale={locale}>
 *       {async ({ clientData }) => (
 *         <RosettaClientProvider {...clientData}>
 *           {children}
 *         </RosettaClientProvider>
 *       )}
 *     </RosettaProvider>
 *   )
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
	return runWithRosetta(
		{
			locale,
			defaultLocale,
			localeChain,
			translations,
			storage: rosetta.getStorage(),
		},
		() => <>{children}</>
	);
}

/**
 * Get client data for RosettaClientProvider hydration
 *
 * @example
 * const clientData = await getClientData(rosetta, locale)
 * return <RosettaClientProvider {...clientData}>{children}</RosettaClientProvider>
 */
export async function getClientData(
	rosetta: Rosetta,
	locale: string,
	hashes?: string[]
): Promise<RosettaClientData> {
	const translations = hashes
		? await rosetta.loadTranslationsByHashes(locale, hashes)
		: await rosetta.loadTranslations(locale);

	return {
		locale,
		defaultLocale: rosetta.getDefaultLocale(),
		translations: Object.fromEntries(translations),
	};
}
