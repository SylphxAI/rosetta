# Admin Dashboard Example

Build a translation management UI using `@sylphx/rosetta-admin`.

## Overview

This example shows how to build a complete admin dashboard with:
- Locale overview with progress bars
- Translation editor with filtering
- AI batch translation
- Review workflow

## Project Structure

```
app/
├── admin/
│   └── translations/
│       └── page.tsx        # Admin dashboard
├── api/
│   └── admin/
│       └── translations/
│           ├── route.ts    # REST handlers
│           └── batch/
│               └── route.ts # Batch translate
```

## Server: API Routes

### Main Handlers

```ts
// app/api/admin/translations/route.ts
import { createRestHandlers } from '@sylphx/rosetta-admin/server';
import { createAiSdkTranslator } from '@sylphx/rosetta-translator-ai-sdk';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { storage } from '@/lib/rosetta/storage';
import { auth } from '@/lib/auth';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const handlers = createRestHandlers({
  storage,
  translator: createAiSdkTranslator({
    model: openrouter('anthropic/claude-sonnet-4'),
  }),
  // Optional: restrict access
  authorize: async () => {
    const session = await auth();
    return session?.user?.role === 'admin';
  },
});

export const { GET, PUT, PATCH } = handlers;
```

### Batch Translate (SSE Streaming)

```ts
// app/api/admin/translations/batch/route.ts
import { createAdminService } from '@sylphx/rosetta-admin/server';
import { createAiSdkTranslator } from '@sylphx/rosetta-translator-ai-sdk';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { storage } from '@/lib/rosetta/storage';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const service = createAdminService({
  storage,
  translator: createAiSdkTranslator({
    model: openrouter('anthropic/claude-sonnet-4'),
  }),
});

export async function POST(request: Request) {
  const { locale } = await request.json();

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Stream events
  (async () => {
    try {
      for await (const event of service.batchTranslateStream({ locale })) {
        await writer.write(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Client: Admin Dashboard

```tsx
// app/admin/translations/page.tsx
'use client';

import { useState } from 'react';
import {
  TranslationAdminProvider,
  useTranslationAdmin,
  createRestClient,
} from '@sylphx/rosetta-admin/react';

// Create API client
const client = createRestClient({
  baseUrl: '/api/admin/translations',
});

// Main component
export default function TranslationsPage() {
  return (
    <TranslationAdminProvider client={client}>
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Translation Manager</h1>
        <TranslationManager />
      </div>
    </TranslationAdminProvider>
  );
}

