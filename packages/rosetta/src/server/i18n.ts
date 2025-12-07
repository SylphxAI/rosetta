import { hashText } from '../hash';
import { DEFAULT_LOCALE } from '../locales';
import type {
	SourceString,
	SourceWithStatus,
	StorageAdapter,
	TranslateAdapter,
	TranslationStats,
} from '../types';
import { runWithI18n } from './context';

/**
 * Locale detector function type
 */
export type LocaleDetector = () => Promise<string> | string;

/**
 * I18n server configuration
 */
export interface I18nConfig {
	/** Storage adapter for translations */
	storage: StorageAdapter;
	/** Optional translation adapter for auto-translation */
	translator?: TranslateAdapter;
	/** Default locale (source language) */
	defaultLocale?: string;
	/** Cache TTL in milliseconds (default: 60000) */
	cacheTTL?: number;
	/** Function to detect current locale */
	localeDetector?: LocaleDetector;
}

interface LoadedTranslations {
	/** hash -> translated text (for server lookup) */
	byHash: Map<string, string>;
	/** source -> translated text (for client) */
	bySource: Record<string, string>;
}

/**
 * Server-side I18n manager
 *
 * @example
 * const i18n = new I18n({
 *   storage: new DrizzleStorageAdapter(db),
 *   translator: new OpenRouterAdapter({ apiKey }),
 *   defaultLocale: 'en',
 *   localeDetector: () => cookies().get('locale')?.value ?? 'en',
 * });
 *
 * // In layout.tsx
 * export default async function Layout({ children }) {
 *   return i18n.init(async () => (
 *     <html><body>{children}</body></html>
 *   ));
 * }
 */
export class I18n {
	private storage: StorageAdapter;
	private translator?: TranslateAdapter;
	private defaultLocale: string;
	private cacheTTL: number;
	private localeDetector?: LocaleDetector;

	// In-memory cache
	private translationCache = new Map<string, LoadedTranslations>();
	private availableLocalesCache: string[] | null = null;
	private lastCacheTime = 0;

	constructor(config: I18nConfig) {
		this.storage = config.storage;
		this.translator = config.translator;
		this.defaultLocale = config.defaultLocale ?? DEFAULT_LOCALE;
		this.cacheTTL = config.cacheTTL ?? 60 * 1000; // 1 minute
		this.localeDetector = config.localeDetector;
	}

	/**
	 * Set locale detector function
	 */
	setLocaleDetector(detector: LocaleDetector): void {
		this.localeDetector = detector;
	}

