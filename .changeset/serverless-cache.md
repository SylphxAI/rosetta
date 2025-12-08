---
"@sylphx/rosetta": minor
---

feat: Add caching layer for serverless deployments

New cache adapters to reduce database queries in serverless environments:

- **InMemoryCache**: LRU cache with TTL for traditional Node.js servers
- **ExternalCache**: Redis/Upstash adapter for serverless (Vercel, Lambda)
- **RequestScopedCache**: Request-level deduplication

Usage:

```ts
// Serverless with Upstash Redis
import { Redis } from '@upstash/redis';
import { ExternalCache, Rosetta } from '@sylphx/rosetta/server';

const redis = new Redis({ url, token });
const cache = new ExternalCache(redis, { ttlSeconds: 60 });

const rosetta = new Rosetta({
  storage,
  cache, // Optional cache adapter
  defaultLocale: 'en',
});
```

Also adds `rosetta.invalidateCache(locale?)` to clear cached translations after updates.
