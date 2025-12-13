/**
 * Rosetta server-side manager (Edge-compatible)
 *
 * Handles translation loading, caching, and generation.
 * Works in all JavaScript runtimes: Node.js, Vercel Edge, Cloudflare Workers, Deno Deploy.
 */

import {
	type CacheAdapter,
	DEFAULT_LOCALE,
	type SourceString,
	type SourceWithStatus,
	type StorageAdapter,
	type TranslateAdapter,
	type TranslationStats,
	assertValidContext,
	assertValidHash,
	assertValidLocale,
	assertValidText,
	buildLocaleChain,
	hashText,
	isValidLocale,
} from '@sylphx/rosetta';
import { cache } from 'react';
import {
	type TranslateFunction,
	createTranslator,
	getRequestLocale,
	translationsToRecord,
} from './context';

/**
 * Locale detector function type
 */
export type LocaleDetector = () => Promise<string> | string;

/**
 * Rosetta configuration
 */
export interface RosettaConfig {
	/** Storage adapter for translations */
	storage: StorageAdapter;
	/** Optional translation adapter for auto-translation */
	translator?: TranslateAdapter;
	/** Default locale (source language) */
	defaultLocale?: string;
	/** Function to detect current locale */
	localeDetector?: LocaleDetector;
	/**
	 * Optional cache adapter for translations
	 *
	 * For serverless (Vercel, Lambda): Use ExternalCache with Redis/Upstash
	 * For traditional servers: Use InMemoryCache
	 * For edge workers: Omit (no caching needed)
	 */
	cache?: CacheAdapter;
}

/**
 * Create a Rosetta instance
 *
 * @example Basic setup (no cache)
 * ```ts
 * import { createRosetta } from '@sylphx/rosetta-next/server'
 * import { DrizzleStorageAdapter } from '@sylphx/rosetta-drizzle'
 *
 * export const rosetta = createRosetta({
 *   storage: new DrizzleStorageAdapter({ db, sources, translations }),
 *   defaultLocale: 'en',
 * })
 * ```
 *
 * @example With cache (serverless)
 * ```ts
 * import { createRosetta, ExternalCache } from '@sylphx/rosetta-next/server'
 * import { Redis } from '@upstash/redis'
 *
 * const redis = new Redis({ url, token })
 * const cache = new ExternalCache(redis, { ttlSeconds: 60 })
 *
 * export const rosetta = createRosetta({
 *   storage: new DrizzleStorageAdapter({ db, sources, translations }),
 *   cache,
 *   defaultLocale: 'en',
 * })
 * ```
 *
 * @example Usage in server components
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
export function createRosetta(config: RosettaConfig): Rosetta {
	return new Rosetta(config);
}

/**
 * Server-side Rosetta manager (Edge-compatible)
 */
export class Rosetta {
	private storage: StorageAdapter;
	private translator?: TranslateAdapter;
	private defaultLocale: string;
	private localeDetector?: LocaleDetector;
	private cacheAdapter?: CacheAdapter;

	// React cache() memoized getTranslations - created once per instance
	private _getTranslations: (locale: string) => Promise<TranslateFunction>;

	constructor(config: RosettaConfig) {
		this.storage = config.storage;
		this.translator = config.translator;
		this.defaultLocale = config.defaultLocale ?? DEFAULT_LOCALE;
		this.localeDetector = config.localeDetector;
		this.cacheAdapter = config.cache;

		// Create cached getTranslations function
		// React's cache() memoizes per-request, so multiple calls with same locale
		// in the same render will reuse the same translations
		this._getTranslations = cache(async (locale: string): Promise<TranslateFunction> => {
			const translations = await this.loadTranslations(locale);
			return createTranslator({
				locale,
				defaultLocale: this.defaultLocale,
				translations,
			});
		});
	}

