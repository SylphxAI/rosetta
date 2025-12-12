/**
 * @sylphx/rosetta-next/server - Server-side Rosetta integration for Next.js
 *
 * @example Setup
 * ```ts
 * // lib/i18n.ts
 * import { createRosetta } from '@sylphx/rosetta-next/server'
 * import { DrizzleStorageAdapter } from '@sylphx/rosetta-drizzle'
 *
 * export const rosetta = createRosetta({
 *   storage: new DrizzleStorageAdapter({ db, sources, translations }),
 *   defaultLocale: 'en',
 * })
 * ```
 *
 * @example Layout
 * ```tsx
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
 * ```
 *
 * @example Server Component
 * ```tsx
 * import { getTranslations } from '@sylphx/rosetta-next/server'
 *
 * export default async function Page() {
 *   const t = await getTranslations()
 *   return <h1>{t("Welcome")}</h1>
 * }
 * ```
 */

// Rosetta instance factory
export { createRosetta, Rosetta } from './rosetta';
export type { RosettaConfig, LocaleDetector } from './rosetta';

// Server context and translation function
export {
	t,
	getTranslationsAsync as getTranslations,
	getLocale,
	getDefaultLocale,
	getLocaleChain,
	getTranslationsForClient,
	runWithRosetta,
	getRosettaContext,
	isInsideRosettaContext,
	rosettaStorage,
} from './context';
export type { RunWithRosettaOptions } from './context';

// Cache adapters
export { InMemoryCache, ExternalCache, RequestScopedCache } from './cache';
export type { InMemoryCacheOptions, ExternalCacheOptions, RedisLikeClient } from './cache';

// Re-export locale utilities from locale.ts
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
} from '../locale';

// Provider will be exported separately to avoid circular dependency
