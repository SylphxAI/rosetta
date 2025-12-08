import type { CacheAdapter } from '../cache';
import { hashText } from '../hash';
import { DEFAULT_LOCALE } from '../locales';
import type {
	SourceString,
	SourceWithStatus,
	StorageAdapter,
	TranslateAdapter,
	TranslationStats,
} from '../types';
import { buildLocaleChain, isValidLocale, runWithRosetta } from './context';

/**
 * Locale detector function type
 */
export type LocaleDetector = () => Promise<string> | string;

/**
 * Rosetta server configuration
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
	 *
	 * @example Serverless with Upstash
	 * ```ts
	 * import { Redis } from '@upstash/redis';
	 * import { ExternalCache } from '@sylphx/rosetta/server';
	 *
	 * const redis = new Redis({ url, token });
	 * const cache = new ExternalCache(redis, { ttlSeconds: 60 });
	 *
	 * const rosetta = new Rosetta({ storage, cache });
	 * ```
	 */
	cache?: CacheAdapter;
}

/**
 * Server-side Rosetta manager
 *
 * Supports optional caching for different deployment environments:
 * - **Serverless (Vercel, Lambda):** Use ExternalCache with Redis/Upstash
 * - **Traditional servers:** Use InMemoryCache for fast local caching
 * - **Edge workers:** No cache needed (stateless)
 *
 * @example Basic setup (no cache)
 * ```ts
 * const rosetta = new Rosetta({
 *   storage: new DrizzleStorageAdapter(db),
 *   defaultLocale: 'en',
 * });
 * ```
 *
 * @example With Upstash Redis cache (serverless)
 * ```ts
 * import { Redis } from '@upstash/redis';
 * import { ExternalCache } from '@sylphx/rosetta/server';
 *
 * const redis = new Redis({ url: process.env.UPSTASH_URL!, token: process.env.UPSTASH_TOKEN! });
 * const cache = new ExternalCache(redis, { ttlSeconds: 60 });
 *
 * const rosetta = new Rosetta({
 *   storage: new DrizzleStorageAdapter(db),
 *   cache,
 *   defaultLocale: 'en',
 * });
 * ```
 *
 * @example With in-memory cache (traditional server)
 * ```ts
 * import { InMemoryCache } from '@sylphx/rosetta/server';
 *
 * const cache = new InMemoryCache({ ttlMs: 60000 });
 * const rosetta = new Rosetta({ storage, cache, defaultLocale: 'en' });
 * ```
 */
export class Rosetta {
	private storage: StorageAdapter;
	private translator?: TranslateAdapter;
	private defaultLocale: string;
	private localeDetector?: LocaleDetector;
	private cache?: CacheAdapter;

	constructor(config: RosettaConfig) {
		this.storage = config.storage;
		this.translator = config.translator;
		this.defaultLocale = config.defaultLocale ?? DEFAULT_LOCALE;
		this.localeDetector = config.localeDetector;
		this.cache = config.cache;
	}

	/**
	 * Set locale detector function
	 */
	setLocaleDetector(detector: LocaleDetector): void {
		this.localeDetector = detector;
	}