	/**
	 * Get a translation function for the given locale (cached per-request)
	 *
	 * This is the primary API for server components. Uses React's cache()
	 * to deduplicate translation loading within a single request.
	 *
	 * @example With explicit locale
	 * export default async function Page({ params }) {
	 *   const { locale } = await params
	 *   const t = await rosetta.getTranslations(locale)
	 *   return <h1>{t("Welcome")}</h1>
	 * }
	 *
	 * @example Without locale (requires setRequestLocale in layout)
	 * // In layout: setRequestLocale(locale)
	 * // In page:
	 * export default async function Page() {
	 *   const t = await rosetta.getTranslations()  // Uses request locale
	 *   return <h1>{t("Welcome")}</h1>
	 * }
	 *
	 * @example With interpolation
	 * const t = await rosetta.getTranslations(locale)
	 * t("Hello {name}", { name: "John" }) // "Hello John"
	 *
	 * @example With context
	 * t("Save", { context: "button" }) // Different hash for disambiguation
	 */
	getTranslations(locale?: string): Promise<TranslateFunction> {
		const resolvedLocale = locale ?? getRequestLocale();
		if (!resolvedLocale) {
			throw new Error(
				'[rosetta] No locale provided and setRequestLocale() was not called. ' +
					'Either pass locale explicitly or call setRequestLocale(locale) in your layout.'
			);
		}
		return this._getTranslations(resolvedLocale);
	}

	/**
	 * Set locale detector function
	 */
	setLocaleDetector(detector: LocaleDetector): void {
		this.localeDetector = detector;
	}

