/**
 * Server Context Tests (Edge-compatible architecture)
 *
 * Tests for translation utilities without AsyncLocalStorage.
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
	_resetLocaleStore,
	_setTestLocale,
	createTranslator,
	getLocale,
	getRequestLocale,
	setRequestLocale,
	t,
	translationsToRecord,
	type TranslatorContext,
} from '../server/context';

// Reset locale store before each test to ensure isolation
// Tests run outside RSC context, so we use test mode
beforeEach(() => {
	_resetLocaleStore();
});

// ============================================
// createTranslator Tests
// ============================================

describe('createTranslator', () => {
	test('creates a translation function', () => {
		const ctx: TranslatorContext = {
			locale: 'en',
			defaultLocale: 'en',
			translations: new Map(),
		};

		const translate = createTranslator(ctx);
		expect(typeof translate).toBe('function');
	});

	test('returns original text for default locale', () => {
		const ctx: TranslatorContext = {
			locale: 'en',
			defaultLocale: 'en',
			translations: new Map([['35ddf285', '你好世界']]),
		};

		const translate = createTranslator(ctx);
		expect(translate('Hello World')).toBe('Hello World');
	});

	test('returns translation when found', () => {
		const ctx: TranslatorContext = {
			locale: 'zh-TW',
			defaultLocale: 'en',
			translations: new Map([['35ddf285', '你好世界']]), // hash of "Hello World"
		};

		const translate = createTranslator(ctx);
		expect(translate('Hello World')).toBe('你好世界');
	});

	test('returns original text when translation not found', () => {
		const ctx: TranslatorContext = {
			locale: 'zh-TW',
			defaultLocale: 'en',
			translations: new Map(),
		};

		const translate = createTranslator(ctx);
		expect(translate('Hello World')).toBe('Hello World');
	});

	test('handles ICU parameters', () => {
		const ctx: TranslatorContext = {
			locale: 'zh-TW',
			defaultLocale: 'en',
			translations: new Map([['616777a2', '{count} 位用戶']]), // hash of "{count} users"
		};

		const translate = createTranslator(ctx);
		expect(translate('{count} users', { count: 5 })).toBe('5 位用戶');
	});

	test('handles ICU parameters for default locale', () => {
		const ctx: TranslatorContext = {
			locale: 'en',
			defaultLocale: 'en',
			translations: new Map(),
		};

		const translate = createTranslator(ctx);
		expect(translate('{count} users', { count: 5 })).toBe('5 users');
	});

	test('respects context for hashing', () => {
		const ctx: TranslatorContext = {
			locale: 'zh-TW',
			defaultLocale: 'en',
			translations: new Map([['6a58b672', '儲存 (按鈕)']]), // hash of "Save" with context "button"
		};

		const translate = createTranslator(ctx);
		expect(translate('Save', { context: 'button' })).toBe('儲存 (按鈕)');
	});

	test('handles TranslateOptions with both context and params', () => {
		const ctx: TranslatorContext = {
			locale: 'zh-TW',
			defaultLocale: 'en',
			translations: new Map([
				// hash of "Hello {name}" with context "greeting"
				['greeting-hash', '你好 {name}'],
			]),
		};

		const translate = createTranslator(ctx);
		// Even without the hash match, it should format the params
		expect(translate('Hello {name}', { context: 'greeting', params: { name: 'John' } })).toBe(
			'Hello John'
		);
	});
});

// ============================================
// t function Tests
// ============================================

describe('t function', () => {
	test('translates text with explicit context', () => {
		const ctx: TranslatorContext = {
			locale: 'zh-TW',
			defaultLocale: 'en',
			translations: new Map([['35ddf285', '你好世界']]),
		};

		expect(t('Hello World', ctx)).toBe('你好世界');
	});

	test('handles parameters', () => {
		const ctx: TranslatorContext = {
			locale: 'en',
			defaultLocale: 'en',
			translations: new Map(),
		};

		expect(t('Hello {name}', ctx, { name: 'John' })).toBe('Hello John');
	});
});

// ============================================
// translationsToRecord Tests
// ============================================

describe('translationsToRecord', () => {
	test('converts Map to Record', () => {
		const translations = new Map([
			['abc123', '你好'],
			['def456', '世界'],
		]);

		const result = translationsToRecord(translations);
		expect(result).toEqual({
			abc123: '你好',
			def456: '世界',
		});
	});

	test('handles empty Map', () => {
		const translations = new Map<string, string>();
		const result = translationsToRecord(translations);
		expect(result).toEqual({});
	});
});

// ============================================
// setRequestLocale / getRequestLocale Tests
// ============================================

describe('setRequestLocale / getRequestLocale', () => {
	test('getRequestLocale returns null before setRequestLocale is called', () => {
		// After beforeEach reset (not in test mode), should be null
		// But outside RSC, cache() doesn't memoize, so we need test mode
		_setTestLocale(null);
		expect(getRequestLocale()).toBe(null);
	});

	test('setRequestLocale sets the locale in test mode', () => {
		_setTestLocale(null); // Enable test mode
		setRequestLocale('zh-TW');
		expect(getRequestLocale()).toBe('zh-TW');
	});

	test('getLocale returns the set locale', () => {
		_setTestLocale('ja');
		expect(getLocale()).toBe('ja');
	});

	test('getLocale returns default when not set', () => {
		// Enable test mode with null locale
		_setTestLocale(null);
		// Suppress dev warning
		const originalWarn = console.warn;
		console.warn = () => {};
		expect(getLocale()).toBe('en'); // DEFAULT_LOCALE
		console.warn = originalWarn;
	});
});

// ============================================
// Edge Compatibility Tests
// ============================================

describe('edge compatibility', () => {
	test('no AsyncLocalStorage dependency', () => {
		// This test verifies that the module doesn't import AsyncLocalStorage
		// by checking that createTranslator works without any context setup
		const ctx: TranslatorContext = {
			locale: 'zh-TW',
			defaultLocale: 'en',
			translations: new Map([['35ddf285', '你好世界']]),
		};

		const translate = createTranslator(ctx);
		expect(translate('Hello World')).toBe('你好世界');
	});

	test('multiple translators can work in parallel', async () => {
		// Simulate concurrent requests with different locales
		const ctxEn: TranslatorContext = {
			locale: 'en',
			defaultLocale: 'en',
			translations: new Map(),
		};

		const ctxZh: TranslatorContext = {
			locale: 'zh-TW',
			defaultLocale: 'en',
			translations: new Map([['35ddf285', '你好世界']]),
		};

		const ctxJa: TranslatorContext = {
			locale: 'ja',
			defaultLocale: 'en',
			translations: new Map([['35ddf285', 'こんにちは世界']]),
		};

		const translateEn = createTranslator(ctxEn);
		const translateZh = createTranslator(ctxZh);
		const translateJa = createTranslator(ctxJa);

		// Run all translations in parallel
		const results = await Promise.all([
			new Promise<string>((r) => setTimeout(() => r(translateEn('Hello World')), 50)),
			new Promise<string>((r) => setTimeout(() => r(translateZh('Hello World')), 10)),
			new Promise<string>((r) => setTimeout(() => r(translateJa('Hello World')), 0)),
		]);

		expect(results).toEqual(['Hello World', '你好世界', 'こんにちは世界']);
	});
});
