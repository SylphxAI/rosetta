# Rosetta Architecture Refactor Plan

## Overview

This document outlines the architecture refactor completed in v0.6.0 to achieve better separation of concerns, zero Node.js dependencies in core, and explicit APIs.

## Status: COMPLETED

All phases completed successfully.

## Previous Problems (Solved)

### 1. Mixed Concerns in Core Package
The old `@sylphx/rosetta/server` entry point mixed:
- AsyncLocalStorage (Node.js dependency)
- t() function (implicit context magic)
- Rosetta class (storage + translation + caching)
- Context management

### 2. Build Complexity
- Different targets needed for different entry points
- `node:async_hooks` caused Edge runtime issues
- Required polyfills and special handling

### 3. Implicit Magic
- `t("Hello")` - Where does locale come from?
- Hidden AsyncLocalStorage context
- Hard to debug and test

## New Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Application                        │
├─────────────────────────────────────────────────────────────────┤
│  @sylphx/rosetta-next     │  @sylphx/rosetta-admin              │
│  ├── client/ (Context)    │  └── Admin UI components            │
│  ├── server/ (Rosetta)    │                                     │
│  └── middleware           │                                     │
├───────────────────────────┴─────────────────────────────────────┤
│  @sylphx/rosetta-drizzle  │  (future storage adapters)          │
│  └── Drizzle adapter      │                                     │
├─────────────────────────────────────────────────────────────────┤
│                    @sylphx/rosetta (core)                       │
│  Pure functions, zero dependencies, browser target              │
│  ├── hash.ts         - hashText()                               │
│  ├── icu.ts          - formatMessage(), plural rules            │
│  ├── interpolate.ts  - simple interpolation                     │
│  ├── validation.ts   - input validators                         │
│  ├── locales.ts      - locale constants                         │
│  └── types.ts        - TypeScript types                         │
└─────────────────────────────────────────────────────────────────┘
```

## Package Responsibilities

### @sylphx/rosetta (core)
**Target:** Browser (universal)
**Dependencies:** None

Exports:
- `hashText(text, context?)` - Generate translation hash
- `formatMessage(text, params, options?)` - ICU MessageFormat
- `interpolate(text, params)` - Simple string interpolation
- `validateLocale(locale)` - Validate locale format
- `validateText(text)` - Validate text input
- `buildLocaleChain(locale, defaultLocale)` - Build fallback chain
- `isValidLocale(locale)` - Check locale format
- Types: `StorageAdapter`, `TranslateAdapter`, `CacheAdapter`, `RosettaContext`, etc.

### @sylphx/rosetta-next
**Target:** Mixed (client: browser, server: node)
**Dependencies:** `@sylphx/rosetta`, `react`, `next`

#### Client Exports (`@sylphx/rosetta-next`)
- `RosettaClientProvider` - React Context provider for client
- `useT()` - Get t() function
- `useLocale()` - Get current locale
- `useRosetta()` - Get full context
- `T` - Translation component

#### Server Exports (`@sylphx/rosetta-next/server`)
- `createRosetta(config)` - Create Rosetta instance
- `RosettaProvider` - Server component provider
- `getTranslations()` - Get t() for current request
- `getLocale()` - Get current locale
- `t()` - Translate within AsyncLocalStorage context
- `InMemoryCache`, `ExternalCache`, `RequestScopedCache` - Cache adapters
- Locale utilities: `getReadyLocales`, `buildLocaleCookie`, etc.

#### Loader Export (`@sylphx/rosetta-next/loader`)
- `createRosettaLoader` - Webpack/Turbopack loader for extraction

### @sylphx/rosetta-drizzle
**Target:** Node
**Dependencies:** `@sylphx/rosetta`, `drizzle-orm`

Exports:
- `DrizzleStorageAdapter` - Storage adapter
- Schema helpers for PostgreSQL, SQLite, MySQL

### @sylphx/rosetta-admin
**Target:** Browser + Node
**Dependencies:** `@sylphx/rosetta`, `react`, `@trpc/server`, `zod`

Exports:
- React hooks for admin UI
- tRPC router for admin API
- REST handlers

---

## Migration Guide

### Breaking Changes

| Before (v0.5.x) | After (v0.6.0) |
|-----------------|----------------|
| `import { t } from '@sylphx/rosetta/server'` | `import { t } from '@sylphx/rosetta-next/server'` |
| `import { Rosetta } from '@sylphx/rosetta/server'` | `import { createRosetta, Rosetta } from '@sylphx/rosetta-next/server'` |
| `import { runWithRosetta } from '@sylphx/rosetta/server'` | `import { runWithRosetta } from '@sylphx/rosetta-next/server'` |
| `import { InMemoryCache } from '@sylphx/rosetta/server'` | `import { InMemoryCache } from '@sylphx/rosetta-next/server'` |
| `import { ExternalCache } from '@sylphx/rosetta/server'` | `import { ExternalCache } from '@sylphx/rosetta-next/server'` |

### Migration Steps

#### 1. Update Dependencies

```json
{
  "dependencies": {
    "@sylphx/rosetta": "^0.6.0",
    "@sylphx/rosetta-next": "^0.4.0"
  }
}
```

#### 2. Update Imports

**Before:**
```typescript
import { t, Rosetta, runWithRosetta, InMemoryCache } from '@sylphx/rosetta/server';
```

**After:**
```typescript
import { t, createRosetta, runWithRosetta, InMemoryCache } from '@sylphx/rosetta-next/server';
```

#### 3. Setup Example

**lib/i18n.ts:**
```typescript
import { createRosetta } from '@sylphx/rosetta-next/server';
import { DrizzleStorageAdapter } from '@sylphx/rosetta-drizzle';
import { db, rosettaSources, rosettaTranslations } from './db';

