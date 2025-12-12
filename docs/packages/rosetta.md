# @sylphx/rosetta

The core library providing hashing, interpolation, server context, and caching.

## Installation

```bash
bun add @sylphx/rosetta
```

## Entry Points

| Entry | Description |
|-------|-------------|
| `@sylphx/rosetta` | Core utilities (hash, interpolate, types) |
| `@sylphx/rosetta-next/server` | Server-side (Rosetta class, t(), context) |
| `@sylphx/rosetta/icu` | ICU MessageFormat parser |
| `@sylphx/rosetta/cli` | CLI for string extraction |

## Core Utilities

### `hashText()`

Generate a deterministic hash for source text:

```ts
import { hashText } from '@sylphx/rosetta';

hashText("Hello World");                    // "a1b2c3d4"
hashText("Submit", "button");               // "e5f6g7h8"
hashText("Submit", "form");                 // "12345678" (different!)
```

### `interpolate()`

Basic variable interpolation:

```ts
import { interpolate } from '@sylphx/rosetta';

interpolate("Hello {name}!", { name: "World" });
// "Hello World!"

interpolate("You have {count} items", { count: 5 });
// "You have 5 items"
```

## Server Module

### Rosetta Class

Main entry point for server-side usage:

```ts
import { Rosetta } from '@sylphx/rosetta-next/server';

const rosetta = new Rosetta({
  storage: drizzleAdapter,
  defaultLocale: 'en',
  cache: new InMemoryCache(),
});

// Load translations for a locale
const translations = await rosetta.loadTranslations('zh-TW');

// Get storage adapter
const storage = rosetta.getStorage();

// Get default locale
const defaultLocale = rosetta.getDefaultLocale();
```

### `t()` Function

Translate text within a Rosetta context:

```ts
import { t } from '@sylphx/rosetta-next/server';

// Basic usage
t("Hello World");

// With interpolation
t("Hello {name}", { name: "John" });

// With context for disambiguation
t("Submit", { context: "button" });

// Combined
t("Welcome back, {name}!", { name: "John", context: "greeting" });
```

### Context Functions

```ts
import {
  getLocale,
  getLocaleChain,
  getDefaultLocale,
  getRosettaContext,
  isInsideRosettaContext,
  runWithRosetta,
} from '@sylphx/rosetta-next/server';

// Get current locale
const locale = getLocale();  // "zh-TW"

// Get fallback chain
const chain = getLocaleChain();  // ["zh-TW", "zh", "en"]

// Check if inside context
if (isInsideRosettaContext()) {
  // Safe to use t()
}

// Run code with custom context
runWithRosetta({ locale: 'ja', translations: new Map() }, () => {
  // t() uses Japanese context here
});
```

### `buildLocaleChain()`

Build fallback chain for a locale:

```ts
import { buildLocaleChain } from '@sylphx/rosetta-next/server';

buildLocaleChain('zh-TW', 'en');  // ['zh-TW', 'zh', 'en']
buildLocaleChain('pt-BR', 'en');  // ['pt-BR', 'pt', 'en']
buildLocaleChain('ja', 'en');     // ['ja', 'en']
```

## Caching

### InMemoryCache

For traditional Node.js servers:

```ts
import { InMemoryCache } from '@sylphx/rosetta-next/server';

const cache = new InMemoryCache({
  ttlMs: 5 * 60 * 1000,  // 5 minutes (default)
  maxEntries: 100,        // LRU eviction
});
```

### ExternalCache

For serverless with Redis/Upstash:

```ts
import { ExternalCache } from '@sylphx/rosetta-next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({ url, token });
const cache = new ExternalCache(redis, {
  prefix: 'rosetta:translations:',  // Key prefix
  ttlSeconds: 300,                   // 5 minutes
});
```

### RequestScopedCache

For request deduplication:

```ts
import { RequestScopedCache } from '@sylphx/rosetta-next/server';

const requestCache = new RequestScopedCache();

// First call - hits DB
const t1 = await requestCache.getOrLoad('en', () => storage.getTranslations('en'));

// Second call - returns cached
const t2 = await requestCache.getOrLoad('en', () => storage.getTranslations('en'));

t1 === t2;  // true
```

