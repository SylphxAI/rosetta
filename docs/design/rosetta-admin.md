# @sylphx/rosetta-admin - Design Document

> Translation Management Admin UI for Rosetta

## Overview

A headless-first translation admin UI that can be dropped into any Next.js app.

## Key Features

### 1. Source Override (Full CMS Mode)

Source language (e.g., English) is treated as just another translation:

```
Code:        t('Hello World')
                   ↓
             hash = "abc123"
                   ↓
┌─────────────────────────────────────────────────────────┐
│  rosetta_sources                                         │
│  - hash: "abc123"                                        │
│  - text: "Hello World"  ← Always preserved (from code)  │
└─────────────────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  rosetta_translations                                    │
│  - locale: "en", text: "Hi there!"   ← Source override! │
│  - locale: "zh-TW", text: "嗨！"     ← Based on override│
└─────────────────────────────────────────────────────────┘
```

**Display Logic:**
```ts
function getText(hash: string, locale: string): string {
  // 1. Check for translation (including source language override)
  const translation = await getTranslation(locale, hash);
  if (translation) return translation.text;

  // 2. Fallback to code text
  const source = await getSource(hash);
  return source.text;
}
```

### 2. Staleness Detection

Track what source text each translation was based on:

```sql
rosetta_translations:
  - hash
  - locale
  - text
  - translated_from    ← Source text at time of translation
  - auto_generated
  - reviewed
  - updated_at
```

**Detection Logic:**
```ts
const translation = translations[locale];
const currentSource = getEffectiveSource(hash);  // override or code
const isOutdated = translation.translatedFrom !== currentSource;
```

**Translation States:**
```ts
type TranslationStatus =
  | 'missing'      // Not translated
  | 'outdated'     // Translated but source changed
  | 'unreviewed'   // AI translated, not reviewed
  | 'reviewed'     // Human reviewed
  | 'current';     // Up to date (reviewed + not outdated)
```

### 3. Enhanced Stats

```ts
interface LocaleStats {
  translated: number;
  reviewed: number;
  outdated: number;    // Translations where source changed
  total: number;
}
```

## Architecture

### Core Insight

Translation Admin UI has two runtimes:
- **Client** - UI components, user interactions
- **Server** - Storage access, AI API calls

Cannot directly import storage in client components (server-only). Best design is **API-based architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Browser)                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  <TranslationCenter apiBase="/api/translations" />   │    │
│  │  - Pure React, no server dependencies                │    │
│  │  - Communicates via REST API                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Server (API Routes)                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  createTranslationAPI({ storage, translator })       │    │
│  │  - Has access to storage adapter                     │    │
│  │  - Has access to AI API keys                         │    │
│  │  - Handles all CRUD + batch translation              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Package Structure

```
@sylphx/rosetta-admin/
├── index.ts           # Main: UI components (styled)
├── react.ts           # Hooks only
├── headless.ts        # Unstyled components (render props)
├── next.ts            # Next.js API handlers
├── ai.ts              # AI translator factories
└── types.ts           # Shared types
```

## Layers

### Layer 1: Core Types

```ts
// @sylphx/rosetta-admin/types

interface SourceString {
  hash: string;
  text: string;
  context?: string;
  translations: Record<string, Translation | null>;
}

interface Translation {
  text: string;
  auto: boolean;
  reviewed: boolean;
}

interface LocaleStats {
  translated: number;
  reviewed: number;
  total: number;
}

interface TranslateFunction {
  (
    items: Array<{ hash: string; text: string; context?: string }>,
    targetLocale: string
  ): Promise<Array<{ hash: string; translatedText: string }>>;
}
```

### Layer 2: React Hooks

```ts
// @sylphx/rosetta-admin/react

// Provider - sets API endpoint
function TranslationAdminProvider({
  children,
  apiBase = '/api/admin/translations'
}: {
  children: React.ReactNode;
  apiBase?: string;
});

// Main hook - all state + actions
function useTranslationAdmin(): {
  // Data
  sources: SourceString[];
  locales: string[];
  stats: Record<string, LocaleStats>;
  isLoading: boolean;

  // View state
  view: 'dashboard' | 'editor';
  activeLocale: string | null;

  // Navigation
  enterEditor: (locale: string) => void;
  exitEditor: () => void;

  // Mutations
  saveTranslation: (hash: string, text: string) => Promise<void>;
  markAsReviewed: (hash: string) => Promise<void>;
  addLocale: (locale: string) => Promise<void>;
  removeLocale: (locale: string) => Promise<void>;

  // Batch translate
  batchTranslate: {
    run: (hashes?: string[]) => Promise<void>;
    isRunning: boolean;
    progress: { current: number; total: number };
  };
};

// Focused hooks
function useTranslationEditor(locale: string): {
  sources: SourceString[];
  filter: 'all' | 'missing' | 'unreviewed' | 'reviewed';
  setFilter: (f: Filter) => void;
  search: string;
  setSearch: (s: string) => void;
};
```

