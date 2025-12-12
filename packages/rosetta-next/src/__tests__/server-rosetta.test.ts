/**
 * Rosetta Class Tests
 *
 * Tests for the server-side Rosetta manager.
 */

import { describe, expect, test, beforeEach, mock } from 'bun:test';
import { createRosetta, Rosetta } from '../server/rosetta';
import type { StorageAdapter, TranslateAdapter } from '@sylphx/rosetta';

// ============================================
// Mock Storage Adapter
// ============================================

function createMockStorage(data?: {
	sources?: Array<{ id: string; text: string; hash: string; context?: string }>;
	translations?: Map<string, Map<string, string>>;
}): StorageAdapter {
	const sources = data?.sources ?? [
		{ id: '1', text: 'Hello', hash: 'abc123' },
		{ id: '2', text: 'World', hash: 'def456' },
		{ id: '3', text: 'Goodbye', hash: 'ghi789' },
	];

	const translations = data?.translations ?? new Map([
		['en', new Map([['abc123', 'Hello'], ['def456', 'World'], ['ghi789', 'Goodbye']])],
		['zh-TW', new Map([['abc123', '你好'], ['def456', '世界']])],
		['zh', new Map([['abc123', '你好 (简)']])],
	]);

	const savedTranslations: Array<{ locale: string; hash: string; text: string }> = [];

	return {
		getSources: async () => sources,
		getTranslations: async (locale: string) => translations.get(locale) ?? new Map(),
		saveSource: async () => {},
		saveTranslation: async (locale, hash, text) => {
			savedTranslations.push({ locale, hash, text });
			const localeMap = translations.get(locale) ?? new Map();
			localeMap.set(hash, text);
			translations.set(locale, localeMap);
		},
		getUntranslated: async (locale: string) => {
			const localeTranslations = translations.get(locale) ?? new Map();
			return sources.filter((s) => !localeTranslations.has(s.hash));
		},
		getAvailableLocales: async () => Array.from(translations.keys()),
		// For testing
		_savedTranslations: savedTranslations,
	} as StorageAdapter & { _savedTranslations: typeof savedTranslations };
}

function createMockTranslator(): TranslateAdapter {
	return {
		translate: async (text, options) => {
			return `[${options?.to}] ${text}`;
		},
	};
}

// ============================================
// createRosetta Tests
// ============================================

describe('createRosetta', () => {
	test('creates Rosetta instance', () => {
		const storage = createMockStorage();
		const rosetta = createRosetta({ storage });

		expect(rosetta).toBeInstanceOf(Rosetta);
	});

	test('uses custom default locale', () => {
		const storage = createMockStorage();
		const rosetta = createRosetta({ storage, defaultLocale: 'ja' });

		expect(rosetta.getDefaultLocale()).toBe('ja');
	});
});

// ============================================
// Rosetta Class Tests
// ============================================

