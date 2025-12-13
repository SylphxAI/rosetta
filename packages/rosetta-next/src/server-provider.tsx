/**
 * Server-side RosettaProvider utilities (Edge-compatible)
 *
 * This file provides helper functions for setting up translation context
 * in Next.js app router layouts. Works in all JavaScript runtimes.
 *
 * With the new Edge-compatible architecture, the recommended pattern is:
 *
 * @example
 * // app/[locale]/layout.tsx
 * import { rosetta } from '@/lib/i18n'
 * import { RosettaClientProvider } from '@sylphx/rosetta-next'
 *
 * export default async function Layout({ children, params }) {
 *   const { locale } = await params
 *   const clientData = await rosetta.getClientData(locale)
 *
 *   return (
 *     <html lang={locale}>
 *       <body>
 *         <RosettaClientProvider {...clientData}>
 *           {children}
 *         </RosettaClientProvider>
 *       </body>
 *     </html>
 *   )
 * }
 *
 * @example Server component usage
 * // app/[locale]/page.tsx
 * import { rosetta } from '@/lib/i18n'
 *
 * export default async function Page({ params }) {
 *   const { locale } = await params
 *   const t = await rosetta.getTranslations(locale)
 *   return <h1>{t("Welcome")}</h1>
 * }
 */

import type { ReactNode } from 'react';
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
 * RosettaProvider - Lightweight server component wrapper
 *
 * With the new Edge-compatible architecture, this component is optional.
 * The recommended pattern is to use `rosetta.getClientData(locale)` directly.
 *
 * @deprecated Use rosetta.getClientData(locale) + RosettaClientProvider instead.
 * This component is kept for backward compatibility.
 *
 * @example Recommended pattern (without RosettaProvider)
 * ```tsx
 * // app/[locale]/layout.tsx
 * import { rosetta } from '@/lib/i18n'
 * import { RosettaClientProvider } from '@sylphx/rosetta-next'
 *
 * export default async function Layout({ children, params }) {
 *   const { locale } = await params
 *   const clientData = await rosetta.getClientData(locale)
 *
 *   return (
 *     <RosettaClientProvider {...clientData}>
 *       {children}
 *     </RosettaClientProvider>
 *   )
 * }
 * ```
 *
 * @example Legacy pattern (with RosettaProvider)
 * ```tsx
 * // app/[locale]/layout.tsx
 * import { RosettaProvider, getClientData } from '@sylphx/rosetta-next/server'
 * import { RosettaClientProvider } from '@sylphx/rosetta-next'
 *
 * export default async function Layout({ children, params }) {
 *   const { locale } = await params
 *   const clientData = await getClientData(rosetta, locale)
 *
 *   return (
 *     <RosettaProvider rosetta={rosetta} locale={locale}>
 *       <RosettaClientProvider {...clientData}>
 *         {children}
 *       </RosettaClientProvider>
 *     </RosettaProvider>
 *   )
 * }
 * ```
 */
export async function RosettaProvider({
	children,
}: RosettaProviderProps): Promise<React.ReactElement> {
	// With the new architecture, RosettaProvider is just a passthrough.
	// The actual context setup happens via rosetta.getTranslations(locale)
	// which uses React's cache() for per-request memoization.
	return <>{children}</>;
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