export const rosetta = createRosetta({
  storage: new DrizzleStorageAdapter({
    db,
    sources: rosettaSources,
    translations: rosettaTranslations,
  }),
  defaultLocale: 'en',
});
```

**app/[locale]/layout.tsx:**
```tsx
import { RosettaProvider } from '@sylphx/rosetta-next/server';
import { rosetta } from '@/lib/i18n';

export default async function Layout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <RosettaProvider rosetta={rosetta} locale={locale}>
      <html lang={locale}>
        <body>{children}</body>
      </html>
    </RosettaProvider>
  );
}
```

**Server Component:**
```tsx
import { getTranslations } from '@sylphx/rosetta-next/server';

export default async function Page() {
  const t = await getTranslations();

  return (
    <main>
      <h1>{t("Welcome to our app")}</h1>
      <p>{t("{count} users online", { count: 42 })}</p>
    </main>
  );
}
```

**Client Component:**
```tsx
'use client';
import { useT } from '@sylphx/rosetta-next';

export function LoginForm() {
  const t = useT();

  return (
    <form>
      <label>{t("Email")}</label>
      <input type="email" />
      <button>{t("Sign in")}</button>
    </form>
  );
}
```

---

## Implementation Completed

### Phase 1: Core Package Refactor ✅
- Created new entry point structure
- Moved pure functions to root exports
- Removed server/ entry point
- Updated build config (all browser target)
- Tests passing

### Phase 2: Enhanced rosetta-next ✅
- Moved Rosetta class from core to rosetta-next/server
- Moved context management to rosetta-next/server
- Created server context using AsyncLocalStorage
- Updated RosettaProvider as server component
- Updated build config

### Phase 3: Updated Dependent Packages ✅
- Updated rosetta-admin peer dependency
- Updated rosetta-drizzle peer dependency and docs
- All tests passing

### Phase 4: Documentation ✅
- Updated architecture docs
- Migration guide created
- Examples updated

### Phase 5: Release
- [ ] Version bump (minor - API is compatible via rosetta-next)
- [ ] Changelog
- [ ] Release notes

---

## Success Criteria Achieved

- [x] Core package has zero Node.js dependencies
- [x] Core package builds with browser target only
- [x] All tests pass (374 tests)
- [x] Documentation updated
- [x] No runtime errors in Edge environment (AsyncLocalStorage in rosetta-next only)
