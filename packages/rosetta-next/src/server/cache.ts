/**
 * Rosetta Caching Layer
 *
 * Provides caching strategies for different deployment environments:
 * - In-memory: For traditional servers (long-running Node.js)
 * - External: For serverless (Redis, Upstash, Vercel KV)
 * - None: For edge/workers with no cache needs
 *
 * @example In-memory cache (traditional server)
 * ```ts
 * const cache = new InMemoryCache({ ttlMs: 60000 });
 * const rosetta = createRosetta({ storage, cache });
 * ```
 *
 * @example Redis cache (serverless)
 * ```ts
 * import { Redis } from '@upstash/redis';
 * const redis = new Redis({ url, token });
 * const cache = new ExternalCache(redis, { ttlSeconds: 60 });
 * const rosetta = createRosetta({ storage, cache });
 * ```
 */

import type { CacheAdapter } from '@sylphx/rosetta';

// ============================================
// In-Memory Cache (Traditional Server)
// ============================================

export interface InMemoryCacheOptions {
	/** Time-to-live in milliseconds (default: 5 minutes) */
	ttlMs?: number;
	/** Maximum entries (default: 100) */
	maxEntries?: number;
}

interface CacheEntry {
	translations: Map<string, string>;
	expiresAt: number;
}

/**
 * In-memory LRU cache with TTL
 *
 * Best for: Traditional Node.js servers, development
 * Not for: Serverless (cache lost on cold start)
 */
export class InMemoryCache implements CacheAdapter {
	private cache = new Map<string, CacheEntry>();
	private ttlMs: number;
	private maxEntries: number;

	constructor(options: InMemoryCacheOptions = {}) {
		this.ttlMs = options.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
		this.maxEntries = options.maxEntries ?? 100;
	}

	async get(locale: string): Promise<Map<string, string> | null> {
		const entry = this.cache.get(locale);

		if (!entry) return null;

		// Check TTL
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(locale);
			return null;
		}

		// Move to end (LRU)
		this.cache.delete(locale);
		this.cache.set(locale, entry);

		return entry.translations;
	}

	async set(locale: string, translations: Map<string, string>): Promise<void> {
		// Evict oldest if at capacity
		if (this.cache.size >= this.maxEntries && !this.cache.has(locale)) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey) this.cache.delete(firstKey);
		}

		this.cache.set(locale, {
			translations,
			expiresAt: Date.now() + this.ttlMs,
		});
	}

	async invalidate(locale?: string): Promise<void> {
		if (locale) {
			this.cache.delete(locale);
		} else {
			this.cache.clear();
		}
	}

	async has(locale: string): Promise<boolean> {
		const entry = this.cache.get(locale);
		if (!entry) return false;
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(locale);
			return false;
		}
		return true;
	}
}

// ============================================
// External Cache Interface (Redis, Upstash, etc.)
// ============================================

/**
 * Generic Redis-like client interface
 * Compatible with: ioredis, @upstash/redis, node-redis
 */
export interface RedisLikeClient {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, options?: { ex?: number }): Promise<unknown>;
	del(key: string | string[]): Promise<unknown>;
	keys?(pattern: string): Promise<string[]>;
}

export interface ExternalCacheOptions {
	/** Key prefix (default: 'rosetta:') */
	prefix?: string;
	/** TTL in seconds (default: 300 = 5 minutes) */
	ttlSeconds?: number;
}

/**
 * External cache adapter (Redis, Upstash, Vercel KV)
 *
 * Best for: Serverless, multi-pod deployments
 *
 * @example Upstash Redis
 * ```ts
 * import { Redis } from '@upstash/redis';
 * const redis = new Redis({ url: process.env.UPSTASH_URL, token: process.env.UPSTASH_TOKEN });
 * const cache = new ExternalCache(redis);
 * ```
 *
 * @example Vercel KV
 * ```ts
 * import { kv } from '@vercel/kv';
 * const cache = new ExternalCache(kv);
 * ```
 */
export class ExternalCache implements CacheAdapter {
	private client: RedisLikeClient;
	private prefix: string;
	private ttlSeconds: number;

	constructor(client: RedisLikeClient, options: ExternalCacheOptions = {}) {
		this.client = client;
		this.prefix = options.prefix ?? 'rosetta:translations:';
		this.ttlSeconds = options.ttlSeconds ?? 300; // 5 minutes
	}

	private key(locale: string): string {
		return `${this.prefix}${locale}`;
	}

	async get(locale: string): Promise<Map<string, string> | null> {
		try {
			const data = await this.client.get(this.key(locale));
			if (!data) return null;

			const parsed = JSON.parse(data) as [string, string][];
			return new Map(parsed);
		} catch {
			// Cache miss or parse error
			return null;
		}
	}

	async set(locale: string, translations: Map<string, string>): Promise<void> {
		try {
			const data = JSON.stringify(Array.from(translations.entries()));
			await this.client.set(this.key(locale), data, { ex: this.ttlSeconds });
		} catch (error) {
			// Log but don't throw - cache failure shouldn't break the app
			console.warn('[rosetta] Cache set failed:', error);
		}
	}

	async invalidate(locale?: string): Promise<void> {
		try {
			if (locale) {
				await this.client.del(this.key(locale));
			} else if (this.client.keys) {
				// Delete all rosetta keys
				const keys = await this.client.keys(`${this.prefix}*`);
				if (keys.length > 0) {
					await this.client.del(keys);
				}
			}
		} catch (error) {
			console.warn('[rosetta] Cache invalidate failed:', error);
		}
	}

	async has(locale: string): Promise<boolean> {
		try {
			const data = await this.client.get(this.key(locale));
			return data !== null;
		} catch {
			return false;
		}
	}
}

// ============================================
// Request-Scoped Deduplication
// ============================================

/**
 * Request-scoped cache for deduplicating translation loads within a single request
 *
 * Prevents multiple components from triggering duplicate DB queries.
 * Automatically cleared after request completes.
 *
 * @example
 * ```ts
 * const requestCache = new RequestScopedCache();
 *
 * // First call - hits DB
 * const t1 = await requestCache.getOrLoad('en', () => storage.getTranslations('en'));
 *
 * // Second call - returns cached (same request)
 * const t2 = await requestCache.getOrLoad('en', () => storage.getTranslations('en'));
 *
 * t1 === t2; // true, same Map instance
 * ```
 */
export class RequestScopedCache {
	private pending = new Map<string, Promise<Map<string, string>>>();
	private resolved = new Map<string, Map<string, string>>();

	async getOrLoad(
		locale: string,
		loader: () => Promise<Map<string, string>>
	): Promise<Map<string, string>> {
		// Already resolved
		const cached = this.resolved.get(locale);
		if (cached) return cached;

		// Already loading (deduplicate)
		const pending = this.pending.get(locale);
		if (pending) return pending;

		// Start loading
		const promise = loader().then((result) => {
			this.resolved.set(locale, result);
			this.pending.delete(locale);
			return result;
		});

		this.pending.set(locale, promise);
		return promise;
	}

	clear(): void {
		this.pending.clear();
		this.resolved.clear();
	}
}