### Layer 3: Next.js API Handlers

```ts
// @sylphx/rosetta-admin/next

interface TranslationAPIConfig {
  storage: RosettaStorage;
  translator?: TranslateFunction;
  // Optional auth check
  authorize?: (req: NextRequest) => Promise<boolean>;
}

function createTranslationAPI(config: TranslationAPIConfig): {
  GET: NextRouteHandler;   // List sources, stats, locales
  PUT: NextRouteHandler;   // Save single translation
  PATCH: NextRouteHandler; // Mark as reviewed
  POST: NextRouteHandler;  // Batch translate / Add locale
  DELETE: NextRouteHandler; // Remove locale
};
```

**Usage:**

```ts
// app/api/admin/translations/[[...path]]/route.ts
import { createTranslationAPI } from '@sylphx/rosetta-admin/next';
import { storage } from '@/lib/rosetta';
import { createOpenRouterTranslator } from '@sylphx/rosetta-admin/ai';

const api = createTranslationAPI({
  storage,
  translator: createOpenRouterTranslator({
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: 'anthropic/claude-sonnet-4',
  }),
  authorize: async (req) => {
    // Check if user is admin
    const session = await getSession(req);
    return session?.user?.role === 'admin';
  },
});

export const { GET, PUT, PATCH, POST, DELETE } = api;
```

### Layer 4: AI Translators

```ts
// @sylphx/rosetta-admin/ai

// Built-in providers
export function createOpenRouterTranslator(config: {
  apiKey: string;
  model?: string;
  batchSize?: number;
}): TranslateFunction;

export function createOpenAITranslator(config: {
  apiKey: string;
  model?: string;
}): TranslateFunction;

export function createAnthropicTranslator(config: {
  apiKey: string;
  model?: string;
}): TranslateFunction;

// Custom - user can implement their own
const myTranslator: TranslateFunction = async (items, locale) => {
  // Call your own API
  return items.map(item => ({
    hash: item.hash,
    translatedText: await myCustomAPI(item.text, locale),
  }));
};
```

### Layer 5: Styled UI Components

```tsx
// @sylphx/rosetta-admin (default export)

// Simple drop-in - uses provider internally
function TranslationCenter(props: {
  apiBase?: string;
  className?: string;
  theme?: 'light' | 'dark' | 'system';
  // Customization
  localeDisplay?: (code: string) => { name: string; flag?: string };
  onError?: (error: Error) => void;
});

// Compound components for more control
TranslationCenter.Dashboard;
TranslationCenter.Editor;
TranslationCenter.AddLanguageModal;
```

### Layer 6: Headless Components

```tsx
// @sylphx/rosetta-admin/headless

// Render prop pattern - you bring your own UI
function LanguageList({
  children
}: {
  children: (props: {
    locales: string[];
    getStats: (locale: string) => LocaleStats;
    onEdit: (locale: string) => void;
    onTranslate: (locale: string) => void;
    onRemove: (locale: string) => void;
  }) => React.ReactNode;
});

function TranslationTable({
  locale,
  children,
}: {
  locale: string;
  children: (props: {
    sources: SourceString[];
    filter: Filter;
    setFilter: (f: Filter) => void;
    onSave: (hash: string, text: string) => Promise<void>;
    onReview: (hash: string) => Promise<void>;
  }) => React.ReactNode;
});
```

## Usage Examples

### 1. Simplest - Drop-in UI

```tsx
// app/admin/translations/page.tsx
'use client';
import { TranslationCenter } from '@sylphx/rosetta-admin';

export default function Page() {
  return <TranslationCenter apiBase="/api/admin/translations" />;
}
```

```ts
// app/api/admin/translations/[[...path]]/route.ts
import { createTranslationAPI } from '@sylphx/rosetta-admin/next';
import { createOpenRouterTranslator } from '@sylphx/rosetta-admin/ai';
import { storage } from '@/lib/rosetta';

export const { GET, PUT, PATCH, POST, DELETE } = createTranslationAPI({
  storage,
  translator: createOpenRouterTranslator({
    apiKey: process.env.OPENROUTER_API_KEY!,
  }),
});
```

### 2. Custom Theme / Styling

