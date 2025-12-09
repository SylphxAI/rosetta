/**
 * DrizzleStorageAdapter Tests
 *
 * Uses Bun's native SQLite (bun:sqlite) in-memory database for fast, isolated tests.
 * Tests cover all StorageAdapter interface methods.
 */

import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { DrizzleStorageAdapter } from '../adapter';
import {
	sqliteRosettaSources,
	sqliteRosettaTranslations,
} from '../schema';

// ============================================
// Test Setup
// ============================================

function createTestDb() {
	const sqlite = new Database(':memory:');

	// Create tables matching sqliteRosettaSources and sqliteRosettaTranslations schema
	sqlite.exec(`
		CREATE TABLE rosetta_sources (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			hash TEXT NOT NULL UNIQUE,
			text TEXT NOT NULL,
			context TEXT,
			occurrences INTEGER DEFAULT 1 NOT NULL,
			first_seen_at INTEGER NOT NULL,
			last_seen_at INTEGER NOT NULL
		);

		CREATE TABLE rosetta_translations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			locale TEXT NOT NULL,
			hash TEXT NOT NULL,
			text TEXT NOT NULL,
			auto_generated INTEGER DEFAULT 0 NOT NULL,
			reviewed INTEGER DEFAULT 0 NOT NULL,
			translated_from TEXT,
			source_hash TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE(locale, hash)
		);
	`);

	const db = drizzle(sqlite);
	return { db, sqlite };
}

function createAdapter() {
	const { db, sqlite } = createTestDb();
	const adapter = new DrizzleStorageAdapter({
		db: db as any, // SQLite db type differs slightly from generic DrizzleQueryBuilder
		sources: sqliteRosettaSources,
		translations: sqliteRosettaTranslations,
	});

	// Helper to manually insert sources (since registerSources is removed)
	const insertSources = (sources: Array<{ hash: string; text: string; context?: string }>) => {
		const now = Date.now();
		for (const source of sources) {
			sqlite.exec(`
				INSERT OR IGNORE INTO rosetta_sources (hash, text, context, occurrences, first_seen_at, last_seen_at)
				VALUES ('${source.hash}', '${source.text.replace(/'/g, "''")}', ${source.context ? `'${source.context}'` : 'NULL'}, 1, ${now}, ${now})
			`);
		}
	};

	return { adapter, db, sqlite, insertSources };
}

// ============================================
// Core Methods Tests
// ============================================