	/**
	 * Detect current locale
	 * Returns default locale if detected locale is invalid or has no translations
	 */
	async detectLocale(): Promise<string> {
		if (this.localeDetector) {
			const locale = await this.localeDetector();
			// Validate locale format and return if valid
			if (locale && locale !== this.defaultLocale) {
				if (!isValidLocale(locale)) {
					if (process.env.NODE_ENV === 'development') {
						console.warn(
							`[rosetta] Invalid locale format: "${locale}". Expected BCP 47 format (e.g., "en", "zh-TW", "pt-BR"). Falling back to default locale.`
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
	 * Get storage adapter (for RosettaProvider)
	 * @internal
	 */
	getStorage(): StorageAdapter {
		return this.storage;
	}

	/**
	 * Get all locales that have translations (discovered from DB)
	 */
	async getAvailableLocales(): Promise<string[]> {
		return this.storage.getAvailableLocales();
	}

	/**
	 * Load translations for a locale with fallback chain
	 * Falls back through locale chain (e.g., zh-TW → zh → en)
	 *
	 * If a cache adapter is configured, translations are cached to reduce DB queries.
	 * This is especially important for serverless environments where each request
	 * may be a cold start.
	 *
	 * @returns Map of hash -> translated text (merged from fallback chain)
	 */
	async loadTranslations(locale: string): Promise<Map<string, string>> {
		// Default locale doesn't need translations
		if (locale === this.defaultLocale) {
			return new Map();
		}

		// Check cache first (if configured)
		if (this.cache) {
			const cached = await this.cache.get(locale);
			if (cached) {
				return cached;
			}
		}

		// Build fallback chain and load from each locale
		const chain = buildLocaleChain(locale, this.defaultLocale);
		const merged = new Map<string, string>();

		// Load from fallback chain in reverse order (default first, then more specific)
		// This way, more specific locales override less specific ones
		for (let i = chain.length - 1; i >= 0; i--) {
			const chainLocale = chain[i]!;
			// Skip default locale (no translations needed)
			if (chainLocale === this.defaultLocale) continue;

			const translations = await this.storage.getTranslations(chainLocale);
			for (const [hash, text] of translations) {
				merged.set(hash, text);
			}
		}

		// Store in cache (if configured)
		if (this.cache && merged.size > 0) {
			await this.cache.set(locale, merged);
		}

		return merged;
	}

	/**
	 * Invalidate cached translations
	 *
	 * Call this after updating translations to ensure fresh data is loaded.
	 *
	 * @param locale - Specific locale to invalidate, or undefined for all
	 */
	async invalidateCache(locale?: string): Promise<void> {
		if (this.cache) {
			await this.cache.invalidate(locale);
		}
	}

	/**
	 * Load translations for specific hashes only (fine-grained loading)
	 * Falls back through locale chain (e.g., zh-TW → zh → en)
	 * @returns Map of hash -> translated text (merged from fallback chain)
	 */
	async loadTranslationsByHashes(locale: string, hashes: string[]): Promise<Map<string, string>> {
		// Default locale doesn't need translations
		if (locale === this.defaultLocale) {
			return new Map();
		}

		// Build fallback chain
		const chain = buildLocaleChain(locale, this.defaultLocale);
		const merged = new Map<string, string>();

		// Load from fallback chain in reverse order (default first, then more specific)
		for (let i = chain.length - 1; i >= 0; i--) {
			const chainLocale = chain[i]!;
			// Skip default locale (no translations needed)
			if (chainLocale === this.defaultLocale) continue;

			// Use fine-grained loading if available
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
	 * Initialize Rosetta context for the current request
	 *
	 * @example
	 * export default async function Layout({ children }) {
	 *   return rosetta.init(async () => (
	 *     <html><body>{children}</body></html>
	 *   ));
	 * }
	 */
	async init<T>(fn: () => T | Promise<T>): Promise<T> {
		const locale = await this.detectLocale();
		const translations = await this.loadTranslations(locale);

		return runWithRosetta(
			{
				locale,
				defaultLocale: this.defaultLocale,
				translations,
				storage: this.storage,
			},
			() => fn()
		);
	}

	/**
	 * Get Rosetta data for client hydration
	 * @returns translations as hash -> translated text (same format as server)
	 */
	async getClientData(): Promise<{
		locale: string;
		defaultLocale: string;
		availableLocales: string[];
		translations: Record<string, string>;
	}> {
		const locale = await this.detectLocale();
		const translations = await this.loadTranslations(locale);
		const availableLocales = await this.getAvailableLocales();

		return {
			locale,
			defaultLocale: this.defaultLocale,
			availableLocales,
			translations: Object.fromEntries(translations),
		};
	}

	// ============================================
	// Translation Management
	// ============================================

	/**
	 * Get all source strings
	 */
	async getSources(): Promise<SourceString[]> {
		return this.storage.getSources();
	}

	/**
	 * Get untranslated strings for a locale
	 */
	async getUntranslated(locale: string): Promise<SourceString[]> {
		return this.storage.getUntranslated(locale);
	}

	/**
	 * Generate translation using translator adapter
	 */
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

	/**
	 * Generate and save translation
	 */
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

	/**
	 * Generate translations for all untranslated strings
	 */
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

	/**
	 * Save a manual translation
	 * @throws Error if locale or text is empty
	 */
	async saveTranslation(
		locale: string,
		text: string,
		translation: string,
		context?: string
	): Promise<void> {
		// Validate inputs
		if (!locale || typeof locale !== 'string' || !locale.trim()) {
			throw new Error('Locale is required and must be a non-empty string');
		}
		if (!text || typeof text !== 'string') {
			throw new Error('Source text is required and must be a string');
		}
		if (typeof translation !== 'string') {
			throw new Error('Translation must be a string');
		}

		const hash = hashText(text, context);
		await this.storage.saveTranslation(locale, hash, translation, {
			sourceText: text,
			context,
			autoGenerated: false,
		});
	}

	/**
	 * Save translation by hash (for admin operations)
	 * @throws Error if locale or hash is empty
	 */
	async saveTranslationByHash(
		locale: string,
		hash: string,
		translation: string,
		options?: { sourceText?: string; autoGenerated?: boolean }
	): Promise<void> {
		// Validate inputs
		if (!locale || typeof locale !== 'string' || !locale.trim()) {
			throw new Error('Locale is required and must be a non-empty string');
		}
		if (!hash || typeof hash !== 'string' || !hash.trim()) {
			throw new Error('Hash is required and must be a non-empty string');
		}
		if (typeof translation !== 'string') {
			throw new Error('Translation must be a string');
		}

		await this.storage.saveTranslation(locale, hash, translation, {
			sourceText: options?.sourceText,
			autoGenerated: options?.autoGenerated ?? false,
		});
	}

	// ============================================
	// Admin Methods
	// ============================================

	/**
	 * Pagination options for admin methods
	 */
	private applyPagination<T>(items: T[], options?: { limit?: number; offset?: number }): T[] {
		if (!options) return items;
		const { limit, offset = 0 } = options;
		const start = Math.max(0, offset);
		if (limit === undefined) return items.slice(start);
		return items.slice(start, start + limit);
	}

	/**
	 * Get all source strings with translation status for specified locales
	 * Used by admin dashboard
	 * @param locales - Locales to check translation status for
	 * @param options - Pagination options (limit, offset)
	 */
	async getSourcesWithStatus(
		locales: string[],
		options?: { limit?: number; offset?: number }
	): Promise<SourceWithStatus[]> {
		// If storage adapter has optimized method, use it
		if (this.storage.getSourcesWithTranslations) {
			const results = await this.storage.getSourcesWithTranslations(locales);
			return this.applyPagination(results, options);
		}

		// Otherwise, build it manually (less efficient)
		const sources = await this.storage.getSources();
		const translationsByLocale = new Map<string, Map<string, string>>();

		// Load translations for all requested locales
		for (const locale of locales) {
			const translations = await this.storage.getTranslations(locale);
			translationsByLocale.set(locale, translations);
		}

		// Build result
		const results = sources.map((source) => {
			const translations: Record<
				string,
				{ text: string | null; autoGenerated: boolean; reviewed: boolean } | null
			> = {};

			for (const locale of locales) {
				const localeTranslations = translationsByLocale.get(locale);
				const translatedText = localeTranslations?.get(source.hash);

				if (translatedText) {
					// We don't have autoGenerated/reviewed info in basic implementation
					// Storage adapter should provide this via getSourcesWithTranslations
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

	/**
	 * Get translation statistics for specified locales
	 * @param locales - Locales to get stats for
	 */
	async getTranslationStats(locales: string[]): Promise<TranslationStats> {
		// If we have getSourcesWithStatus, use it for accurate stats
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

		// Fallback: basic stats without reviewed count
		const sources = await this.storage.getSources();
		const totalStrings = sources.length;
		const localeStats: TranslationStats['locales'] = {};

		for (const locale of locales) {
			const translations = await this.storage.getTranslations(locale);
			localeStats[locale] = {
				translated: translations.size,
				reviewed: 0, // Can't determine without proper storage method
				total: totalStrings,
			};
		}

		return { totalStrings, locales: localeStats };
	}

	/**
	 * Mark a translation as reviewed
	 */
	async markAsReviewed(hash: string, locale: string): Promise<void> {
		if (!this.storage.markAsReviewed) {
			throw new Error('Storage adapter does not support markAsReviewed');
		}

		await this.storage.markAsReviewed(locale, hash);
	}

	/**
	 * Batch translate multiple strings
	 * More efficient than translating one by one
	 */
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

		// If translator supports batch, use it
		if (this.translator.translateBatch) {
			try {
				const results = await this.translator.translateBatch(
					items.map((i) => ({ text: i.text, context: i.context })),
					{ from: this.defaultLocale, to: locale }
				);

				// Save all translations
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
				// Fall back to parallel translation
			}
		}

		// Parallel fallback using Promise.allSettled for better performance
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

	/**
	 * Export translations to JSON format
	 */
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

	/**
	 * Import translations from JSON format
	 * @returns Number of translations imported
	 */
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
