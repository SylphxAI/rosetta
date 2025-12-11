# @sylphx/rosetta-admin

Headless React hooks for building translation management UIs.

## Installation

```bash
bun add @sylphx/rosetta-admin
```

## Entry Points

| Entry | Description |
|-------|-------------|
| `@sylphx/rosetta-admin` | Core types and store |
| `@sylphx/rosetta-admin/react` | React hooks and providers |
| `@sylphx/rosetta-admin/server` | Server-side handlers |
| `@sylphx/rosetta-admin/server/trpc` | tRPC router |

## Quick Setup

### 1. Server: Create API Handlers

::: code-group

```ts [REST]
// app/api/admin/translations/route.ts
import { createRestHandlers } from '@sylphx/rosetta-admin/server';
import { createAiSdkTranslator } from '@sylphx/rosetta-translator-ai-sdk';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { storage } from '@/lib/rosetta/storage';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const handlers = createRestHandlers({
  storage,
  translator: createAiSdkTranslator({
    model: openrouter('anthropic/claude-sonnet-4'),
  }),
});

export const { GET, PUT, PATCH } = handlers;
```

```ts [tRPC]
// server/trpc/routers/admin.ts
import { createAdminRouter } from '@sylphx/rosetta-admin/server/trpc';
import { createAiSdkTranslator } from '@sylphx/rosetta-translator-ai-sdk';
import { storage } from '@/lib/rosetta/storage';

export const adminRouter = createAdminRouter({
  storage,
  translator: createAiSdkTranslator({
    model: openrouter('anthropic/claude-sonnet-4'),
  }),
});

// Merge into your main router
export const appRouter = router({
  admin: adminRouter,
  // ...
});
```

:::

### 2. Client: Use Hooks

```tsx
// app/admin/translations/page.tsx
'use client';

import {
  TranslationAdminProvider,
  useTranslationAdmin,
  createRestClient,
} from '@sylphx/rosetta-admin/react';

const client = createRestClient({ baseUrl: '/api/admin/translations' });

function TranslationDashboard() {
  const {
    locales,
    stats,
    isLoading,
    enterEditor,
    getLocaleProgress,
  } = useTranslationAdmin();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {locales.map(locale => (
        <div
          key={locale}
          className="p-4 border rounded cursor-pointer"
          onClick={() => enterEditor(locale)}
        >
          <h3>{locale}</h3>
          <p>{getLocaleProgress(locale)}% translated</p>
          <p>{stats.locales[locale]?.outdated || 0} outdated</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <TranslationAdminProvider client={client}>
      <TranslationDashboard />
    </TranslationAdminProvider>
  );
}
```

## React Hooks

### useTranslationAdmin()

Main hook providing all state and actions:

```tsx
const {
  // Data
  sources,           // All source strings
  locales,           // Available locales
  stats,             // Translation statistics

  // View state
  view,              // 'dashboard' | 'editor'
  activeLocale,      // Currently editing locale
  filteredSources,   // Sources filtered by search/status

  // Editor state
  searchQuery,       // Current search query
  statusFilter,      // 'all' | 'missing' | 'outdated' | 'unreviewed'
  editingHash,       // Currently editing translation hash

  // Loading states
  isLoading,         // Fetching data
  isBatchTranslating, // AI translation in progress
  batchProgress,     // { locale: { current, total } }

  // Navigation
  enterEditor,       // (locale: string) => void
  exitEditor,        // () => void

  // Editor actions
  setSearchQuery,    // (query: string) => void
  setStatusFilter,   // (filter: StatusFilter) => void
  setEditingHash,    // (hash: string | null) => void

  // Mutations
  saveTranslation,   // (hash, text, locale?) => Promise<void>
  markAsReviewed,    // (hash, locale?) => Promise<void>
  batchTranslate,    // (locale?, hashes?) => Promise<void>
  addLocale,         // (locale) => Promise<void>
  removeLocale,      // (locale) => Promise<void>
  refresh,           // () => Promise<void>

  // Helpers
  getLocaleProgress, // (locale) => number (0-100)
  getOutdatedCount,  // (locale) => number
  getUntranslatedSources, // () => SourceEntry[]
} = useTranslationAdmin();
```

### useTranslationEditor()

Focused hook for the editor view:

```tsx
const {
  locale,
  sources,          // Filtered sources for this locale
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  editingHash,
  setEditingHash,
  saveTranslation,
  markAsReviewed,
} = useTranslationEditor('zh-TW');
```

### useBatchTranslate()

Hook for batch AI translation:

```tsx
const {
  isTranslating,
  progress,         // { current: number, total: number }
  translate,        // (locale, hashes?) => Promise<void>
  cancel,           // () => void
} = useBatchTranslate();
```

## API Clients

### createRestClient()

For REST API:

```tsx
import { createRestClient } from '@sylphx/rosetta-admin/react';

const client = createRestClient({
  baseUrl: '/api/admin/translations',
  headers: {
    'Authorization': 'Bearer token',
  },
});
```

### createTRPCClient()

For tRPC:

```tsx
import { createTRPCClient } from '@sylphx/rosetta-admin/react';
import { api } from '@/trpc/react';

const client = createTRPCClient(api.admin);
```

## Server Handlers

### createRestHandlers()