describe('DrizzleStorageAdapter', () => {
	describe('getTranslations', () => {
		test('returns empty map when no translations exist', async () => {
			const { adapter } = createAdapter();
			const result = await adapter.getTranslations('zh-TW');
			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(0);
		});

		test('returns translations for specific locale', async () => {
			const { adapter } = createAdapter();

			// Add translations
			await adapter.saveTranslation('zh-TW', 'hash1', '你好');
			await adapter.saveTranslation('zh-TW', 'hash2', '世界');
			await adapter.saveTranslation('ja', 'hash1', 'こんにちは');

			const zhResult = await adapter.getTranslations('zh-TW');
			expect(zhResult.size).toBe(2);
			expect(zhResult.get('hash1')).toBe('你好');
			expect(zhResult.get('hash2')).toBe('世界');

			const jaResult = await adapter.getTranslations('ja');
			expect(jaResult.size).toBe(1);
			expect(jaResult.get('hash1')).toBe('こんにちは');
		});
	});

	describe('getTranslationsByHashes', () => {
		test('returns empty map for empty hash array', async () => {
			const { adapter } = createAdapter();
			const result = await adapter.getTranslationsByHashes('zh-TW', []);
			expect(result.size).toBe(0);
		});

		test('returns only requested hashes', async () => {
			const { adapter } = createAdapter();

			await adapter.saveTranslation('zh-TW', 'hash1', '你好');
			await adapter.saveTranslation('zh-TW', 'hash2', '世界');
			await adapter.saveTranslation('zh-TW', 'hash3', '測試');

			const result = await adapter.getTranslationsByHashes('zh-TW', ['hash1', 'hash3']);
			expect(result.size).toBe(2);
			expect(result.get('hash1')).toBe('你好');
			expect(result.get('hash3')).toBe('測試');
			expect(result.has('hash2')).toBe(false);
		});

		test('ignores non-existent hashes', async () => {
			const { adapter } = createAdapter();

			await adapter.saveTranslation('zh-TW', 'hash1', '你好');

			const result = await adapter.getTranslationsByHashes('zh-TW', [
				'hash1',
				'nonexistent',
			]);
			expect(result.size).toBe(1);
			expect(result.get('hash1')).toBe('你好');
		});
	});

	describe('saveTranslation', () => {
		test('inserts new translation', async () => {
			const { adapter } = createAdapter();

			await adapter.saveTranslation('zh-TW', 'hash1', '你好');

			const result = await adapter.getTranslations('zh-TW');
			expect(result.get('hash1')).toBe('你好');
		});

		test('updates existing translation (upsert)', async () => {
			const { adapter } = createAdapter();

			await adapter.saveTranslation('zh-TW', 'hash1', '你好');
			await adapter.saveTranslation('zh-TW', 'hash1', '您好');

			const result = await adapter.getTranslations('zh-TW');
			expect(result.get('hash1')).toBe('您好');
		});

		test('sets autoGenerated flag', async () => {
			const { adapter, insertSources } = createAdapter();

			await adapter.saveTranslation('zh-TW', 'hash1', '你好', {
				autoGenerated: true,
			});

			// Manually insert source for testing
			insertSources([{ hash: 'hash1', text: 'Hello' }]);

			const result = await adapter.getSourcesWithTranslations(['zh-TW']);
			expect(result[0]!.translations['zh-TW']?.autoGenerated).toBe(true);
		});
	});

	describe('getSources', () => {
		test('returns all sources', async () => {
			const { adapter, insertSources } = createAdapter();

			insertSources([
				{ hash: 'hash1', text: 'Hello' },
				{ hash: 'hash2', text: 'World' },
			]);

			const sources = await adapter.getSources();
			expect(sources.length).toBe(2);
			expect(sources.every((s) => s.id !== undefined)).toBe(true);
			expect(sources.every((s) => s.lastSeenAt instanceof Date)).toBe(true);
		});
	});

	describe('getUntranslated', () => {
		test('returns all sources when no translations exist', async () => {
			const { adapter, insertSources } = createAdapter();

			insertSources([
				{ hash: 'hash1', text: 'Hello' },
				{ hash: 'hash2', text: 'World' },
			]);

			const untranslated = await adapter.getUntranslated('zh-TW');
			expect(untranslated.length).toBe(2);
		});

		test('excludes translated sources', async () => {
			const { adapter, insertSources } = createAdapter();

			insertSources([
				{ hash: 'hash1', text: 'Hello' },
				{ hash: 'hash2', text: 'World' },
			]);
			await adapter.saveTranslation('zh-TW', 'hash1', '你好');

			const untranslated = await adapter.getUntranslated('zh-TW');
			expect(untranslated.length).toBe(1);
			expect(untranslated[0]!.hash).toBe('hash2');
		});

		test('different locales are independent', async () => {
			const { adapter, insertSources } = createAdapter();

			insertSources([{ hash: 'hash1', text: 'Hello' }]);
			await adapter.saveTranslation('zh-TW', 'hash1', '你好');

			const zhUntranslated = await adapter.getUntranslated('zh-TW');
			const jaUntranslated = await adapter.getUntranslated('ja');

			expect(zhUntranslated.length).toBe(0);
			expect(jaUntranslated.length).toBe(1);
		});
	});

	describe('getAvailableLocales', () => {
		test('returns empty array when no translations', async () => {
			const { adapter } = createAdapter();
			const locales = await adapter.getAvailableLocales();
			expect(locales).toEqual([]);
		});

		test('returns unique locales', async () => {
			const { adapter } = createAdapter();

			await adapter.saveTranslation('zh-TW', 'hash1', '你好');
			await adapter.saveTranslation('zh-TW', 'hash2', '世界');
			await adapter.saveTranslation('ja', 'hash1', 'こんにちは');

			const locales = await adapter.getAvailableLocales();
			expect(locales.sort()).toEqual(['ja', 'zh-TW'].sort());
		});
	});
});

