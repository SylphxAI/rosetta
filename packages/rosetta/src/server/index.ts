/**
 * Server-side Rosetta module
 *
 * @example
 * // ============================================
 * // Setup (lib/i18n.ts)
 * // ============================================
 * import { Rosetta } from '@sylphx/rosetta/server';
 * import { DrizzleStorageAdapter } from '@sylphx/rosetta-drizzle';
 *
 * export const rosetta = new Rosetta({
 *   storage: new DrizzleStorageAdapter({ db, sources, translations }),
 *   defaultLocale: 'en',
 * });
 *
 * // ============================================
 * // Layout (app/[locale]/layout.tsx)
 * // ============================================
 * import { RosettaProvider } from '@sylphx/rosetta-next/server';
 * import { rosetta } from '@/lib/i18n';
 *
 * export default async function Layout({ children, params }) {
 *   return (
 *     <RosettaProvider rosetta={rosetta} locale={params.locale}>
 *       <html lang={params.locale}>
 *         <body>{children}</body>
 *       </html>
 *     </RosettaProvider>
 *   );
 * }
 *
 * // ============================================
 * // Server Component
 * // ============================================
 * import { t } from '@sylphx/rosetta/server';
 *
 * export function ProductPage() {
 *   return <h1>{t("Products")}</h1>;
 * }
 *
 * // ============================================
 * // Client Component
 * // ============================================
 * 'use client';
 * import { useT } from '@sylphx/rosetta-next';
 *
 * export function AddToCartButton() {
 *   const t = useT();
 *   return <button>{t("Add to Cart")}</button>;
 * }
 */

export {
	buildLocaleChain,
	flushCollectedStrings,
	getDefaultLocale,
	getLocale,
	getLocaleChain,
	getRosettaContext,
	getTranslations,
	getTranslationsForClient,
	isInsideRosettaContext,
	isValidLocale,
	rosettaStorage,
	runWithRosetta,
	scheduleFlush,
	t,
} from './context';
export type { RosettaConfig, LocaleDetector } from './i18n';
export { Rosetta } from './i18n';

// Cache adapters for different deployment environments
export type {
	CacheAdapter,
	RedisLikeClient,
	InMemoryCacheOptions,
	ExternalCacheOptions,
	NextCacheOptions,
} from '../cache';
export { InMemoryCache, ExternalCache, RequestScopedCache, createNextCacheLoader } from '../cache';
