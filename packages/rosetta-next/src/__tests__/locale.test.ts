/**
 * Locale Utilities Tests
 *
 * Tests for server-side locale utilities (getReadyLocales, cookie helpers).
 */

import { describe, expect, test } from 'bun:test';
import {
	type LocaleConfig,
	buildLocaleCookie,
	getReadyLocales,
	parseLocaleCookie,
} from '../locale';
import type { Rosetta } from '../server/rosetta';

// ============================================
// Mock Rosetta
// ============================================

function createMockRosetta(config: {
	defaultLocale?: string;
	stats?: {
		totalStrings: number;
		locales: Record<string, { translated: number; reviewed: number }>;
	};
}): Rosetta {
	const { defaultLocale = 'en', stats } = config;

	return {
		getDefaultLocale: () => defaultLocale,
		getTranslationStats: async () =>
			stats ?? {
				totalStrings: 100,
				locales: {
					en: { translated: 100, reviewed: 100 },
					'zh-TW': { translated: 95, reviewed: 80 },
					'zh-CN': { translated: 60, reviewed: 30 },
					ja: { translated: 20, reviewed: 10 },
				},
			},
	} as unknown as Rosetta;
}

// ============================================
// getReadyLocales Tests
// ============================================

describe('getReadyLocales', () => {
	const testConfig: LocaleConfig = {
		en: { name: 'English', nativeName: 'English' },
		'zh-TW': { name: 'Traditional Chinese', nativeName: '繁體中文', minCoverage: 80 },
		'zh-CN': { name: 'Simplified Chinese', nativeName: '简体中文', minCoverage: 80 },
		ja: { name: 'Japanese', nativeName: '日本語', minCoverage: 80 },
	};

	test('returns only ready locales by default', async () => {
		const rosetta = createMockRosetta({});
		const result = await getReadyLocales(rosetta, testConfig);

		// en (100%), zh-TW (95%) should be ready
		// zh-CN (60%), ja (20%) should NOT be ready (below 80%)
		expect(result.length).toBe(2);
		expect(result.map((l) => l.code)).toEqual(['en', 'zh-TW']);
	});

	test('returns all locales when onlyReady is false', async () => {
		const rosetta = createMockRosetta({});
		const result = await getReadyLocales(rosetta, testConfig, { onlyReady: false });

		expect(result.length).toBe(4);
		expect(result.map((l) => l.code)).toEqual(['en', 'ja', 'zh-CN', 'zh-TW']);
	});

	test('marks default locale as 100% coverage', async () => {
		const rosetta = createMockRosetta({});
		const result = await getReadyLocales(rosetta, testConfig, { onlyReady: false });

		const enLocale = result.find((l) => l.code === 'en');
		expect(enLocale?.coverage).toBe(100);
		expect(enLocale?.ready).toBe(true);
	});

	test('calculates coverage correctly', async () => {
		const rosetta = createMockRosetta({});
		const result = await getReadyLocales(rosetta, testConfig, { onlyReady: false });

		const zhTW = result.find((l) => l.code === 'zh-TW');
		expect(zhTW?.coverage).toBe(95);
		expect(zhTW?.translated).toBe(95);
		expect(zhTW?.total).toBe(100);
		expect(zhTW?.ready).toBe(true);

		const zhCN = result.find((l) => l.code === 'zh-CN');
		expect(zhCN?.coverage).toBe(60);
		expect(zhCN?.ready).toBe(false);
	});

	test('excludes default locale when includeDefault is false', async () => {
		const rosetta = createMockRosetta({});
		const result = await getReadyLocales(rosetta, testConfig, { includeDefault: false });

		expect(result.find((l) => l.code === 'en')).toBeUndefined();
	});

	test('excludes disabled locales', async () => {
		const configWithDisabled: LocaleConfig = {
			...testConfig,
			ja: { ...testConfig.ja, enabled: false },
		};

		const rosetta = createMockRosetta({});
		const result = await getReadyLocales(rosetta, configWithDisabled, { onlyReady: false });

		expect(result.find((l) => l.code === 'ja')).toBeUndefined();
	});

	test('returns locale metadata correctly', async () => {
		const rosetta = createMockRosetta({});
		const result = await getReadyLocales(rosetta, testConfig, { onlyReady: false });

		const zhTW = result.find((l) => l.code === 'zh-TW');
		expect(zhTW?.name).toBe('Traditional Chinese');
		expect(zhTW?.nativeName).toBe('繁體中文');
	});

	test('handles empty config', async () => {
		const rosetta = createMockRosetta({});
		const result = await getReadyLocales(rosetta, {});

		expect(result).toEqual([]);
	});

	test('handles locales with minCoverage 0 (always ready)', async () => {
		const configNoThreshold: LocaleConfig = {
			en: { name: 'English', nativeName: 'English' },
			ja: { name: 'Japanese', nativeName: '日本語', minCoverage: 0 },
		};

		const rosetta = createMockRosetta({});
		const result = await getReadyLocales(rosetta, configNoThreshold);

		// ja should be ready even with 20% because minCoverage is 0
		expect(result.find((l) => l.code === 'ja')?.ready).toBe(true);
	});

	test('sorts results by code', async () => {
		const rosetta = createMockRosetta({});
		const result = await getReadyLocales(rosetta, testConfig, { onlyReady: false });

		const codes = result.map((l) => l.code);
		expect(codes).toEqual([...codes].sort());
	});
});