function TranslationManager() {
  const { view } = useTranslationAdmin();

  return view === 'dashboard' ? <Dashboard /> : <Editor />;
}
```

### Dashboard Component

```tsx
function Dashboard() {
  const {
    locales,
    stats,
    isLoading,
    enterEditor,
    batchTranslate,
    getLocaleProgress,
    getOutdatedCount,
    batchProgress,
  } = useTranslationAdmin();

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {locales.map(locale => {
        const progress = getLocaleProgress(locale);
        const outdated = getOutdatedCount(locale);
        const localeStats = stats.locales[locale];
        const isTranslating = batchProgress[locale] != null;
        const translateProgress = batchProgress[locale];

        return (
          <div
            key={locale}
            className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{locale}</h3>
                <p className="text-gray-500 text-sm">
                  {localeStats?.translated ?? 0} / {localeStats?.total ?? 0} translated
                </p>
              </div>
              {outdated > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  {outdated} outdated
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 rounded-full mb-4">
              <div
                className="h-2 bg-green-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Translation progress */}
            {isTranslating && translateProgress && (
              <div className="mb-4">
                <p className="text-sm text-blue-600">
                  Translating: {translateProgress.current} / {translateProgress.total}
                </p>
                <div className="h-1 bg-blue-100 rounded-full">
                  <div
                    className="h-1 bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${(translateProgress.current / translateProgress.total) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => enterEditor(locale)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Edit
              </button>
              <button
                onClick={() => batchTranslate(locale)}
                disabled={isTranslating || progress === 100}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isTranslating ? 'Translating...' : 'AI Translate'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Editor Component

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
    isLoading,
  } = useTranslationAdmin();

  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingHash, setSavingHash] = useState<string | null>(null);

  const handleSave = async (hash: string, sourceText: string) => {
    const text = editingValues[hash];
    if (!text) return;

    setSavingHash(hash);
    try {
      await saveTranslation(hash, text);
      setEditingValues(prev => {
        const next = { ...prev };
        delete next[hash];
        return next;
      });
    } finally {
      setSavingHash(null);
    }
  };

  const handleReview = async (hash: string) => {
    setSavingHash(hash);
    try {
      await markAsReviewed(hash);
    } finally {
      setSavingHash(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={exitEditor}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          ← Back
        </button>

        <h2 className="text-2xl font-semibold">
          Editing: {activeLocale}
        </h2>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search translations..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border rounded"
        />

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 border rounded"
        >
          <option value="all">All</option>
          <option value="missing">Missing</option>
          <option value="outdated">Outdated</option>
          <option value="unreviewed">Unreviewed</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>

      {/* Translation table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left w-1/3">Source</th>
              <th className="px-4 py-3 text-left w-1/3">Translation</th>
              <th className="px-4 py-3 text-left w-24">Status</th>
              <th className="px-4 py-3 text-left w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSources.map(source => {
              const translation = source.translations[activeLocale!];
              const currentValue = editingValues[source.sourceHash]
                ?? translation?.text
                ?? '';
              const hasChanges = editingValues[source.sourceHash] !== undefined;
              const isSaving = savingHash === source.sourceHash;

              return (
                <tr key={source.sourceHash} className="border-t">
                  <td className="px-4 py-3 align-top">
                    <p className="font-mono text-sm">{source.effectiveSource}</p>
                    {source.context && (
                      <p className="text-xs text-gray-500 mt-1">
                        Context: {source.context}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      value={currentValue}
                      onChange={e => setEditingValues(prev => ({
                        ...prev,
                        [source.sourceHash]: e.target.value
                      }))}
                      className="w-full px-3 py-2 border rounded resize-none"
                      rows={2}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      translation={translation}
                      isOutdated={translation?.outdated ?? false}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleSave(source.sourceHash, source.effectiveSource)}
                        disabled={!hasChanges || isSaving}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded disabled:opacity-50"
                      >
                        {isSaving ? '...' : 'Save'}
                      </button>
                      {translation?.text && !translation.reviewed && (
                        <button
                          onClick={() => handleReview(source.sourceHash)}
                          disabled={isSaving}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredSources.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            No translations found
          </div>
        )}
      </div>
    </div>
  );
}
```

### Status Badge Component

```tsx
function StatusBadge({
  translation,
  isOutdated,
}: {
  translation: { text: string | null; auto: boolean; reviewed: boolean } | null;
  isOutdated: boolean;
}) {
  if (!translation?.text) {
    return (
      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
        Missing
      </span>
    );
  }

  if (isOutdated) {
    return (
      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
        Outdated
      </span>
    );
  }

  if (translation.auto && !translation.reviewed) {
    return (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
        AI
      </span>
    );
  }

  if (translation.reviewed) {
    return (
      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
        Reviewed
      </span>
    );
  }

  return (
    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
      Draft
    </span>
  );
}
```

## With tRPC (Alternative)

```ts
// server/trpc/routers/admin.ts
import { createAdminRouter } from '@sylphx/rosetta-admin/server/trpc';

export const adminRouter = createAdminRouter({
  storage,
  translator,
});

// Merge into app router
export const appRouter = router({
  admin: adminRouter,
});
```

```tsx
// Client
import { createTRPCClient } from '@sylphx/rosetta-admin/react';
import { api } from '@/trpc/react';

const client = createTRPCClient(api.admin);

<TranslationAdminProvider client={client}>
  ...
</TranslationAdminProvider>
```

## Next Steps

- [Basic Setup](/examples/basic) - Full project setup
- [Custom Storage](/examples/custom-storage) - Custom adapter
- [@sylphx/rosetta-admin](/packages/rosetta-admin) - API reference
