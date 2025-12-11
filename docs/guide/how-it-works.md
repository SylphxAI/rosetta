# How It Works

This page explains Rosetta's architecture and the principles behind its design.

## The Hashing Mechanism

### DJB2 Algorithm

Rosetta uses the DJB2 hash algorithm (also known as DJB33X) to convert source strings into 8-character hex identifiers:

```ts
function hashText(text: string, context?: string): string {
  const input = context ? `${context}::${text}` : text;

  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
```

**Why DJB2?**
- **Fast**: Simple arithmetic operations
- **Good distribution**: Low collision rate
- **Deterministic**: Same input always produces same output
- **Compact**: 8 hex characters = 32 bits

### Context for Disambiguation

The same English text can have different meanings in different contexts:

```tsx
// Without context - same hash!
t("Submit")  // hash: "abc12345" - button label? form action?

// With context - different hashes
t("Submit", { context: "button" })  // hash: "def67890"
t("Submit", { context: "form" })    // hash: "123abcde"
```

The context is prepended to the text before hashing: `"button::Submit"`.

### Hash Lookup Flow

```
t("Hello World")
       ↓
hash = djb2("Hello World")  // "a1b2c3d4"
       ↓
translations.get("a1b2c3d4")  // O(1) Map lookup
       ↓
"你好世界" (or fallback to source)
```

## Server-Side Context System

### AsyncLocalStorage

Node.js `AsyncLocalStorage` provides request-isolated storage without passing context through every function:

```ts
import { AsyncLocalStorage } from 'node:async_hooks';

const rosettaContext = new AsyncLocalStorage<RosettaContext>();

// Set context at request start
export function runWithRosetta<T>(context: RosettaContext, fn: () => T): T {
  return rosettaContext.run(context, fn);
}

// Access from anywhere in the request
export function t(text: string, options?: TranslateOptions): string {
  const ctx = rosettaContext.getStore();
  if (!ctx) return text; // Fallback if outside context

  const hash = hashText(text, options?.context);
  return ctx.translations.get(hash) ?? text;
}
```

### Why Not Global State?

Global state fails with concurrent requests:

```
❌ Global State Problem:
Request A: Set locale = "en"
Request B: Set locale = "zh"  // Overwrites!
Request A: t("Hello") → Returns Chinese! Wrong!

✅ AsyncLocalStorage Solution:
Request A: runWithRosetta({ locale: "en" }, ...)
Request B: runWithRosetta({ locale: "zh" }, ...)
Both requests have isolated context
```

### RosettaProvider Flow

```tsx
// RosettaProvider (async server component)
export async function RosettaProvider({ rosetta, locale, children }) {
  // 1. Load translations from storage
  const translations = await rosetta.loadTranslations(locale);

  // 2. Build locale fallback chain
  const localeChain = buildLocaleChain(locale, defaultLocale);
  // e.g., "zh-TW" → ["zh-TW", "zh", "en"]

  // 3. Wrap in AsyncLocalStorage context
  return runWithRosetta(
    { locale, translations, localeChain },
    () => (
      <RosettaClientProvider
        locale={locale}
        translations={Object.fromEntries(translations)}
      >
        {children}
      </RosettaClientProvider>
    )
  );
}
```

## Locale Fallback Chain

### Chain Building Logic

```ts
function buildLocaleChain(locale: string, defaultLocale: string): string[] {
  const chain: string[] = [locale];

  // Add language without region
  if (locale.includes('-')) {
    const language = locale.split('-')[0];
    if (!chain.includes(language)) {
      chain.push(language);
    }
  }

  // Add default locale
  if (!chain.includes(defaultLocale)) {
    chain.push(defaultLocale);
  }

  return chain;
}

// Examples:
buildLocaleChain('zh-TW', 'en')  // → ['zh-TW', 'zh', 'en']
buildLocaleChain('pt-BR', 'en')  // → ['pt-BR', 'pt', 'en']
buildLocaleChain('en', 'en')     // → ['en']
```

### Translation Loading with Fallback

```ts
async function loadTranslations(locale: string): Promise<Map<string, string>> {
  const chain = buildLocaleChain(locale, this.defaultLocale);
  const merged = new Map<string, string>();

  // Load in reverse order (default first, specific last)
  for (const loc of chain.reverse()) {
    const translations = await this.storage.getTranslations(loc);
    for (const [hash, text] of translations) {
      merged.set(hash, text);  // Later locales override
    }
  }

  return merged;
}
```

**Result**: A single Map containing the best available translation for each string.

## Client-Side Architecture

### React Context Provider

