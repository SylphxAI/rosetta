/**
 * Server Context Tests
 *
 * Tests for AsyncLocalStorage-based context management.
 */

import { describe, expect, test, beforeEach, mock } from 'bun:test';
import {
	rosettaStorage,
	t,
	getTranslationsAsync,
	getLocale,
	getDefaultLocale,
	getLocaleChain,
	getTranslationsForClient,
	runWithRosetta,
	getRosettaContext,
	isInsideRosettaContext,
	type RunWithRosettaOptions,
} from '../server/context';

// ============================================
// Mock Storage Adapter
// ============================================

function createMockStorage() {
	const translations = new Map<string, Map<string, string>>([
		['en', new Map([['abc123', 'Hello'], ['def456', 'World']])],
		['zh-TW', new Map([['abc123', '你好'], ['def456', '世界']])],
	]);

	return {
		getSources: async () => [],
		getTranslations: async (locale: string) => translations.get(locale) ?? new Map(),
		saveSource: async () => {},
		saveTranslation: async () => {},
		getUntranslated: async () => [],
		getAvailableLocales: async () => ['en', 'zh-TW'],
	};
}

// ============================================
// Context Tests
// ============================================

describe('rosettaStorage', () => {
	test('is an AsyncLocalStorage instance', () => {
		expect(rosettaStorage).toBeDefined();
		expect(typeof rosettaStorage.run).toBe('function');
		expect(typeof rosettaStorage.getStore).toBe('function');
	});
});

describe('isInsideRosettaContext', () => {
	test('returns false outside context', () => {
		expect(isInsideRosettaContext()).toBe(false);
	});

	test('returns true inside context', async () => {
		const storage = createMockStorage();
		const translations = new Map([['abc123', 'Hello']]);

		await runWithRosetta(
			{
				locale: 'en',
				defaultLocale: 'en',
				translations,
				storage,
			},
			() => {
				expect(isInsideRosettaContext()).toBe(true);
			}
		);
	});
});

describe('getRosettaContext', () => {
	test('returns undefined outside context', () => {
		expect(getRosettaContext()).toBeUndefined();
	});

	test('returns context inside runWithRosetta', async () => {
		const storage = createMockStorage();
		const translations = new Map([['abc123', 'Hello']]);

		await runWithRosetta(
			{
				locale: 'zh-TW',
				defaultLocale: 'en',
				translations,
				storage,
			},
			() => {
				const ctx = getRosettaContext();
				expect(ctx?.locale).toBe('zh-TW');
				expect(ctx?.defaultLocale).toBe('en');
				expect(ctx?.translations).toBe(translations);
			}
		);
	});
});

describe('getLocale', () => {
	test('returns default locale outside context', () => {
		expect(getLocale()).toBe('en'); // DEFAULT_LOCALE
	});

	test('returns current locale', async () => {
		const storage = createMockStorage();

		await runWithRosetta(
			{
				locale: 'ja',
				defaultLocale: 'en',
				translations: new Map(),
				storage,
			},
			() => {
				expect(getLocale()).toBe('ja');
			}
		);
	});
});

describe('getDefaultLocale', () => {
	test('returns default locale outside context', () => {
		expect(getDefaultLocale()).toBe('en'); // DEFAULT_LOCALE
	});

	test('returns default locale', async () => {
		const storage = createMockStorage();

		await runWithRosetta(
			{
				locale: 'zh-TW',
				defaultLocale: 'en',
				translations: new Map(),
				storage,
			},
			() => {
				expect(getDefaultLocale()).toBe('en');
			}
		);
	});
});

describe('getLocaleChain', () => {
	test('returns default chain outside context', () => {
		expect(getLocaleChain()).toEqual(['en']); // [DEFAULT_LOCALE]
	});

	test('returns locale chain', async () => {
		const storage = createMockStorage();

		await runWithRosetta(
			{
				locale: 'zh-TW',
				defaultLocale: 'en',
				localeChain: ['zh-TW', 'zh', 'en'],
				translations: new Map(),
				storage,
			},
			() => {
				expect(getLocaleChain()).toEqual(['zh-TW', 'zh', 'en']);
			}
		);
	});
});

// ============================================
// Translation Function Tests
// ============================================