Create REST API route handlers:

```ts
import { createRestHandlers } from '@sylphx/rosetta-admin/server';

const handlers = createRestHandlers({
  storage,               // StorageAdapter
  translator,            // Optional: TranslateFunction
  getEnabledLocales,     // Optional: () => Promise<string[]>
  batchSize: 30,         // Optional: batch size for AI
  getManifestSources,    // Optional: () => Promise<ManifestSource[]>
});

// Route handlers
export const { GET, PUT, PATCH } = handlers;
export const POST = handlers.batchTranslate;
```

### createAdminService()

Lower-level service for custom handlers:

```ts
import { createAdminService } from '@sylphx/rosetta-admin/server';

const service = createAdminService({
  storage,
  translator,
});

// Use in custom route
const data = await service.fetchTranslations();
await service.saveTranslation({ locale, sourceHash, translatedText });
await service.batchTranslate({ locale });
```

### createAdminRouter()

tRPC router:

```ts
import { createAdminRouter } from '@sylphx/rosetta-admin/server/trpc';

const adminRouter = createAdminRouter({
  storage,
  translator,
});
```

## Types

### SourceEntry

```ts
interface SourceEntry {
  sourceHash: string;
  sourceText: string;
  effectiveSource: string;  // Override or original
  context?: string | null;
  translations: Record<string, TranslationData | null>;
}
```

### TranslationData

```ts
interface TranslationData {
  text: string | null;
  auto: boolean;        // AI-generated
  reviewed: boolean;    // Human-reviewed
  outdated: boolean;    // Source changed
  translatedFrom?: string | null;
}
```

### TranslationStatus

```ts
type TranslationStatus =
  | 'missing'      // Not translated
  | 'outdated'     // Source changed since translation
  | 'unreviewed'   // AI-generated, not reviewed
  | 'reviewed'     // Human-reviewed
  | 'current';     // Up-to-date and reviewed
```

### StatusFilter

```ts
type StatusFilter = 'all' | 'missing' | 'outdated' | 'unreviewed' | 'reviewed';
```

### LocaleStats

```ts
interface LocaleStats {
  translated: number;
  reviewed: number;
  outdated: number;
  total: number;
}
```

## Building Custom UI

### Dashboard Example

```tsx
function Dashboard() {
  const { locales, stats, enterEditor, batchTranslate } = useTranslationAdmin();

  return (
    <div className="grid grid-cols-4 gap-4">
      {locales.map(locale => {
        const localeStats = stats.locales[locale];
        const progress = localeStats
          ? Math.round((localeStats.translated / localeStats.total) * 100)
          : 0;

        return (
          <Card key={locale}>
            <CardHeader>
              <CardTitle>{locale}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progress} />
              <p>{progress}% complete</p>
              <p>{localeStats?.outdated || 0} outdated</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => enterEditor(locale)}>Edit</Button>
              <Button onClick={() => batchTranslate(locale)}>
                AI Translate
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
```

### Editor Example

```tsx
function Editor() {
  const {
    activeLocale,
    filteredSources,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    saveTranslation,
    markAsReviewed,
    exitEditor,
  } = useTranslationAdmin();

  const [editingText, setEditingText] = useState<Record<string, string>>({});

  const handleSave = async (hash: string) => {
    await saveTranslation(hash, editingText[hash]);
    setEditingText(prev => ({ ...prev, [hash]: '' }));
  };

  return (
    <div>
      <header className="flex gap-4 mb-4">
        <Button onClick={exitEditor}>← Back</Button>
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <option value="all">All</option>
          <option value="missing">Missing</option>
          <option value="outdated">Outdated</option>
          <option value="unreviewed">Unreviewed</option>
        </Select>
      </header>

      <table className="w-full">
        <thead>
          <tr>
            <th>Source</th>
            <th>Translation</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredSources.map(source => {
            const translation = source.translations[activeLocale!];
            return (
              <tr key={source.sourceHash}>
                <td>{source.effectiveSource}</td>
                <td>
                  <Textarea
                    value={editingText[source.sourceHash] ?? translation?.text ?? ''}
                    onChange={e => setEditingText(prev => ({
                      ...prev,
                      [source.sourceHash]: e.target.value
                    }))}
                  />
                </td>
                <td>
                  {!translation?.text && <Badge>Missing</Badge>}
                  {translation?.outdated && <Badge variant="warning">Outdated</Badge>}
                  {translation?.auto && !translation?.reviewed && (
                    <Badge variant="info">AI</Badge>
                  )}
                </td>
                <td>
                  <Button onClick={() => handleSave(source.sourceHash)}>
                    Save
                  </Button>
                  {translation?.text && !translation?.reviewed && (
                    <Button onClick={() => markAsReviewed(source.sourceHash)}>
                      Approve
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

## SSE Streaming

For real-time batch translation progress:

```ts
// Server: Create streaming handler
export async function POST(request: Request) {
  const { locale } = await request.json();

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Start streaming
  (async () => {
    for await (const event of service.batchTranslateStream({ locale })) {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
      );
    }
    await writer.close();
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

## Next Steps

- [AI Translators](/packages/translators) - Configure AI translation
- [Admin Dashboard Example](/examples/admin-dashboard) - Full example
- [REST API Reference](/api/types) - API endpoints