// ============================================
// Cookie Utilities Tests
// ============================================

describe('buildLocaleCookie', () => {
	test('builds basic cookie string', () => {
		const cookie = buildLocaleCookie('zh-TW');

		expect(cookie).toContain('NEXT_LOCALE=zh-TW');
		expect(cookie).toContain('Path=/');
		expect(cookie).toContain('Max-Age=');
		expect(cookie).toContain('SameSite=lax');
	});

	test('uses custom cookie name', () => {
		const cookie = buildLocaleCookie('zh-TW', { name: 'MY_LOCALE' });

		expect(cookie).toContain('MY_LOCALE=zh-TW');
	});

	test('uses custom max age', () => {
		const cookie = buildLocaleCookie('zh-TW', { maxAge: 3600 });

		expect(cookie).toContain('Max-Age=3600');
	});

	test('uses custom path', () => {
		const cookie = buildLocaleCookie('zh-TW', { path: '/app' });

		expect(cookie).toContain('Path=/app');
	});

	test('uses custom sameSite', () => {
		const cookie = buildLocaleCookie('zh-TW', { sameSite: 'strict' });

		expect(cookie).toContain('SameSite=strict');
	});

	test('adds Secure flag in production', () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';

		const cookie = buildLocaleCookie('zh-TW');

		expect(cookie).toContain('Secure');

		process.env.NODE_ENV = originalEnv;
	});

	test('respects explicit secure option', () => {
		const cookie = buildLocaleCookie('zh-TW', { secure: true });

		expect(cookie).toContain('Secure');
	});

	test('encodes special characters in locale', () => {
		const cookie = buildLocaleCookie('zh-TW/test');

		expect(cookie).toContain('NEXT_LOCALE=zh-TW%2Ftest');
	});
});

describe('parseLocaleCookie', () => {
	test('parses locale from cookie header', () => {
		const locale = parseLocaleCookie('NEXT_LOCALE=zh-TW; other=value');

		expect(locale).toBe('zh-TW');
	});

	test('returns undefined for missing cookie', () => {
		const locale = parseLocaleCookie('other=value; another=test');

		expect(locale).toBeUndefined();
	});

	test('returns undefined for null header', () => {
		const locale = parseLocaleCookie(null);

		expect(locale).toBeUndefined();
	});

	test('uses custom cookie name', () => {
		const locale = parseLocaleCookie('MY_LOCALE=ja; NEXT_LOCALE=en', 'MY_LOCALE');

		expect(locale).toBe('ja');
	});

	test('decodes URL-encoded values', () => {
		const locale = parseLocaleCookie('NEXT_LOCALE=zh-TW%2Ftest');

		expect(locale).toBe('zh-TW/test');
	});

	test('handles empty cookie value', () => {
		const locale = parseLocaleCookie('NEXT_LOCALE=');

		// Empty value is treated as undefined (no valid locale)
		expect(locale).toBeUndefined();
	});

	test('handles whitespace in cookie header', () => {
		const locale = parseLocaleCookie('  NEXT_LOCALE=zh-TW  ;  other=value  ');

		expect(locale).toBe('zh-TW');
	});
});