// ============================================
// Admin Methods Tests
// ============================================

describe('DrizzleStorageAdapter Admin Methods', () => {
	describe('getSourcesWithTranslations', () => {
		test('returns sources with translation status', async () => {
			const { adapter, insertSources } = createAdapter();

			insertSources([
				{ hash: 'hash1', text: 'Hello' },
				{ hash: 'hash2', text: 'World' },
			]);
			await adapter.saveTranslation('zh-TW', 'hash1', '你好', {
				autoGenerated: true,
			});

			const result = await adapter.getSourcesWithTranslations(['zh-TW', 'ja']);

			expect(result.length).toBe(2);

			const source1 = result.find((s) => s.hash === 'hash1');
			expect(source1!.translations['zh-TW']).toMatchObject({
				text: '你好',
				autoGenerated: true,
				reviewed: false,
			});
			expect(source1!.translations['ja']).toBeNull();

			const source2 = result.find((s) => s.hash === 'hash2');
			expect(source2!.translations['zh-TW']).toBeNull();
		});
	});

	describe('markAsReviewed', () => {
		test('marks translation as reviewed', async () => {
			const { adapter, insertSources } = createAdapter();

			insertSources([{ hash: 'hash1', text: 'Hello' }]);
			await adapter.saveTranslation('zh-TW', 'hash1', '你好', {
				autoGenerated: true,
			});

			await adapter.markAsReviewed('zh-TW', 'hash1');

			const result = await adapter.getSourcesWithTranslations(['zh-TW']);
			expect(result[0]!.translations['zh-TW']?.reviewed).toBe(true);
		});
	});

	describe('saveTranslations (batch)', () => {
		test('saves multiple translations at once', async () => {
			const { adapter } = createAdapter();

			await adapter.saveTranslations('zh-TW', [
				{ hash: 'hash1', text: '你好' },
				{ hash: 'hash2', text: '世界' },
				{ hash: 'hash3', text: '測試' },
			]);

			const result = await adapter.getTranslations('zh-TW');
			expect(result.size).toBe(3);
			expect(result.get('hash1')).toBe('你好');
			expect(result.get('hash2')).toBe('世界');
			expect(result.get('hash3')).toBe('測試');
		});

		test('handles empty array', async () => {
			const { adapter } = createAdapter();
			await adapter.saveTranslations('zh-TW', []);
			const result = await adapter.getTranslations('zh-TW');
			expect(result.size).toBe(0);
		});

		test('upserts existing translations', async () => {
			const { adapter } = createAdapter();

			await adapter.saveTranslation('zh-TW', 'hash1', '你好');
			await adapter.saveTranslations('zh-TW', [
				{ hash: 'hash1', text: '您好' },
				{ hash: 'hash2', text: '世界' },
			]);

			const result = await adapter.getTranslations('zh-TW');
			expect(result.get('hash1')).toBe('您好');
		});
	});

	describe('deleteTranslation', () => {
		test('deletes specific translation', async () => {
			const { adapter } = createAdapter();

			await adapter.saveTranslation('zh-TW', 'hash1', '你好');
			await adapter.saveTranslation('ja', 'hash1', 'こんにちは');

			await adapter.deleteTranslation('zh-TW', 'hash1');

			const zhResult = await adapter.getTranslations('zh-TW');
			const jaResult = await adapter.getTranslations('ja');

			expect(zhResult.size).toBe(0);
			expect(jaResult.size).toBe(1);
		});
	});

	describe('deleteSource', () => {
		test('deletes source and all its translations', async () => {
			const { adapter, insertSources } = createAdapter();

			insertSources([{ hash: 'hash1', text: 'Hello' }]);
			await adapter.saveTranslation('zh-TW', 'hash1', '你好');
			await adapter.saveTranslation('ja', 'hash1', 'こんにちは');

			await adapter.deleteSource('hash1');

			const sources = await adapter.getSources();
			const zhResult = await adapter.getTranslations('zh-TW');
			const jaResult = await adapter.getTranslations('ja');

			expect(sources.length).toBe(0);
			expect(zhResult.size).toBe(0);
			expect(jaResult.size).toBe(0);
		});
	});
});