```tsx
'use client';

const RosettaContext = createContext<TranslationContextValue>({
  locale: 'en',
  t: (text) => text,  // Fallback
});

export function RosettaClientProvider({ locale, translations, children }) {
  // Convert object to Map for safe lookup (prevents prototype pollution)
  const translationsMap = useMemo(
    () => new Map(Object.entries(translations)),
    [translations]
  );

  const t = useMemo(() => {
    return (text: string, options?: TranslateOptions) => {
      const hash = hashText(text, options?.context);
      const translated = translationsMap.get(hash) ?? text;
      return formatMessage(translated, options?.params, { locale });
    };
  }, [translationsMap, locale]);

  return (
    <RosettaContext.Provider value={{ locale, t }}>
      {children}
    </RosettaContext.Provider>
  );
}
```

### Hydration Consistency

Server and client use identical:
- Hashing algorithm
- Translation Map
- Lookup logic

This ensures React hydration succeeds without mismatches.

## Translation Lookup Performance

### O(1) Hash Lookup

```
Traditional key-based: O(1) object property access
Rosetta hash-based:    O(1) Map.get()

// Both are constant time, no difference in production
```

### Memory Footprint

Translations are stored as `Map<hash, text>`:

```ts
// ~50 bytes per translation (hash + text + overhead)
// 1000 translations ≈ 50KB
// Fits easily in memory and transfers quickly
```

## String Extraction

### CLI Extraction (Recommended)

The CLI scans source files using regex:

```ts
// Regex pattern for t() calls
const T_CALL_REGEX = /\bt\s*\(\s*(['"`])(.+?)\1/g;

// Matches:
t('Hello World')       // ✓
t("Hello World")       // ✓
t(`Hello World`)       // ✓
t('Hello {name}')      // ✓

// Skips:
t(`Hello ${name}`)     // ✗ Dynamic strings
someFunction('text')   // ✗ Not t() call
```

### Build-Time vs Runtime

| Approach | Pros | Cons |
|----------|------|------|
| **CLI (build-time)** | Edge-compatible, predictable | Requires build step |
| **Runtime collection** | No build step | Node.js only, overhead |

**Recommendation**: Use CLI extraction for production.

## ICU MessageFormat

Rosetta supports ICU MessageFormat for complex strings:

```ts
// Pluralization
t("{count, plural, =0 {No items} one {# item} other {# items}}", { count: 5 })
// → "5 items"

// Select
t("{gender, select, male {He} female {She} other {They}} liked this", { gender: 'female' })
// → "She liked this"

// Number formatting
t("Price: {price, number, currency}", { price: 29.99 })
// → "Price: $29.99" (locale-aware)
```

### Security Limits

To prevent DoS attacks via malicious ICU strings:

```ts
const ICU_LIMITS = {
  maxDepth: 5,           // Nesting depth
  maxIterations: 100,    // Parser iterations
  maxTextLength: 50000,  // Input length
};
```

## Caching Architecture

### Cache Layers

```
Request → In-Memory Cache → External Cache → Database
            (ms)              (10-50ms)       (50-200ms)
```

### Cache Adapter Interface

```ts
interface CacheAdapter {
  get(locale: string): Promise<Map<string, string> | null>;
  set(locale: string, translations: Map<string, string>): Promise<void>;
  invalidate(locale?: string): Promise<void>;
  has(locale: string): Promise<boolean>;
}
```

### Implementation Options

| Environment | Recommended Cache |
|-------------|-------------------|
| Traditional server | `InMemoryCache` |
| Serverless (Lambda, Vercel) | `ExternalCache` (Redis/Upstash) |
| Edge Runtime | No cache (always fresh) |

See [Caching Guide](/advanced/caching) for detailed setup.

## Database Schema

### Tables

```sql
-- Source strings (from code)
CREATE TABLE rosetta_sources (
  id SERIAL PRIMARY KEY,
  hash VARCHAR(8) UNIQUE NOT NULL,
  text TEXT NOT NULL,
  context VARCHAR(255),
  occurrences INT DEFAULT 1,
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW()
);

-- Translations (per locale)
CREATE TABLE rosetta_translations (
  id SERIAL PRIMARY KEY,
  locale VARCHAR(10) NOT NULL,
  hash VARCHAR(8) NOT NULL,
  text TEXT NOT NULL,
  source_hash VARCHAR(8),      -- For staleness detection
  auto_generated BOOLEAN DEFAULT FALSE,
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(locale, hash)
);
```

### Staleness Detection

When source text changes, translations become "stale":

```ts
// Source changed: "Welcome" → "Welcome back"
// source_hash no longer matches current text hash
// Translation marked as outdated in admin UI
```

## Next Steps

- [Next.js Integration](/guide/next-js) - App Router patterns
- [Storage Adapter](/advanced/storage-adapter) - Custom implementations
- [Caching](/advanced/caching) - Production optimization
