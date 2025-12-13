/**
 * @sylphx/rosetta-next/server - Server-side Rosetta integration for Next.js
 *
 * Edge-compatible: Works in Node.js, Vercel Edge, Cloudflare Workers, Deno Deploy.
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
 * ```
 *
 * @example Server Component
 * ```tsx
 * // app/[locale]/page.tsx
 * import { rosetta } from '@/lib/i18n'
 *
 * export default async function Page({ params }) {
 *   const { locale } = await params
 *   const t = await rosetta.getTranslations(locale)
 *   return <h1>{t("Welcome")}</h1>
 * }
 * ```
 */

// Server Provider and helpers (legacy, for backward compatibility)
export {
	RosettaProvider,
	getClientData,
	type RosettaProviderProps,
	type RosettaManifest,
	type RosettaClientData,
} from './server-provider';

// Rosetta instance factory
export { createRosetta, Rosetta } from './server/rosetta';
export type { RosettaConfig, LocaleDetector } from './server/rosetta';

// Translation utilities
export {
	createTranslator,
	createCachedTranslations,
	t,
	translationsToRecord,
	type TranslateFunction,
	type TranslatorContext,
} from './server/context';

// Legacy API (deprecated, for migration)
export {
	getLocale,
	getDefaultLocale,
	getLocaleChain,
	getTranslationsAsync as getTranslations,
} from './server/context';

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
