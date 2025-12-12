# Deployment

This guide covers production deployment considerations for Rosetta.

## Environment Types

### Traditional Server (Long-Running Node.js)

Best for: Self-hosted, Docker, VPS

```ts
import { Rosetta, InMemoryCache } from '@sylphx/rosetta-next/server';

const rosetta = new Rosetta({
  storage,
  cache: new InMemoryCache({
    ttlMs: 5 * 60 * 1000,  // 5 minutes
    maxEntries: 100,
  }),
});
```

**Characteristics:**
- ✅ In-memory cache persists between requests
- ✅ Simple setup, no external services
- ❌ Cache lost on restart
- ❌ Each instance has separate cache

### Serverless (Lambda, Vercel Functions)

Best for: Vercel, AWS Lambda, Netlify Functions

```ts
import { Rosetta, ExternalCache } from '@sylphx/rosetta-next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const rosetta = new Rosetta({
  storage,
  cache: new ExternalCache(redis, {
    ttlSeconds: 300,  // 5 minutes
  }),
});
```

**Characteristics:**
- ✅ Cache shared across instances
- ✅ Survives cold starts
- ❌ Additional latency (10-50ms)
- ❌ Requires external service

### Edge Runtime

Best for: Vercel Edge, Cloudflare Workers

```ts
// No cache - always fetch fresh
const rosetta = new Rosetta({
  storage,
  // No cache option - each request fetches from DB
});
```

**Characteristics:**
- ✅ Lowest latency (runs at edge)
- ✅ No cache staleness issues
- ❌ Every request hits database
- ❌ Requires edge-compatible database

## Database Recommendations

| Environment | Database | Adapter |
|-------------|----------|---------|
| Traditional | PostgreSQL | `@sylphx/rosetta-drizzle` |
| Serverless | Neon, PlanetScale | `@sylphx/rosetta-drizzle` |
| Edge | Neon, Turso, D1 | `@sylphx/rosetta-drizzle` |

### Neon (Recommended for Vercel)

```ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
```

### Turso (SQLite at Edge)

```ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client);
```

## Cache Invalidation

### On Translation Update

```ts
// In your admin API after saving translation
await storage.saveTranslation(locale, hash, text, options);
await cache.invalidate(locale);  // Clear cache for this locale
```

### Via API Route

```ts
// app/api/cache/invalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rosetta } from '@/lib/rosetta';

export async function POST(request: NextRequest) {
  const { locale, secret } = await request.json();

  // Verify secret
  if (secret !== process.env.CACHE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await rosetta.invalidateCache(locale);

  return NextResponse.json({ success: true });
}
```

### Webhook from Admin Dashboard

```ts
// When admin saves a translation, call the invalidate endpoint
const response = await fetch('/api/cache/invalidate', {
  method: 'POST',
  body: JSON.stringify({
    locale: 'zh-TW',
    secret: process.env.CACHE_SECRET,
  }),
});
```

## Environment Variables

```bash
# .env.local

# Database
DATABASE_URL=postgresql://...

# Cache (if using Redis)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# AI Translation
OPENROUTER_API_KEY=sk-or-...

# Security
CACHE_SECRET=your-random-secret
```

## Build Pipeline

### Recommended Setup

```json
// package.json
{
  "scripts": {
    "build": "rosetta extract -o src/rosetta/manifest.ts && next build",
    "dev": "next dev",
    "start": "next start"
  }
}
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Extract strings
        run: bun run rosetta extract -o src/rosetta/manifest.ts

      - name: Build
        run: bun run build

      - name: Deploy
        # Your deployment step
```

## Monitoring

### Translation Coverage

Track how many strings are translated per locale:

```ts
// Log on startup or via health check
const stats = await storage.getStats();
console.log('Translation coverage:', stats);
// { en: 100%, zh-TW: 95%, ja: 80% }
```

### Cache Hit Rate

```ts
// Custom cache wrapper with metrics
class MonitoredCache implements CacheAdapter {
  private hits = 0;
  private misses = 0;

  async get(locale: string) {
    const result = await this.innerCache.get(locale);
    if (result) {
      this.hits++;
    } else {
      this.misses++;
    }
    return result;
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses),
    };
  }
}
```

## Scaling Considerations

### High Traffic Sites

1. **Use external cache** - Redis/Upstash for shared cache
2. **Set appropriate TTL** - Balance freshness vs DB load
3. **Preload popular locales** - Warm cache on deploy

### Multiple Regions

1. **Use regional databases** - Neon regions, PlanetScale
2. **Use regional cache** - Upstash Global
3. **Consider replication delay** - Eventual consistency

### Large Translation Sets

1. **Use fine-grained loading** - Load per-route translations
2. **Split by feature** - Separate manifests for different areas
3. **Compress responses** - Enable gzip/brotli

## Security

### Admin Dashboard

Always authenticate admin routes:

```ts
// app/api/admin/translations/route.ts
import { createRestHandlers } from '@sylphx/rosetta-admin/server';
import { auth } from '@/lib/auth';

const handlers = createRestHandlers({
  storage,
  translator,
  authorize: async (request) => {
    const session = await auth();
    return session?.user?.role === 'admin';
  },
});
```

### Rate Limiting

```ts
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// In your API route
const { success } = await ratelimit.limit(request.ip ?? 'anonymous');
if (!success) {
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
}
```

## Troubleshooting

### Missing Translations

1. Check if string was extracted: `rosetta extract -v`
2. Verify locale has translations in DB
3. Check fallback chain is correct

### Cache Issues

1. Check TTL settings
2. Verify cache invalidation is triggered
3. Test with cache disabled

### Performance Issues

1. Enable query logging in Drizzle
2. Check cache hit rate
3. Profile database queries

## Next Steps

- [Caching Guide](/advanced/caching) - Deep dive into cache strategies
- [Storage Adapter](/advanced/storage-adapter) - Custom implementations
- [Admin Dashboard](/packages/rosetta-admin) - Translation management