describe('Rosetta', () => {
	describe('getDefaultLocale', () => {
		test('returns default locale', () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			expect(rosetta.getDefaultLocale()).toBe('en');
		});

		test('defaults to "en"', () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage });

			expect(rosetta.getDefaultLocale()).toBe('en');
		});
	});

	describe('getStorage', () => {
		test('returns storage adapter', () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage });

			expect(rosetta.getStorage()).toBe(storage);
		});
	});

	describe('getAvailableLocales', () => {
		test('returns locales from storage', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage });

			const locales = await rosetta.getAvailableLocales();
			expect(locales).toContain('en');
			expect(locales).toContain('zh-TW');
		});
	});

	describe('loadTranslations', () => {
		test('loads translations for locale', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const translations = await rosetta.loadTranslations('zh-TW');

			expect(translations.get('abc123')).toBe('你好');
			expect(translations.get('def456')).toBe('世界');
		});

		test('falls back through locale chain', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			// zh-TW → zh → en fallback
			const translations = await rosetta.loadTranslations('zh-TW');

			// zh-TW has 你好, 世界
			expect(translations.get('abc123')).toBe('你好');
			// ghi789 falls back to en
			expect(translations.get('ghi789')).toBe('Goodbye');
		});

		test('uses cache when available', async () => {
			const storage = createMockStorage();
			const cache = {
				get: async (locale: string) => {
					if (locale === 'cached') {
						return new Map([['cached123', 'Cached Value']]);
					}
					return null;
				},
				set: async () => {},
				invalidate: async () => {},
				has: async () => false,
			};

			const rosetta = new Rosetta({ storage, cache, defaultLocale: 'en' });

			const translations = await rosetta.loadTranslations('cached');
			expect(translations.get('cached123')).toBe('Cached Value');
		});
	});

	describe('loadTranslationsByHashes', () => {
		test('loads specific translations', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const translations = await rosetta.loadTranslationsByHashes('zh-TW', ['abc123']);

			expect(translations.get('abc123')).toBe('你好');
			expect(translations.has('def456')).toBe(true); // Still loads all since mock doesn't filter
		});
	});

	describe('detectLocale', () => {
		test('returns default locale without detector', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const locale = await rosetta.detectLocale();
			expect(locale).toBe('en');
		});

		test('uses locale detector', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({
				storage,
				defaultLocale: 'en',
				localeDetector: () => 'ja',
			});

			const locale = await rosetta.detectLocale();
			expect(locale).toBe('ja');
		});

		test('falls back on invalid locale from detector', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({
				storage,
				defaultLocale: 'en',
				localeDetector: () => 'invalid!!!',
			});

			const locale = await rosetta.detectLocale();
			expect(locale).toBe('en');
		});

		test('supports async locale detector', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({
				storage,
				defaultLocale: 'en',
				localeDetector: async () => {
					await new Promise((r) => setTimeout(r, 10));
					return 'zh-TW';
				},
			});

			const locale = await rosetta.detectLocale();
			expect(locale).toBe('zh-TW');
		});
	});

	describe('setLocaleDetector', () => {
		test('updates locale detector', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			rosetta.setLocaleDetector(() => 'ko');

			const locale = await rosetta.detectLocale();
			expect(locale).toBe('ko');
		});
	});

	describe('invalidateCache', () => {
		test('calls cache invalidate', async () => {
			const storage = createMockStorage();
			let invalidated: string | undefined;
			const cache = {
				get: async () => null,
				set: async () => {},
				invalidate: async (locale?: string) => {
					invalidated = locale;
				},
				has: async () => false,
			};

			const rosetta = new Rosetta({ storage, cache, defaultLocale: 'en' });

			await rosetta.invalidateCache('zh-TW');
			expect(invalidated).toBe('zh-TW');
		});

		test('does nothing without cache', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			// Should not throw
			await rosetta.invalidateCache();
		});
	});

	describe('init', () => {
		test('runs function within context', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const result = await rosetta.init(() => 'test result');
			expect(result).toBe('test result');
		});

		test('supports async functions', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const result = await rosetta.init(async () => {
				await new Promise((r) => setTimeout(r, 10));
				return 'async result';
			});

			expect(result).toBe('async result');
		});
	});

	describe('getClientData', () => {
		test('returns hydration data', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const data = await rosetta.getClientData();

			expect(data.locale).toBe('en');
			expect(data.defaultLocale).toBe('en');
			expect(data.availableLocales).toContain('en');
			expect(typeof data.translations).toBe('object');
		});
	});

	// ============================================
	// Translation Management Tests
	// ============================================

	describe('getSources', () => {
		test('returns sources from storage', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const sources = await rosetta.getSources();
			expect(sources.length).toBe(3);
			expect(sources[0].text).toBe('Hello');
		});
	});

	describe('getUntranslated', () => {
		test('returns untranslated sources', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const untranslated = await rosetta.getUntranslated('zh-TW');
			// zh-TW has abc123 and def456, missing ghi789
			expect(untranslated.length).toBe(1);
			expect(untranslated[0].text).toBe('Goodbye');
		});
	});

	describe('generateTranslation', () => {
		test('throws without translator', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			await expect(rosetta.generateTranslation('Hello', 'zh-TW')).rejects.toThrow(
				'No translator adapter configured'
			);
		});

		test('returns original for default locale', async () => {
			const storage = createMockStorage();
			const translator = createMockTranslator();
			const rosetta = new Rosetta({ storage, translator, defaultLocale: 'en' });

			const result = await rosetta.generateTranslation('Hello', 'en');
			expect(result).toBe('Hello');
		});

		test('generates translation', async () => {
			const storage = createMockStorage();
			const translator = createMockTranslator();
			const rosetta = new Rosetta({ storage, translator, defaultLocale: 'en' });

			const result = await rosetta.generateTranslation('Hello', 'ja');
			expect(result).toBe('[ja] Hello');
		});
	});

	describe('saveTranslation', () => {
		test('saves translation to storage', async () => {
			const storage = createMockStorage() as ReturnType<typeof createMockStorage> & {
				_savedTranslations: Array<{ locale: string; hash: string; text: string }>;
			};
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			await rosetta.saveTranslation('ja', 'Test', 'テスト');

			expect(storage._savedTranslations.length).toBe(1);
			expect(storage._savedTranslations[0].locale).toBe('ja');
			expect(storage._savedTranslations[0].text).toBe('テスト');
		});

		test('validates inputs', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			await expect(rosetta.saveTranslation('invalid!!!', 'Test', 'テスト')).rejects.toThrow();
		});
	});

	describe('getTranslationStats', () => {
		test('returns statistics', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const stats = await rosetta.getTranslationStats(['en', 'zh-TW']);

			expect(stats.totalStrings).toBe(3);
			expect(stats.locales.en.translated).toBe(3);
			expect(stats.locales['zh-TW'].translated).toBe(2);
		});
	});

	describe('exportTranslations', () => {
		test('exports translations', async () => {
			const storage = createMockStorage();
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const exported = await rosetta.exportTranslations('zh-TW');

			expect(exported['Hello']).toBe('你好');
			expect(exported['World']).toBe('世界');
		});
	});

	describe('importTranslations', () => {
		test('imports translations', async () => {
			const storage = createMockStorage() as ReturnType<typeof createMockStorage> & {
				_savedTranslations: Array<{ locale: string; hash: string; text: string }>;
			};
			const rosetta = new Rosetta({ storage, defaultLocale: 'en' });

			const count = await rosetta.importTranslations('ko', {
				Hello: '안녕하세요',
				World: '세계',
			});

			expect(count).toBe(2);
			expect(storage._savedTranslations.length).toBe(2);
		});
	});
});
