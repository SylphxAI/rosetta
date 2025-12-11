# Basic Setup Example

Complete example of setting up Rosetta in a Next.js App Router project.

## Project Structure

```
my-app/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx      # RosettaProvider
│   │   └── page.tsx        # Server component
│   └── api/
│       └── admin/
│           └── translations/
│               └── route.ts # Admin API
├── components/
│   └── counter.tsx         # Client component
├── db/
│   ├── index.ts            # Database connection
│   └── schema.ts           # Drizzle schema
├── lib/
│   └── rosetta/
│       ├── index.ts        # Rosetta instance
│       └── storage.ts      # Storage adapter
└── middleware.ts           # Locale detection
```

## Database Schema

```ts
// db/schema.ts
import { createRosettaSchema } from '@sylphx/rosetta-drizzle';

// Rosetta tables
export const { rosettaSources, rosettaTranslations } = createRosettaSchema();

// Your other tables...
import { pgTable, text, serial, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

## Database Connection

```ts
// db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
```

## Storage Adapter

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

## Rosetta Instance

```ts
// lib/rosetta/index.ts
import { Rosetta, InMemoryCache } from '@sylphx/rosetta/server';
import { storage } from './storage';

export const rosetta = new Rosetta({
  storage,
  defaultLocale: 'en',
  cache: new InMemoryCache({
    ttlMs: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50,
  }),
});
```

## Layout with RosettaProvider

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

// Generate static params for supported locales
export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'zh-TW' }, { locale: 'ja' }];
}
```

## Server Component

```tsx
// app/[locale]/page.tsx
import { t } from '@sylphx/rosetta/server';
import { Counter } from '@/components/counter';

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">
        {t("Welcome to our app")}
      </h1>
      <p className="mb-8">
        {t("Get started by exploring our features")}
      </p>

      <section>
        <h2 className="text-xl font-semibold mb-2">
          {t("Interactive Counter")}
        </h2>
        <Counter />
      </section>
    </main>
  );
}
```

## Client Component

```tsx
// components/counter.tsx
'use client';

import { useState } from 'react';
import { useT } from '@sylphx/rosetta-next';

export function Counter() {
  const t = useT();
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => setCount(c => c - 1)}
        className="px-4 py-2 bg-gray-200 rounded"
      >
        {t("Decrease")}
      </button>

      <span className="text-xl font-mono">
        {t("{count, plural, =0 {Zero} one {# item} other {# items}}", { count })}
      </span>

      <button
        onClick={() => setCount(c => c + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {t("Increase")}
      </button>

      <button
        onClick={() => setCount(0)}
        className="px-4 py-2 bg-gray-500 text-white rounded"
      >
        {t("Reset")}
      </button>
    </div>
  );
}
```

## Middleware (Locale Detection)

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { LOCALE_COOKIE_NAME } from '@sylphx/rosetta-next';

const SUPPORTED_LOCALES = ['en', 'zh-TW', 'ja'];
const DEFAULT_LOCALE = 'en';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip if already has locale prefix
  const hasLocale = SUPPORTED_LOCALES.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (hasLocale) {
    return NextResponse.next();
  }

  // Skip API routes and static files
  if (pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Detect locale
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  const headerLocale = request.headers
    .get('Accept-Language')
    ?.split(',')[0]
    ?.split('-')[0];

  let locale = DEFAULT_LOCALE;

  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    locale = cookieLocale;
  } else if (headerLocale && SUPPORTED_LOCALES.includes(headerLocale)) {
    locale = headerLocale;
  }

  // Redirect to localized path
  return NextResponse.redirect(
    new URL(`/${locale}${pathname}`, request.url)
  );
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
```

## Language Switcher

```tsx
// components/language-switcher.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale, setLocaleCookie, getCommonLocales } from '@sylphx/rosetta-next';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const locales = getCommonLocales().filter(l =>
    ['en', 'zh-TW', 'ja'].includes(l.code)
  );

  const handleChange = (newLocale: string) => {
    setLocaleCookie(newLocale);

    // Replace locale in pathname
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');

    router.push(newPath);
    router.refresh();
  };

  return (
    <select
      value={currentLocale}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-1 border rounded"
    >
      {locales.map((locale) => (
        <option key={locale.code} value={locale.code}>
          {locale.nativeName}
        </option>
      ))}
    </select>
  );
}
```

## Admin API

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
    batchSize: 30,
  }),
});

export const { GET, PUT, PATCH } = handlers;
```

## Environment Variables

```bash
# .env.local

# Database
DATABASE_URL=postgresql://...

# AI Translation
OPENROUTER_API_KEY=sk-or-...
```

## package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "rosetta extract -o src/rosetta/manifest.ts && next build",
    "start": "next start",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Run It

```bash
# Install dependencies
bun install

# Push database schema
bun db:push

# Start development
bun dev

# Visit http://localhost:3000
```

## Next Steps

- [Admin Dashboard](/examples/admin-dashboard) - Build translation UI
- [Custom Storage](/examples/custom-storage) - Custom adapter
- [Deployment](/guide/deployment) - Production setup
