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

// Server Provider
export {
	RosettaProvider,
	type RosettaProviderProps,
	type RosettaManifest,
} from './server-provider';

// Rosetta instance factory
export { createRosetta, Rosetta } from './server/rosetta';
export type { RosettaConfig, LocaleDetector } from './server/rosetta';

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
} from './server/context';
export type { RunWithRosettaOptions } from './server/context';

// Cache adapters
export { InMemoryCache, ExternalCache, RequestScopedCache } from './server/cache';
export type { InMemoryCacheOptions, ExternalCacheOptions, RedisLikeClient } from './server/cache';

// Locale utilities
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