// ============================================
// Validation Tests
// ============================================

describe('DrizzleStorageAdapter Validation', () => {
	test('throws error for missing required columns in sources table', () => {
		const { db } = createTestDb();

		// Create table missing 'occurrences' column
		const invalidTable = {
			id: {},
			hash: {},
			text: {},
			context: {},
			// missing: occurrences, firstSeenAt, lastSeenAt
		};

		expect(() => {
			new DrizzleStorageAdapter({
				db: db as any,
				sources: invalidTable as any,
				translations: sqliteRosettaTranslations,
			});
		}).toThrow(/missing required column/);
	});

	test('throws error for missing required columns in translations table', () => {
		const { db } = createTestDb();

		// Create table missing 'reviewed' column
		const invalidTable = {
			id: {},
			locale: {},
			hash: {},
			text: {},
			autoGenerated: {},
			// missing: reviewed, createdAt, updatedAt
		};

		expect(() => {
			new DrizzleStorageAdapter({
				db: db as any,
				sources: sqliteRosettaSources,
				translations: invalidTable as any,
			});
		}).toThrow(/missing required column/);
	});
});

// ============================================
// Edge Cases
// ============================================

describe('DrizzleStorageAdapter Edge Cases', () => {
	test('handles unicode text correctly', async () => {
		const { adapter, insertSources } = createAdapter();

		insertSources([
			{ hash: 'emoji', text: 'Hello 👋 World 🌍' },
			{ hash: 'chinese', text: '繁體中文測試' },
			{ hash: 'japanese', text: '日本語テスト' },
			{ hash: 'arabic', text: 'مرحبا بالعالم' },
		]);

		await adapter.saveTranslation('zh-TW', 'emoji', '你好 👋 世界 🌍');

		const sources = await adapter.getSources();
		const translations = await adapter.getTranslations('zh-TW');

		expect(sources.find((s) => s.hash === 'emoji')!.text).toBe('Hello 👋 World 🌍');
		expect(translations.get('emoji')).toBe('你好 👋 世界 🌍');
	});

	test('handles very long text', async () => {
		const { adapter, insertSources } = createAdapter();
		const longText = 'A'.repeat(10000);

		insertSources([{ hash: 'long', text: longText }]);
		await adapter.saveTranslation('zh-TW', 'long', 'B'.repeat(10000));

		const sources = await adapter.getSources();
		const translations = await adapter.getTranslations('zh-TW');

		expect(sources[0]!.text.length).toBe(10000);
		expect(translations.get('long')!.length).toBe(10000);
	});

	test('handles special characters in hash', async () => {
		const { adapter, insertSources } = createAdapter();

		insertSources([
			{ hash: 'a1b2c3d4', text: 'Normal hash' },
			{ hash: '00000000', text: 'Zero hash' },
			{ hash: 'ffffffff', text: 'Max hash' },
		]);

		const sources = await adapter.getSources();
		expect(sources.length).toBe(3);
	});

	test('concurrent translations do not corrupt data', async () => {
		const { adapter } = createAdapter();

		// Simulate concurrent translations
		const promises = Array.from({ length: 100 }, (_, i) =>
			adapter.saveTranslation('zh-TW', `hash${i}`, `Text ${i}`)
		);

		await Promise.all(promises);

		const translations = await adapter.getTranslations('zh-TW');
		expect(translations.size).toBe(100);
	});
});