```tsx
<TranslationCenter
  apiBase="/api/admin/translations"
  theme="dark"
  className="rounded-none" // Override container styles
/>
```

### 3. With Auth Check

```ts
// API route
export const { GET, PUT, PATCH, POST, DELETE } = createTranslationAPI({
  storage,
  translator,
  authorize: async (req) => {
    const session = await auth();
    return session?.user?.role === 'admin';
  },
});
```

### 4. Hooks Only - Custom UI

```tsx
'use client';
import {
  TranslationAdminProvider,
  useTranslationAdmin
} from '@sylphx/rosetta-admin/react';

function MyCustomAdmin() {
  const {
    locales,
    stats,
    enterEditor,
    batchTranslate
  } = useTranslationAdmin();

  return (
    <div className="my-custom-design">
      {locales.map(locale => (
        <MyCard
          key={locale}
          progress={stats[locale].translated / stats[locale].total}
          onClick={() => enterEditor(locale)}
        />
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <TranslationAdminProvider apiBase="/api/admin/translations">
      <MyCustomAdmin />
    </TranslationAdminProvider>
  );
}
```

### 5. Headless - Maximum Control

```tsx
import { LanguageList } from '@sylphx/rosetta-admin/headless';

<LanguageList>
  {({ locales, getStats, onEdit, onTranslate }) => (
    <Table>
      {locales.map(locale => {
        const stats = getStats(locale);
        return (
          <TableRow key={locale}>
            <TableCell>{locale}</TableCell>
            <TableCell>{stats.translated}/{stats.total}</TableCell>
            <TableCell>
              <Button onClick={() => onEdit(locale)}>Edit</Button>
              <Button onClick={() => onTranslate(locale)}>AI</Button>
            </TableCell>
          </TableRow>
        );
      })}
    </Table>
  )}
</LanguageList>
```

## API Endpoints

The `createTranslationAPI` handler supports these endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get sources, locales, stats |
| PUT | `/` | Save single translation |
| PATCH | `/` | Mark as reviewed |
| POST | `/locales` | Add locale |
| DELETE | `/locales` | Remove locale |
| POST | `/batch` | Batch AI translate |

## Design Decisions

| Aspect | Decision | Reason |
|--------|----------|--------|
| **API-based** | UI ↔ REST ↔ Server | Security (API keys), flexibility, SSR-safe |
| **Separate package** | `@sylphx/rosetta-admin` | Keep rosetta-next lightweight |
| **Layered exports** | hooks → headless → ui | Progressive disclosure |
| **Pluggable AI** | Factory functions | Different providers, custom solutions |
| **Catch-all route** | `[[...path]]/route.ts` | Single file handles all endpoints |

## Implementation Plan

1. **Phase 1: Types + API handlers** (server side)
   - Define types
   - Create `createTranslationAPI()` handler
   - Test with existing luzzy storage

2. **Phase 2: React hooks** (client side)
   - Create `TranslationAdminProvider`
   - Create `useTranslationAdmin` hook
   - Create focused hooks

3. **Phase 3: UI components** (port from luzzy)
   - Port `TranslationCenter` component
   - Make it configurable
   - Add theme support

4. **Phase 4: AI providers**
   - Create `createOpenRouterTranslator`
   - Create `createOpenAITranslator`
   - Create `createAnthropicTranslator`

5. **Phase 5: Headless components**
   - Extract logic from styled components
   - Create render-prop versions

## Dependencies

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "@sylphx/rosetta": ">=0.1.0"
  },
  "optionalPeerDependencies": {
    "next": ">=14.0.0"
  }
}
```

## File Structure (Implementation)

```
packages/rosetta-admin/
├── src/
│   ├── types.ts              # Shared types
│   ├── index.ts              # Main export (styled UI)
│   ├── react.ts              # React hooks
│   ├── headless.ts           # Headless components
│   ├── next.ts               # Next.js handlers
│   ├── ai/
│   │   ├── index.ts
│   │   ├── openrouter.ts
│   │   ├── openai.ts
│   │   └── anthropic.ts
│   ├── hooks/
│   │   ├── useTranslationAdmin.ts
│   │   ├── useTranslationEditor.ts
│   │   └── useBatchTranslate.ts
│   ├── components/
│   │   ├── TranslationCenter.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Editor.tsx
│   │   ├── LanguageCard.tsx
│   │   ├── AddLanguageModal.tsx
│   │   └── DeleteConfirmModal.tsx
│   ├── headless/
│   │   ├── LanguageList.tsx
│   │   └── TranslationTable.tsx
│   └── next/
│       └── handlers.ts
├── package.json
├── tsconfig.json
└── README.md
```