## ICU MessageFormat

### `formatMessage()`

Full ICU support including plurals and selects:

```ts
import { formatMessage } from '@sylphx/rosetta/icu';

// Pluralization
formatMessage(
  "{count, plural, =0 {No items} one {# item} other {# items}}",
  { count: 5 },
  { locale: 'en' }
);
// "5 items"

// Select
formatMessage(
  "{gender, select, male {He} female {She} other {They}} liked this",
  { gender: 'female' },
  { locale: 'en' }
);
// "She liked this"

// Nested
formatMessage(
  "{count, plural, =0 {No messages} other {{count} new {count, plural, one {message} other {messages}}}}",
  { count: 3 },
  { locale: 'en' }
);
// "3 new messages"
```

### PluralRules Cache

Optimize PluralRules instantiation:

```ts
import { createPluralRulesCache, formatMessage } from '@sylphx/rosetta/icu';

const cache = createPluralRulesCache({ maxSize: 50 });

formatMessage(text, params, {
  locale: 'en',
  pluralRulesCache: cache,
});
```

## CLI

### Extract Command

Extract `t()` calls from source files:

```bash
# Basic extraction
rosetta extract

# Output to TypeScript file
rosetta extract -o src/rosetta/manifest.ts

# Watch mode
rosetta extract -o src/rosetta/manifest.ts --watch

# Verbose
rosetta extract -v

# Custom patterns
rosetta extract -i "**/*.tsx" -e "**/test/**"
```

### CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--root` | `-r` | Root directory to scan (default: cwd) |
| `--output` | `-o` | Output file (format inferred from extension) |
| `--format` | `-f` | Output format: `json`, `ts`, `table`, `silent` |
| `--watch` | `-w` | Watch mode |
| `--include` | `-i` | Include patterns (multiple allowed) |
| `--exclude` | `-e` | Exclude patterns (multiple allowed) |
| `--verbose` | `-v` | Verbose output |

## Types

### StorageAdapter

Interface for storage backends:

```ts
interface StorageAdapter {
  // Required: Get translations for a locale
  getTranslations(locale: string): Promise<Map<string, string>>;

  // Required: Save a translation
  saveTranslation(
    locale: string,
    hash: string,
    text: string,
    options?: SaveTranslationOptions
  ): Promise<void>;

  // Required: Get all source strings
  getSources(): Promise<SourceString[]>;

  // Required: Get untranslated strings for a locale
  getUntranslated(locale: string): Promise<SourceString[]>;

  // Required: Get available locales
  getAvailableLocales(): Promise<string[]>;

  // Optional: Batch operations
  getSourcesWithTranslations?(locales: string[]): Promise<SourceWithTranslations[]>;
  saveTranslations?(locale: string, translations: Map<string, string>): Promise<void>;
  markAsReviewed?(locale: string, hash: string): Promise<void>;
}
```

### SourceString

```ts
interface SourceString {
  hash: string;
  text: string;
  context?: string | null;
}
```

### SaveTranslationOptions

```ts
interface SaveTranslationOptions {
  autoGenerated?: boolean;
  sourceHash?: string;       // For staleness detection
  translatedFrom?: string;   // Deprecated, use sourceHash
}
```

## Validation

### Input Validation

```ts
import {
  validateText,
  validateLocale,
  validateContext,
  validateHash,
  assertValidText,
  MAX_TEXT_LENGTH,
} from '@sylphx/rosetta';

// Returns { valid: boolean, error?: string }
validateText("Hello");          // { valid: true }
validateText("");               // { valid: false, error: "..." }

// Throws on invalid
assertValidText("Hello");       // OK
assertValidText("");            // throws ValidationError

// Constants
MAX_TEXT_LENGTH;   // 50000
MAX_LOCALE_LENGTH; // 10
MAX_CONTEXT_LENGTH; // 255
```

## Next Steps

- [Quick Start](/guide/quick-start) - Get started
- [How It Works](/guide/how-it-works) - Architecture details
- [Storage Adapter](/advanced/storage-adapter) - Custom implementations