	/**
	 * Detect current locale
	 * Returns default locale if detected locale has no translations
	 */
	async detectLocale(): Promise<string> {
		if (this.localeDetector) {
			const locale = await this.localeDetector();
			// Accept any locale - translations will be empty if none exist
			if (locale && locale !== this.defaultLocale) {
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
	 * Get all locales that have translations (discovered from DB)
	 */
	async getAvailableLocales(): Promise<string[]> {
		// Check cache
		const now = Date.now();
		if (this.availableLocalesCache && now - this.lastCacheTime < this.cacheTTL) {
			return this.availableLocalesCache;
		}

		const locales = await this.storage.getAvailableLocales();
		this.availableLocalesCache = locales;
		return locales;
	}

	/**
	 * Load translations for a locale (with caching)
	 */
	async loadTranslations(locale: string): Promise<LoadedTranslations> {
		// Default locale doesn't need translations
		if (locale === this.defaultLocale) {
			return { byHash: new Map(), bySource: {} };
		}

		// Check cache
		const now = Date.now();
		const cached = this.translationCache.get(locale);
		if (cached && now - this.lastCacheTime < this.cacheTTL) {
			return cached;
		}

		// Load from storage
		const translationMap = await this.storage.getTranslations(locale);

		// We need source text for client-side lookup
		// The storage adapter returns hash -> translated
		// We also need source -> translated for client
		const byHash = translationMap;
		const bySource: Record<string, string> = {};

		// Get all sources to build bySource map
		const sources = await this.storage.getSources();
		for (const source of sources) {
			const translated = translationMap.get(source.hash);
			if (translated) {
				bySource[source.text] = translated;
			}
		}

		const result: LoadedTranslations = { byHash, bySource };

		// Update cache
		this.translationCache.set(locale, result);
		this.lastCacheTime = now;

		return result;
	}

	/**
	 * Initialize i18n context for the current request
	 *
	 * @example
	 * export default async function Layout({ children }) {
	 *   return i18n.init(async () => (
	 *     <html><body>{children}</body></html>
	 *   ));
	 * }
	 */
	async init<T>(fn: () => T | Promise<T>): Promise<T> {
		const locale = await this.detectLocale();
		const loaded = await this.loadTranslations(locale);

		return runWithI18n(
			{
				locale,
				defaultLocale: this.defaultLocale,
				translations: loaded.byHash,
				translationsForClient: loaded.bySource,
				storage: this.storage,
			},
			() => fn()
		);
	}

	/**
	 * Get i18n data for client hydration
	 */
	async getClientData(): Promise<{
		locale: string;
		defaultLocale: string;
		availableLocales: string[];
		translations: Record<string, string>;
	}> {
		const locale = await this.detectLocale();
		const loaded = await this.loadTranslations(locale);
		const availableLocales = await this.getAvailableLocales();

		return {
			locale,
			defaultLocale: this.defaultLocale,
			availableLocales,
			translations: loaded.bySource,
		};
	}

	/**
	 * Invalidate translation cache
	 */
	invalidateCache(): void {
		this.translationCache.clear();
		this.availableLocalesCache = null;
		this.lastCacheTime = 0;
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
			console.error('[lingua] Translation failed:', error);
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
			this.invalidateCache();
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
	 */
	async saveTranslation(
		locale: string,
		text: string,
		translation: string,
		context?: string
	): Promise<void> {
		const hash = hashText(text, context);
		await this.storage.saveTranslation(locale, hash, translation, {
			sourceText: text,
			context,
			autoGenerated: false,
		});
		this.invalidateCache();
	}

	/**
	 * Save translation by hash (for admin operations)
	 */
	async saveTranslationByHash(
		locale: string,
		hash: string,
		translation: string,
		options?: { sourceText?: string; autoGenerated?: boolean }
	): Promise<void> {
		await this.storage.saveTranslation(locale, hash, translation, {
			sourceText: options?.sourceText,
			autoGenerated: options?.autoGenerated ?? false,
		});
		this.invalidateCache();
	}

	// ============================================
	// Admin Methods
	// ============================================

	/**
	 * Get all source strings with translation status for specified locales
	 * Used by admin dashboard
	 * @param locales - Locales to check translation status for
	 */
	async getSourcesWithStatus(locales: string[]): Promise<SourceWithStatus[]> {
		// If storage adapter has optimized method, use it
		if (this.storage.getSourcesWithTranslations) {
			return this.storage.getSourcesWithTranslations(locales);
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
		return sources.map((source) => {
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
	}

	/**
	 * Get translation statistics for specified locales
	 * @param locales - Locales to get stats for
	 */
	async getStats(locales: string[]): Promise<TranslationStats> {
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
		this.invalidateCache();
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
						} catch {
							// Continue on individual save errors
						}
					}
				}

				this.invalidateCache();
				return { success, failed: items.length - success };
			} catch (error) {
				console.error('[lingua] Batch translation failed:', error);
				// Fall back to sequential translation
			}
		}

		// Sequential fallback
		let success = 0;
		let failed = 0;

		for (const item of items) {
			const translation = await this.generateAndSave(item.text, locale, item.context);
			if (translation) {
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
			} catch {
				// Continue on individual errors
			}
		}

		this.invalidateCache();
		return imported;
	}
}
