# Rosetta Class

The main entry point for server-side Rosetta operations.

## Constructor

```ts
import { Rosetta } from '@sylphx/rosetta/server';

const rosetta = new Rosetta(config);
```

### Config

```ts
interface RosettaConfig {
  /** Storage adapter for translations */
  storage: StorageAdapter;

  /** Default locale (fallback) */
  defaultLocale?: string;  // default: 'en'

  /** Cache adapter for translation caching */
  cache?: CacheAdapter;
}
```

## Methods

### loadTranslations()

Load all translations for a locale (with fallback chain):

```ts
const translations = await rosetta.loadTranslations(locale);
// Returns: Map<string, string>
```

**Behavior:**
1. Builds fallback chain (e.g., `zh-TW` → `zh` → `en`)
2. Loads translations for each locale
3. Merges in order (default first, specific last)
4. Returns combined Map

### loadTranslationsByHashes()

Load specific translations by hash:

```ts
const translations = await rosetta.loadTranslationsByHashes(locale, hashes);
// Returns: Map<string, string>
```

**Use case:** Fine-grained loading for route-specific translations.

### getStorage()

Get the storage adapter:

```ts
const storage = rosetta.getStorage();
```

### getDefaultLocale()

Get the default locale:

```ts
const defaultLocale = rosetta.getDefaultLocale();
// Returns: string (e.g., 'en')
```

### getCache()

Get the cache adapter (if configured):

```ts
const cache = rosetta.getCache();
// Returns: CacheAdapter | undefined
```

### invalidateCache()

Invalidate cached translations:

```ts
// Invalidate specific locale
await rosetta.invalidateCache('zh-TW');

// Invalidate all
await rosetta.invalidateCache();
```

### hashText()

Hash text for lookup (static method):

```ts
const hash = Rosetta.hashText(text, context);
// Returns: string (8-char hex)
```

## Usage Example

```ts
// lib/rosetta/index.ts
import { Rosetta, InMemoryCache } from '@sylphx/rosetta/server';
import { DrizzleStorageAdapter } from '@sylphx/rosetta-drizzle';
import { db } from '@/db';
import { rosettaSources, rosettaTranslations } from '@/db/schema';

const storage = new DrizzleStorageAdapter({
  db,
  sources: rosettaSources,
  translations: rosettaTranslations,
});

export const rosetta = new Rosetta({
  storage,
  defaultLocale: 'en',
  cache: new InMemoryCache({
    ttlMs: 5 * 60 * 1000,
    maxEntries: 100,
  }),
});
```

## With RosettaProvider

```tsx
// app/[locale]/layout.tsx
import { RosettaProvider } from '@sylphx/rosetta-next/server';
import { rosetta } from '@/lib/rosetta';

export default async function Layout({ children, params }) {
  const { locale } = await params;

  return (
    <RosettaProvider rosetta={rosetta} locale={locale}>
      {children}
    </RosettaProvider>
  );
}
```

## TypeScript

```ts
import type { Rosetta } from '@sylphx/rosetta/server';
import type { StorageAdapter, CacheAdapter } from '@sylphx/rosetta';

// Type the rosetta instance
const rosetta: Rosetta = new Rosetta({ storage });
```

## See Also

- [t() Function](/api/t-function)
- [Storage Adapter](/advanced/storage-adapter)
- [Caching](/advanced/caching)
