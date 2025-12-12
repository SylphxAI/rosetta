# Caching

Optimize translation loading with appropriate caching strategies.

## Cache Adapter Interface

```ts
interface CacheAdapter {
  get(locale: string): Promise<Map<string, string> | null>;
  set(locale: string, translations: Map<string, string>): Promise<void>;
  invalidate(locale?: string): Promise<void>;
  has(locale: string): Promise<boolean>;
}
```

## Built-in Adapters

### InMemoryCache

Best for traditional Node.js servers:

```ts
import { InMemoryCache } from '@sylphx/rosetta-next/server';

const cache = new InMemoryCache({
  ttlMs: 5 * 60 * 1000,  // 5 minutes (default)
  maxEntries: 100,        // LRU eviction (default)
});

const rosetta = new Rosetta({
  storage,
  cache,
});
```

**How it works:**
- LRU (Least Recently Used) eviction
- TTL-based expiration
- In-process memory

**Pros:**
- Zero latency
- No external dependencies
- Simple setup

**Cons:**
- Lost on process restart
- Not shared between instances
- Memory consumption

### ExternalCache

Best for serverless and multi-instance deployments:

```ts
import { ExternalCache } from '@sylphx/rosetta-next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const cache = new ExternalCache(redis, {
  prefix: 'rosetta:translations:',  // Key prefix
  ttlSeconds: 300,                   // 5 minutes
});

const rosetta = new Rosetta({
  storage,
  cache,
});
```

**Supported clients:**
- `@upstash/redis`
- `ioredis`
- `@vercel/kv`
- Any Redis-compatible client

**Pros:**
- Shared across instances
- Survives restarts
- Works with serverless

**Cons:**
- Network latency (10-50ms)
- External dependency
- Additional cost

### RequestScopedCache

For request-level deduplication:

```ts
import { RequestScopedCache } from '@sylphx/rosetta-next/server';

const requestCache = new RequestScopedCache();

// Within a single request:
const t1 = await requestCache.getOrLoad('en', () => storage.getTranslations('en'));
const t2 = await requestCache.getOrLoad('en', () => storage.getTranslations('en'));
// t1 === t2 (same instance, no duplicate DB query)
```

**Use case:** Prevent multiple components from triggering duplicate DB queries within the same request.

## Environment Recommendations

| Environment | Recommended Cache | TTL |
|-------------|-------------------|-----|
| Development | InMemoryCache | 10s |
| Traditional server | InMemoryCache | 5min |
| Serverless (Vercel) | ExternalCache (Upstash) | 5min |
| Edge Runtime | None or ExternalCache | 1min |
| High-traffic | ExternalCache + InMemory | 5min |

## Two-Tier Caching

Combine local and external caching:

```ts
class TwoTierCache implements CacheAdapter {
  constructor(
    private local: InMemoryCache,
    private external: ExternalCache
  ) {}

  async get(locale: string): Promise<Map<string, string> | null> {
    // Try local first
    const localResult = await this.local.get(locale);
    if (localResult) return localResult;

    // Try external
    const externalResult = await this.external.get(locale);
    if (externalResult) {
      // Populate local cache
      await this.local.set(locale, externalResult);
      return externalResult;
    }

    return null;
  }

  async set(locale: string, translations: Map<string, string>): Promise<void> {
    await Promise.all([
      this.local.set(locale, translations),
      this.external.set(locale, translations),
    ]);
  }

  async invalidate(locale?: string): Promise<void> {
    await Promise.all([
      this.local.invalidate(locale),
      this.external.invalidate(locale),
    ]);
  }

  async has(locale: string): Promise<boolean> {
    return await this.local.has(locale) || await this.external.has(locale);
  }
}

// Usage
const cache = new TwoTierCache(
  new InMemoryCache({ ttlMs: 60000 }),       // 1 minute local
  new ExternalCache(redis, { ttlSeconds: 300 }) // 5 minutes external
);
```

## Cache Invalidation

### On Translation Update

```ts
// In your admin API after saving
await storage.saveTranslation(locale, hash, text, options);
await cache.invalidate(locale);  // Clear cache for this locale
```

### Invalidate All

```ts
await cache.invalidate();  // Clear all locales
```

### Webhook Endpoint

```ts
// app/api/cache/invalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rosetta } from '@/lib/rosetta';

export async function POST(request: NextRequest) {
  const { locale, secret } = await request.json();

  // Verify secret
  if (secret !== process.env.CACHE_INVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await rosetta.invalidateCache(locale);

  return NextResponse.json({ success: true });
}
```

### On Deploy

For Vercel, use deploy hooks:

```ts
// scripts/invalidate-cache.ts
const response = await fetch(`${SITE_URL}/api/cache/invalidate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret: process.env.CACHE_INVALIDATION_SECRET,
  }),
});
```

## Cache Warming

Pre-populate cache on startup:

```ts
// lib/rosetta/warm-cache.ts
export async function warmCache(rosetta: Rosetta, locales: string[]) {
  console.log('Warming translation cache...');

  await Promise.all(
    locales.map(async (locale) => {
      await rosetta.loadTranslations(locale);
      console.log(`  Cached: ${locale}`);
    })
  );

  console.log('Cache warming complete');
}

// app/layout.tsx or instrumentation.ts
import { warmCache } from '@/lib/rosetta/warm-cache';
import { rosetta } from '@/lib/rosetta';

if (process.env.NODE_ENV === 'production') {
  warmCache(rosetta, ['en', 'zh-TW', 'ja']);
}
```

## TTL Considerations

### Short TTL (10s - 1min)
- Fresher translations
- More DB queries
- Good for development

### Medium TTL (5min)
- Good balance
- Recommended default
- Most use cases

### Long TTL (1hr+)
- Minimal DB load
- Risk of stale translations
- Good for stable content

## Performance Monitoring

### Cache Hit Rate

```ts
class MonitoredCache implements CacheAdapter {
  private hits = 0;
  private misses = 0;

  constructor(private inner: CacheAdapter) {}

  async get(locale: string) {
    const result = await this.inner.get(locale);
    if (result) {
      this.hits++;
    } else {
      this.misses++;
    }
    return result;
  }

  // ... other methods delegate to inner

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}
```

### Logging

```ts
class LoggingCache implements CacheAdapter {
  constructor(private inner: CacheAdapter) {}

  async get(locale: string) {
    const start = Date.now();
    const result = await this.inner.get(locale);
    const duration = Date.now() - start;

    console.log(`[cache] get ${locale}: ${result ? 'HIT' : 'MISS'} (${duration}ms)`);

    return result;
  }

  // ... other methods with logging
}
```

## Troubleshooting

### Stale Translations

**Symptom:** Updates not appearing

**Solutions:**
1. Check TTL settings
2. Verify invalidation is triggered
3. Check cache key prefix

### Memory Issues

**Symptom:** High memory usage

**Solutions:**
1. Reduce `maxEntries`
2. Shorten TTL
3. Use external cache

### Slow Cold Starts

**Symptom:** First request slow

**Solutions:**
1. Use cache warming
2. Use external cache
3. Fine-grained loading

## Next Steps

- [Deployment](/guide/deployment) - Production setup
- [Storage Adapter](/advanced/storage-adapter) - Custom storage
- [How It Works](/guide/how-it-works) - Architecture
