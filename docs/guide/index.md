# Introduction

Rosetta is an i18n library designed for modern Next.js applications. Unlike traditional i18n solutions that require you to maintain JSON files with translation keys, Rosetta lets you write English directly in your code and generates translations using AI.

## Core Concepts

### Hash-Based Translation

Rosetta uses content hashing instead of translation keys:

```tsx
// Traditional i18n (key-based)
t('home.welcome.title')  // → "Welcome to our app"

// Rosetta (hash-based)
t("Welcome to our app")  // → hash → lookup translation
```

**Benefits:**
- No key management or naming conventions
- Source text is always visible in code
- Automatic deduplication via hashing
- Context support for disambiguation

### Locale Fallback Chain

When a translation is missing, Rosetta automatically falls back through a language chain:

```
User locale: zh-TW (Traditional Chinese)
Fallback chain: zh-TW → zh → en

Lookup: zh-TW miss → zh miss → en hit ✓
```

This ensures users always see content, even if translations are incomplete.

### Server & Client Rendering

Rosetta works seamlessly with both server and client components:

```tsx
// Server Component - uses AsyncLocalStorage
import { t } from '@sylphx/rosetta-next/server';
function ServerComponent() {
  return <h1>{t("Hello World")}</h1>;
}

// Client Component - uses React Context
'use client';
import { useT } from '@sylphx/rosetta-next';
function ClientComponent() {
  const t = useT();
  return <button>{t("Click me")}</button>;
}
```

Both use the same hash-based lookup, ensuring hydration consistency.

## Why Rosetta?

### vs Traditional i18n (react-intl, next-intl)

| Aspect | Traditional | Rosetta |
|--------|-------------|---------|
| Source strings | JSON files with keys | English in code |
| Key management | Manual, error-prone | Automatic hashing |
| Translation workflow | Manual extraction | CLI + AI generation |
| Storage | Files in repo | Database (flexible) |
| Type safety | Varies | Full TypeScript |

### vs Translation Services (Crowdin, Lokalise)

| Aspect | Translation Services | Rosetta |
|--------|---------------------|---------|
| Cost | Per-word pricing | LLM API cost only |
| Speed | Days/weeks | Seconds (AI) |
| Integration | Sync overhead | Native DB storage |
| Control | External platform | Self-hosted |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  BUILD TIME                                                      │
│  rosetta extract → Scans t() calls → manifest.ts                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  RUNTIME (Server)                                                │
│  RosettaProvider → loads translations → AsyncLocalStorage       │
│  t("Hello") → hash → Map lookup → translated text               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  RUNTIME (Client)                                                │
│  RosettaClientProvider → React Context → translations Map       │
│  useT() → t("Hello") → same hash lookup                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ADMIN                                                           │
│  useTranslationAdmin() → view/edit translations                 │
│  batchTranslate() → AI generates → saves to DB                  │
└─────────────────────────────────────────────────────────────────┘
```

## Next Steps

- [Quick Start](/guide/quick-start) - Get up and running in 5 minutes
- [How It Works](/guide/how-it-works) - Deep dive into the architecture
- [Next.js Integration](/guide/next-js) - App Router setup guide
