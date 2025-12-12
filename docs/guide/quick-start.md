# Quick Start

Get Rosetta running in your Next.js App Router project in 5 minutes.

## Prerequisites

- Next.js 14+ with App Router
- PostgreSQL, SQLite, or MySQL database
- Drizzle ORM setup

## Installation

```bash
# Core packages
bun add @sylphx/rosetta @sylphx/rosetta-next @sylphx/rosetta-drizzle

# AI translator (choose one)
bun add @sylphx/rosetta-translator-ai-sdk ai @openrouter/ai-sdk-provider
# or
bun add @sylphx/rosetta-translator-openrouter
# or
bun add @sylphx/rosetta-translator-anthropic @anthropic-ai/sdk
```

## Step 1: Database Schema

Add the Rosetta tables to your Drizzle schema:

::: code-group

```ts [PostgreSQL]
// db/schema.ts
import { createRosettaSchema } from '@sylphx/rosetta-drizzle';

export const { rosettaSources, rosettaTranslations } = createRosettaSchema();

// ... your other tables
```

```ts [SQLite]
// db/schema.ts
import { createRosettaSchemaSQLite } from '@sylphx/rosetta-drizzle';

export const { rosettaSources, rosettaTranslations } = createRosettaSchemaSQLite();
```

```ts [MySQL]
// db/schema.ts
import { createRosettaSchemaMySQL } from '@sylphx/rosetta-drizzle';

export const { rosettaSources, rosettaTranslations } = createRosettaSchemaMySQL();
```

:::

Run migration:

```bash
bun drizzle-kit push
```

## Step 2: Create Storage Adapter

```ts
// lib/rosetta/storage.ts
import { DrizzleStorageAdapter } from '@sylphx/rosetta-drizzle';
import { db } from '@/db';
import { rosettaSources, rosettaTranslations } from '@/db/schema';

export const storage = new DrizzleStorageAdapter({
  db,
  sources: rosettaSources,
  translations: rosettaTranslations,
});
```

## Step 3: Initialize Rosetta

```ts
// lib/rosetta/index.ts
import { Rosetta } from '@sylphx/rosetta-next/server';
import { storage } from './storage';

export const rosetta = new Rosetta({
  storage,
  defaultLocale: 'en',
});
```

## Step 4: Setup Layout

Wrap your app with `RosettaProvider`:

```tsx
// app/[locale]/layout.tsx
import { RosettaProvider } from '@sylphx/rosetta-next/server';
import { rosetta } from '@/lib/rosetta';

export default async function LocaleLayout({
  children,
  params,
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

## Step 5: Use Translations

### Server Components

```tsx
// app/[locale]/page.tsx
import { t } from '@sylphx/rosetta-next/server';

export default function Home() {
  return (
    <main>
      <h1>{t("Welcome to our app")}</h1>
      <p>{t("Get started by editing this page")}</p>
    </main>
  );
}
```

### Client Components

```tsx
// components/counter.tsx
'use client';

import { useState } from 'react';
import { useT } from '@sylphx/rosetta-next';

export function Counter() {
  const t = useT();
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      {t("Clicked {count} times", { count })}
    </button>
  );
}
```

## Step 6: Generate Translations

### Option A: CLI Extraction (Recommended)

Add to your build script:

```json
// package.json
{
  "scripts": {
    "build": "rosetta extract -o src/rosetta/manifest.ts && next build"
  }
}
```

### Option B: Admin Dashboard

Setup the admin API and use AI to generate translations:

```ts
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

## What's Next?

- [How It Works](/guide/how-it-works) - Understand the internals
- [Next.js Integration](/guide/next-js) - Advanced patterns
- [Admin Dashboard](/packages/rosetta-admin) - Build a translation UI