describe('t function', () => {
	test('returns original text outside context', () => {
		// Outside context, t() returns formatted original text
		expect(t('Hello')).toBe('Hello');
	});

	test('returns translation when found', async () => {
		const storage = createMockStorage();
		const translations = new Map([
			['35ddf285', '你好世界'], // hash of "Hello World"
		]);

		await runWithRosetta(
			{
				locale: 'zh-TW',
				defaultLocale: 'en',
				translations,
				storage,
			},
			() => {
				expect(t('Hello World')).toBe('你好世界');
			}
		);
	});

	test('returns original text when translation not found', async () => {
		const storage = createMockStorage();

		await runWithRosetta(
			{
				locale: 'zh-TW',
				defaultLocale: 'en',
				translations: new Map(),
				storage,
			},
			() => {
				expect(t('Hello World')).toBe('Hello World');
			}
		);
	});

	test('handles ICU parameters', async () => {
		const storage = createMockStorage();
		const translations = new Map([
			['616777a2', '{count} 位用戶'], // hash of "{count} users"
		]);

		await runWithRosetta(
			{
				locale: 'zh-TW',
				defaultLocale: 'en',
				translations,
				storage,
			},
			() => {
				expect(t('{count} users', { count: 5 })).toBe('5 位用戶');
			}
		);
	});

	test('respects context for hashing', async () => {
		const storage = createMockStorage();
		// "Save" with context "button" has different hash than without
		const translations = new Map([
			['6a58b672', '儲存 (按鈕)'], // hash of "Save" with context "button"
		]);

		await runWithRosetta(
			{
				locale: 'zh-TW',
				defaultLocale: 'en',
				translations,
				storage,
			},
			() => {
				expect(t('Save', { context: 'button' })).toBe('儲存 (按鈕)');
			}
		);
	});
});

describe('getTranslationsAsync', () => {
	test('returns t function', async () => {
		const storage = createMockStorage();

		await runWithRosetta(
			{
				locale: 'en',
				defaultLocale: 'en',
				translations: new Map(),
				storage,
			},
			async () => {
				const translate = await getTranslationsAsync();
				expect(typeof translate).toBe('function');
				expect(translate('Test')).toBe('Test');
			}
		);
	});
});

describe('getTranslationsForClient', () => {
	test('returns empty object outside context', () => {
		expect(getTranslationsForClient()).toEqual({});
	});

	test('returns translations object', async () => {
		const storage = createMockStorage();
		const translations = new Map([
			['abc123', '你好'],
			['def456', '世界'],
		]);

		await runWithRosetta(
			{
				locale: 'zh-TW',
				defaultLocale: 'en',
				translations,
				storage,
			},
			() => {
				const result = getTranslationsForClient();
				expect(result).toEqual({
					abc123: '你好',
					def456: '世界',
				});
			}
		);
	});
});

// ============================================
// runWithRosetta Tests
// ============================================

describe('runWithRosetta', () => {
	test('runs function within context', async () => {
		const storage = createMockStorage();
		let executed = false;

		await runWithRosetta(
			{
				locale: 'en',
				defaultLocale: 'en',
				translations: new Map(),
				storage,
			},
			() => {
				executed = true;
			}
		);

		expect(executed).toBe(true);
	});

	test('supports async functions', async () => {
		const storage = createMockStorage();

		const result = await runWithRosetta(
			{
				locale: 'en',
				defaultLocale: 'en',
				translations: new Map(),
				storage,
			},
			async () => {
				await new Promise((r) => setTimeout(r, 10));
				return 'async result';
			}
		);

		expect(result).toBe('async result');
	});

	test('returns function result', async () => {
		const storage = createMockStorage();

		const result = await runWithRosetta(
			{
				locale: 'en',
				defaultLocale: 'en',
				translations: new Map(),
				storage,
			},
			() => 42
		);

		expect(result).toBe(42);
	});

	test('builds locale chain if not provided', async () => {
		const storage = createMockStorage();

		await runWithRosetta(
			{
				locale: 'zh-TW',
				defaultLocale: 'en',
				translations: new Map(),
				storage,
			},
			() => {
				const chain = getLocaleChain();
				expect(chain).toContain('zh-TW');
				expect(chain).toContain('en');
			}
		);
	});

	test('uses provided locale chain', async () => {
		const storage = createMockStorage();
		const customChain = ['zh-TW', 'zh', 'ja', 'en'];

		await runWithRosetta(
			{
				locale: 'zh-TW',
				defaultLocale: 'en',
				localeChain: customChain,
				translations: new Map(),
				storage,
			},
			() => {
				expect(getLocaleChain()).toEqual(customChain);
			}
		);
	});

	test('provides isolated context for concurrent requests', async () => {
		const storage = createMockStorage();

		const results = await Promise.all([
			runWithRosetta(
				{
					locale: 'en',
					defaultLocale: 'en',
					translations: new Map(),
					storage,
				},
				async () => {
					await new Promise((r) => setTimeout(r, 50));
					return getLocale();
				}
			),
			runWithRosetta(
				{
					locale: 'zh-TW',
					defaultLocale: 'en',
					translations: new Map(),
					storage,
				},
				async () => {
					await new Promise((r) => setTimeout(r, 10));
					return getLocale();
				}
			),
			runWithRosetta(
				{
					locale: 'ja',
					defaultLocale: 'en',
					translations: new Map(),
					storage,
				},
				async () => {
					return getLocale();
				}
			),
		]);

		expect(results).toEqual(['en', 'zh-TW', 'ja']);
	});
});