	/**
	 * Detect current locale
	 */
	async detectLocale(): Promise<string> {
		if (this.localeDetector) {
			const locale = await this.localeDetector();
			if (locale && locale !== this.defaultLocale) {
				if (!isValidLocale(locale)) {
					if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
						console.warn(
							`[rosetta] Invalid locale format: "${locale}". Expected BCP 47 format. Falling back to default.`
						);
					}
					return this.defaultLocale;
				}
				return locale;
			}
		}
		return this.defaultLocale;
	}

	/**
	 * Get default locale
	 */
	getDefaultLocale(): string {
		return this.defaultLocale;
	}

	/**
	 * Get storage adapter
	 * @internal
	 */
	getStorage(): StorageAdapter {
		return this.storage;
	}

	/**
	 * Get all locales that have translations
	 */
	async getAvailableLocales(): Promise<string[]> {
		return this.storage.getAvailableLocales();
	}

	/**
	 * Load translations for a locale with fallback chain
	 * Falls back through locale chain (e.g., zh-TW → zh → en)
	 */
	async loadTranslations(locale: string): Promise<Map<string, string>> {
		// Check cache first
		if (this.cacheAdapter) {
			const cached = await this.cacheAdapter.get(locale);
			if (cached) return cached;
		}

		// Build fallback chain and load
		const chain = buildLocaleChain(locale, this.defaultLocale);
		const merged = new Map<string, string>();

		// Load in reverse order (default first, then more specific)
		for (let i = chain.length - 1; i >= 0; i--) {
			const chainLocale = chain[i]!;
			const translations = await this.storage.getTranslations(chainLocale);
			for (const [hash, text] of translations) {
				merged.set(hash, text);
			}
		}

		// Cache result
		if (this.cacheAdapter && merged.size > 0) {
			await this.cacheAdapter.set(locale, merged);
		}

		return merged;
	}

	/**
	 * Invalidate cached translations
	 */
	async invalidateCache(locale?: string): Promise<void> {
		if (this.cacheAdapter) {
			await this.cacheAdapter.invalidate(locale);
		}
	}

	/**
	 * Load translations for specific hashes only
	 */
	async loadTranslationsByHashes(locale: string, hashes: string[]): Promise<Map<string, string>> {
		const chain = buildLocaleChain(locale, this.defaultLocale);
		const merged = new Map<string, string>();

		for (let i = chain.length - 1; i >= 0; i--) {
			const chainLocale = chain[i]!;
			const translations = this.storage.getTranslationsByHashes
				? await this.storage.getTranslationsByHashes(chainLocale, hashes)
				: await this.storage.getTranslations(chainLocale);

			for (const [hash, text] of translations) {
				merged.set(hash, text);
			}
		}

		return merged;
	}

	/**
	 * Get Rosetta data for client hydration
	 *
	 * @example
	 * const clientData = await rosetta.getClientData(locale)
	 * return <RosettaClientProvider {...clientData}>{children}</RosettaClientProvider>
	 */
	async getClientData(locale: string): Promise<{
		locale: string;
		defaultLocale: string;
		translations: Record<string, string>;
	}> {
		const translations = await this.loadTranslations(locale);

		return {
			locale,
			defaultLocale: this.defaultLocale,
			translations: translationsToRecord(translations),
		};
	}

	/**
	 * Get Rosetta data for client hydration with available locales
	 *
	 * @example
	 * const clientData = await rosetta.getClientDataWithLocales(locale)
	 */
	async getClientDataWithLocales(locale: string): Promise<{
		locale: string;
		defaultLocale: string;
		availableLocales: string[];
		translations: Record<string, string>;
	}> {
		const [translations, availableLocales] = await Promise.all([
			this.loadTranslations(locale),
			this.getAvailableLocales(),
		]);

		return {
			locale,
			defaultLocale: this.defaultLocale,
			availableLocales,
			translations: translationsToRecord(translations),
		};
	}

	// ============================================
	// Translation Management
	// ============================================

	async getSources(): Promise<SourceString[]> {
		return this.storage.getSources();
	}

	async getUntranslated(locale: string): Promise<SourceString[]> {
		return this.storage.getUntranslated(locale);
	}

	async generateTranslation(
		text: string,
		targetLocale: string,
		context?: string
	): Promise<string | null> {
		if (!this.translator) {
			throw new Error('No translator adapter configured');
		}

		if (targetLocale === this.defaultLocale) {
			return text;
		}

		try {
			return await this.translator.translate(text, {
				from: this.defaultLocale,
				to: targetLocale,
				context,
			});
		} catch (error) {
			console.error('[rosetta] Translation failed:', error);
			return null;
		}
	}

	async generateAndSave(
		text: string,
		targetLocale: string,
		context?: string
	): Promise<string | null> {
		const translation = await this.generateTranslation(text, targetLocale, context);

		if (translation) {
			const hash = hashText(text, context);
			await this.storage.saveTranslation(targetLocale, hash, translation, {
				sourceText: text,
				context,
				autoGenerated: true,
			});
		}

		return translation;
	}

	async generateAllUntranslated(
		targetLocale: string,
		onProgress?: (current: number, total: number) => void
	): Promise<{ success: number; failed: number }> {
		const untranslated = await this.getUntranslated(targetLocale);
		let success = 0;
		let failed = 0;

		for (let i = 0; i < untranslated.length; i++) {
			const source = untranslated[i]!;
			const translation = await this.generateAndSave(
				source.text,
				targetLocale,
				source.context ?? undefined
			);

			if (translation) {
				success++;
			} else {
				failed++;
			}

			onProgress?.(i + 1, untranslated.length);
		}

		return { success, failed };
	}

	async saveTranslation(
		locale: string,
		text: string,
		translation: string,
		context?: string
	): Promise<void> {
		assertValidLocale(locale);
		assertValidText(text, 'source text');
		assertValidText(translation, 'translation');
		assertValidContext(context);

		const hash = hashText(text, context);
		await this.storage.saveTranslation(locale, hash, translation, {
			sourceText: text,
			context,
			autoGenerated: false,
		});
	}

	async saveTranslationByHash(
		locale: string,
		hash: string,
		translation: string,
		options?: { sourceText?: string; autoGenerated?: boolean }
	): Promise<void> {
		assertValidLocale(locale);
		assertValidHash(hash);
		assertValidText(translation, 'translation');
		if (options?.sourceText !== undefined) {
			assertValidText(options.sourceText, 'source text');
		}

		await this.storage.saveTranslation(locale, hash, translation, {
			sourceText: options?.sourceText,
			autoGenerated: options?.autoGenerated ?? false,
		});
	}

	// ============================================
	// Admin Methods
	// ============================================

	private applyPagination<T>(items: T[], options?: { limit?: number; offset?: number }): T[] {
		if (!options) return items;
		const { limit, offset = 0 } = options;
		const start = Math.max(0, offset);
		if (limit === undefined) return items.slice(start);
		return items.slice(start, start + limit);
	}

	async getSourcesWithStatus(
		locales: string[],
		options?: { limit?: number; offset?: number }
	): Promise<SourceWithStatus[]> {
		if (this.storage.getSourcesWithTranslations) {
			const results = await this.storage.getSourcesWithTranslations(locales);
			return this.applyPagination(results, options);
		}

		const sources = await this.storage.getSources();
		const translationsByLocale = new Map<string, Map<string, string>>();

		for (const locale of locales) {
			const translations = await this.storage.getTranslations(locale);
			translationsByLocale.set(locale, translations);
		}

		const results = sources.map((source) => {
			const translations: Record<
				string,
				{ text: string | null; autoGenerated: boolean; reviewed: boolean } | null
			> = {};

			for (const locale of locales) {
				const localeTranslations = translationsByLocale.get(locale);
				const translatedText = localeTranslations?.get(source.hash);

				if (translatedText) {
					translations[locale] = {
						text: translatedText,
						autoGenerated: false,
						reviewed: false,
					};
				} else {
					translations[locale] = null;
				}
			}

			return {
				id: source.id ?? source.hash,
				text: source.text,
				hash: source.hash,
				context: source.context,
				translations,
			};
		});

		return this.applyPagination(results, options);
	}

	async getTranslationStats(locales: string[]): Promise<TranslationStats> {
		if (this.storage.getSourcesWithTranslations) {
			const sourcesWithStatus = await this.getSourcesWithStatus(locales);
			const totalStrings = sourcesWithStatus.length;
			const localeStats: TranslationStats['locales'] = {};

			for (const locale of locales) {
				let translated = 0;
				let reviewed = 0;

				for (const source of sourcesWithStatus) {
					const translation = source.translations[locale];
					if (translation?.text) {
						translated++;
						if (translation.reviewed) {
							reviewed++;
						}
					}
				}

				localeStats[locale] = { translated, reviewed, total: totalStrings };
			}

			return { totalStrings, locales: localeStats };
		}

		const sources = await this.storage.getSources();
		const totalStrings = sources.length;
		const localeStats: TranslationStats['locales'] = {};

		for (const locale of locales) {
			const translations = await this.storage.getTranslations(locale);
			localeStats[locale] = {
				translated: translations.size,
				reviewed: 0,
				total: totalStrings,
			};
		}

		return { totalStrings, locales: localeStats };
	}

	async markAsReviewed(hash: string, locale: string): Promise<void> {
		if (!this.storage.markAsReviewed) {
			throw new Error('Storage adapter does not support markAsReviewed');
		}
		await this.storage.markAsReviewed(locale, hash);
	}

	async batchTranslate(
		items: Array<{ hash: string; text: string; context?: string }>,
		locale: string
	): Promise<{ success: number; failed: number }> {
		if (!this.translator) {
			throw new Error('No translator adapter configured');
		}

		if (items.length === 0) {
			return { success: 0, failed: 0 };
		}

		if (this.translator.translateBatch) {
			try {
				const results = await this.translator.translateBatch(
					items.map((i) => ({ text: i.text, context: i.context })),
					{ from: this.defaultLocale, to: locale }
				);

				let success = 0;
				for (let i = 0; i < results.length; i++) {
					const item = items[i]!;
					const translatedText = results[i];
					if (translatedText) {
						try {
							await this.storage.saveTranslation(locale, item.hash, translatedText, {
								sourceText: item.text,
								context: item.context,
								autoGenerated: true,
							});
							success++;
						} catch (error) {
							console.error(`[rosetta] Failed to save translation for hash ${item.hash}:`, error);
						}
					}
				}

				return { success, failed: items.length - success };
			} catch (error) {
				console.error('[rosetta] Batch translation failed:', error);
			}
		}

		const results = await Promise.allSettled(
			items.map((item) => this.generateAndSave(item.text, locale, item.context))
		);

		let success = 0;
		let failed = 0;
		for (const result of results) {
			if (result.status === 'fulfilled' && result.value) {
				success++;
			} else {
				failed++;
			}
		}

		return { success, failed };
	}

	async exportTranslations(locale: string): Promise<Record<string, string>> {
		const translations = await this.storage.getTranslations(locale);
		const sources = await this.storage.getSources();

		const result: Record<string, string> = {};
		for (const source of sources) {
			const translated = translations.get(source.hash);
			if (translated) {
				result[source.text] = translated;
			}
		}

		return result;
	}

	async importTranslations(
		locale: string,
		data: Record<string, string>,
		options?: { autoGenerated?: boolean }
	): Promise<number> {
		const entries = Object.entries(data);
		let imported = 0;

		for (const [sourceText, translatedText] of entries) {
			const hash = hashText(sourceText);
			try {
				await this.storage.saveTranslation(locale, hash, translatedText, {
					sourceText,
					autoGenerated: options?.autoGenerated ?? false,
				});
				imported++;
			} catch (error) {
				console.error(`[rosetta] Failed to import translation for "${sourceText}":`, error);
			}
		}

		return imported;
	}
}
