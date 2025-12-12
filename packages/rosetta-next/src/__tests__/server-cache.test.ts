/**
 * Cache Adapter Tests
 *
 * Tests for InMemoryCache, ExternalCache, and RequestScopedCache.
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
	ExternalCache,
	InMemoryCache,
	type RedisLikeClient,
	RequestScopedCache,
} from '../server/cache';

// ============================================
// InMemoryCache Tests
// ============================================

describe('InMemoryCache', () => {
	test('stores and retrieves translations', async () => {
		const cache = new InMemoryCache();
		const translations = new Map([
			['abc', 'Hello'],
			['def', 'World'],
		]);

		await cache.set('en', translations);
		const result = await cache.get('en');

		expect(result).not.toBeNull();
		expect(result?.get('abc')).toBe('Hello');
		expect(result?.get('def')).toBe('World');
	});

	test('returns null for missing locale', async () => {
		const cache = new InMemoryCache();

		const result = await cache.get('missing');
		expect(result).toBeNull();
	});

	test('invalidates specific locale', async () => {
		const cache = new InMemoryCache();

		await cache.set('en', new Map([['a', 'b']]));
		await cache.set('ja', new Map([['c', 'd']]));

		await cache.invalidate('en');

		expect(await cache.get('en')).toBeNull();
		expect(await cache.get('ja')).not.toBeNull();
	});

	test('invalidates all locales', async () => {
		const cache = new InMemoryCache();

		await cache.set('en', new Map([['a', 'b']]));
		await cache.set('ja', new Map([['c', 'd']]));

		await cache.invalidate();

		expect(await cache.get('en')).toBeNull();
		expect(await cache.get('ja')).toBeNull();
	});

	test('respects TTL', async () => {
		const cache = new InMemoryCache({ ttlMs: 50 });

		await cache.set('en', new Map([['a', 'b']]));
		expect(await cache.get('en')).not.toBeNull();

		await new Promise((r) => setTimeout(r, 100));
		expect(await cache.get('en')).toBeNull();
	});

	test('respects max entries', async () => {
		const cache = new InMemoryCache({ maxEntries: 2 });

		await cache.set('en', new Map([['a', 'b']]));
		await cache.set('ja', new Map([['c', 'd']]));
		await cache.set('ko', new Map([['e', 'f']]));

		// en should be evicted (oldest)
		expect(await cache.get('en')).toBeNull();
		expect(await cache.get('ja')).not.toBeNull();
		expect(await cache.get('ko')).not.toBeNull();
	});

	test('has() returns correct value', async () => {
		const cache = new InMemoryCache();

		expect(await cache.has('en')).toBe(false);

		await cache.set('en', new Map([['a', 'b']]));
		expect(await cache.has('en')).toBe(true);

		await cache.invalidate('en');
		expect(await cache.has('en')).toBe(false);
	});

	test('LRU behavior refreshes order on access', async () => {
		const cache = new InMemoryCache({ ttlMs: 10000, maxEntries: 2 });

		await cache.set('en', new Map([['a', 'en']]));
		await cache.set('ja', new Map([['a', 'ja']]));

		// Access 'en' to make it more recently used
		await cache.get('en');

		// Add 'ko' - should evict 'ja' (oldest), not 'en'
		await cache.set('ko', new Map([['a', 'ko']]));

		expect(await cache.get('en')).not.toBeNull(); // en should still be there
		expect(await cache.get('ja')).toBeNull(); // ja should be evicted
		expect(await cache.get('ko')).not.toBeNull();
	});
});

// ============================================
// ExternalCache Tests
// ============================================

describe('ExternalCache', () => {
	function createMockRedis(): RedisLikeClient & { data: Map<string, string> } {
		const data = new Map<string, string>();
		return {
			data,
			get: async (key: string) => data.get(key) ?? null,
			set: async (key: string, value: string) => {
				data.set(key, value);
			},
			// del can receive either a single key or array of keys
			del: async (keysOrKey: string | string[]) => {
				const keys = Array.isArray(keysOrKey) ? keysOrKey : [keysOrKey];
				for (const key of keys) {
					data.delete(key);
				}
			},
			keys: async (pattern: string) => {
				const prefix = pattern.replace('*', '');
				return Array.from(data.keys()).filter((k) => k.startsWith(prefix));
			},
		};
	}

	test('stores and retrieves translations', async () => {
		const redis = createMockRedis();
		const cache = new ExternalCache(redis);

		const translations = new Map([
			['abc', 'Hello'],
			['def', 'World'],
		]);
		await cache.set('en', translations);

		const result = await cache.get('en');
		expect(result).not.toBeNull();
		expect(result?.get('abc')).toBe('Hello');
	});

	test('returns null for missing locale', async () => {
		const redis = createMockRedis();
		const cache = new ExternalCache(redis);

		const result = await cache.get('missing');
		expect(result).toBeNull();
	});

	test('uses custom prefix', async () => {
		const redis = createMockRedis();
		const cache = new ExternalCache(redis, { prefix: 'custom:' });

		await cache.set('en', new Map([['a', 'b']]));

		expect(redis.data.has('custom:en')).toBe(true);
		expect(redis.data.has('rosetta:translations:en')).toBe(false);
	});

	test('invalidates specific locale', async () => {
		const redis = createMockRedis();
		const cache = new ExternalCache(redis);

		await cache.set('en', new Map([['a', 'b']]));
		await cache.set('ja', new Map([['c', 'd']]));

		await cache.invalidate('en');

		expect(await cache.get('en')).toBeNull();
		expect(await cache.get('ja')).not.toBeNull();
	});

	test('invalidates all locales', async () => {
		const redis = createMockRedis();
		const cache = new ExternalCache(redis);

		await cache.set('en', new Map([['a', 'b']]));
		await cache.set('ja', new Map([['c', 'd']]));

		await cache.invalidate();

		expect(await cache.get('en')).toBeNull();
		expect(await cache.get('ja')).toBeNull();
	});

	test('handles client errors gracefully for get', async () => {
		const redis = {
			get: async () => {
				throw new Error('Redis error');
			},
			set: async () => {},
			del: async () => {},
			keys: async () => [],
		};

		const cache = new ExternalCache(redis);
		const result = await cache.get('en');

		expect(result).toBeNull();
	});

	test('handles client errors gracefully for set', async () => {
		const redis = {
			get: async () => null,
			set: async () => {
				throw new Error('Redis error');
			},
			del: async () => {},
			keys: async () => [],
		};

		const cache = new ExternalCache(redis);

		// Should not throw
		await cache.set('en', new Map([['a', 'b']]));
	});

	test('has() returns correct value', async () => {
		const redis = createMockRedis();
		const cache = new ExternalCache(redis);

		expect(await cache.has('en')).toBe(false);

		await cache.set('en', new Map([['a', 'b']]));
		expect(await cache.has('en')).toBe(true);
	});
});

// ============================================
// RequestScopedCache Tests
// ============================================

describe('RequestScopedCache', () => {
	test('loads and caches within same request', async () => {
		const cache = new RequestScopedCache();
		let loadCount = 0;

		const loader = async () => {
			loadCount++;
			return new Map([['a', 'b']]);
		};

		const result1 = await cache.getOrLoad('en', loader);
		const result2 = await cache.getOrLoad('en', loader);

		expect(result1.get('a')).toBe('b');
		expect(result2.get('a')).toBe('b');
		expect(loadCount).toBe(1); // Only loaded once
	});

	test('loads different locales independently', async () => {
		const cache = new RequestScopedCache();

		const enResult = await cache.getOrLoad('en', async () => new Map([['a', 'en']]));
		const jaResult = await cache.getOrLoad('ja', async () => new Map([['a', 'ja']]));

		expect(enResult.get('a')).toBe('en');
		expect(jaResult.get('a')).toBe('ja');
	});

	test('deduplicates concurrent requests', async () => {
		const cache = new RequestScopedCache();
		let loadCount = 0;

		const loader = async () => {
			loadCount++;
			await new Promise((r) => setTimeout(r, 50));
			return new Map([['a', 'b']]);
		};

		// Start both requests simultaneously
		const [result1, result2] = await Promise.all([
			cache.getOrLoad('en', loader),
			cache.getOrLoad('en', loader),
		]);

		expect(result1).toBe(result2); // Same instance
		expect(loadCount).toBe(1); // Only loaded once
	});

	test('clear removes all cached data', async () => {
		const cache = new RequestScopedCache();
		let loadCount = 0;

		const loader = async () => {
			loadCount++;
			return new Map([['a', 'b']]);
		};

		await cache.getOrLoad('en', loader);
		cache.clear();
		await cache.getOrLoad('en', loader);

		expect(loadCount).toBe(2); // Loaded twice after clear
	});

	test('different instances are independent', async () => {
		const cache1 = new RequestScopedCache();
		const cache2 = new RequestScopedCache();

		let load1Count = 0;
		let load2Count = 0;

		await cache1.getOrLoad('en', async () => {
			load1Count++;
			return new Map([['a', '1']]);
		});

		await cache2.getOrLoad('en', async () => {
			load2Count++;
			return new Map([['a', '2']]);
		});

		expect(load1Count).toBe(1);
		expect(load2Count).toBe(1); // cache2 doesn't share with cache1
	});
});
