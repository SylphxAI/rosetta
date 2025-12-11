# Next.js Integration

This guide covers advanced patterns for integrating Rosetta with Next.js App Router.

## Layout Structure

### Basic Locale Layout

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

### With Locale Validation

```tsx
// app/[locale]/layout.tsx
import { notFound } from 'next/navigation';
import { RosettaProvider, getReadyLocales } from '@sylphx/rosetta-next/server';
import { rosetta } from '@/lib/rosetta';

// Generate static params for supported locales
export async function generateStaticParams() {
  const locales = await getReadyLocales({ storage: rosetta.getStorage() });
  return locales.map((locale) => ({ locale: locale.code }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  const locales = await getReadyLocales({ storage: rosetta.getStorage() });
  const isValid = locales.some((l) => l.code === locale);
  if (!isValid) {
    notFound();
  }

  return (
    <RosettaProvider rosetta={rosetta} locale={locale}>
      <html lang={locale}>
        <body>{children}</body>
      </html>
    </RosettaProvider>
  );
}
```

## Server Components

### Using `t()` Function

```tsx
// app/[locale]/page.tsx
import { t } from '@sylphx/rosetta/server';

export default function HomePage() {
  return (
    <main>
      <h1>{t("Welcome to our app")}</h1>
      <p>{t("Get started by exploring our features")}</p>
    </main>
  );
}
```

### With Parameters

```tsx
import { t } from '@sylphx/rosetta/server';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <div>
      <h1>{t("Welcome back, {name}!", { name: username })}</h1>
      <p>{t("You have {count} new messages", { count: 5 })}</p>
    </div>
  );
}
```

### With Context for Disambiguation

```tsx
import { t } from '@sylphx/rosetta/server';

export default function SettingsPage() {
  return (
    <div>
      {/* Same text, different contexts → different translations */}
      <button>{t("Save", { context: "button" })}</button>
      <h2>{t("Save", { context: "section-title" })}</h2>
    </div>
  );
}
```

## Client Components

### Using `useT()` Hook

```tsx
// components/counter.tsx
'use client';

import { useState } from 'react';
import { useT } from '@sylphx/rosetta-next';

export function Counter() {
  const t = useT();
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>{t("Current count: {count}", { count })}</p>
      <button onClick={() => setCount(c => c + 1)}>
        {t("Increment")}
      </button>
      <button onClick={() => setCount(0)}>
        {t("Reset")}
      </button>
    </div>
  );
}
```

### Accessing Locale

```tsx
'use client';

import { useLocale, useDefaultLocale } from '@sylphx/rosetta-next';

export function LocaleInfo() {
  const locale = useLocale();
  const defaultLocale = useDefaultLocale();

  return (
    <div>
      <p>Current: {locale}</p>
      <p>Default: {defaultLocale}</p>
    </div>
  );
}
```

## Language Switcher

### Using Cookies

```tsx
// components/language-switcher.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useLocale, setLocaleCookie, getCommonLocales } from '@sylphx/rosetta-next';

export function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();
  const locales = getCommonLocales();

  const handleChange = (newLocale: string) => {
    setLocaleCookie(newLocale);
    router.push(`/${newLocale}`);
    router.refresh();
  };

  return (
    <select
      value={currentLocale}
      onChange={(e) => handleChange(e.target.value)}
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

### Reading Locale from Cookie

```tsx
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { LOCALE_COOKIE_NAME } from '@sylphx/rosetta-next';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip if already has locale
  if (pathname.match(/^\/(en|zh|ja|ko)\//)) {
    return NextResponse.next();
  }

  // Get locale from cookie or Accept-Language header
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  const headerLocale = request.headers.get('Accept-Language')?.split(',')[0]?.split('-')[0];
  const locale = cookieLocale || headerLocale || 'en';

  // Redirect to localized path
  return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
```

## Metadata

### Localized Metadata

```tsx
// app/[locale]/page.tsx
import { t } from '@sylphx/rosetta/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: t("My App - Home"),
    description: t("Welcome to our application"),
    openGraph: {
      title: t("My App - Home"),
      description: t("Welcome to our application"),
      locale,
    },
  };
}

export default function HomePage() {
  return <main>{/* ... */}</main>;
}
```

## Fine-Grained Loading

### Load Only Required Translations

For large apps, you can load only the translations needed for a specific page:

```tsx
// app/[locale]/dashboard/page.tsx
import { RosettaProvider } from '@sylphx/rosetta-next/server';
import { rosetta } from '@/lib/rosetta';
import { manifest } from '@/rosetta/manifest';

// Filter hashes for this route
const dashboardHashes = manifest
  .filter(entry => entry.route?.startsWith('/dashboard'))
  .map(entry => entry.hash);

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <RosettaProvider
      rosetta={rosetta}
      locale={locale}
      hashes={dashboardHashes}  // Only load these
    >
      {children}
    </RosettaProvider>
  );
}
```

## API Routes

### Server Actions with Translations

```tsx
// app/actions.ts
'use server';

import { t, getLocale } from '@sylphx/rosetta/server';

export async function submitForm(formData: FormData) {
  const locale = getLocale();

  // Validate
  const email = formData.get('email');
  if (!email) {
    return { error: t("Email is required") };
  }

  // Process...

  return { success: t("Form submitted successfully") };
}
```

### Route Handlers

```ts
// app/api/greeting/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rosetta } from '@/lib/rosetta';

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') || 'en';

  const translations = await rosetta.loadTranslations(locale);
  const hash = rosetta.hashText("Hello, World!");
  const greeting = translations.get(hash) || "Hello, World!";

  return NextResponse.json({ greeting });
}
```

## Edge Runtime

Rosetta is fully compatible with Edge Runtime:

```tsx
// app/[locale]/layout.tsx
export const runtime = 'edge';

import { RosettaProvider } from '@sylphx/rosetta-next/server';
import { rosetta } from '@/lib/rosetta';

// Works the same way - no Node.js APIs used
export default async function Layout({ children, params }) {
  // ...
}
```

**Requirements for Edge:**
- Use CLI extraction (not runtime collection)
- Use a database that supports Edge (Neon, PlanetScale, Turso)
- No `node:` imports

## Next Steps

- [Deployment](/guide/deployment) - Production considerations
- [Admin Dashboard](/packages/rosetta-admin) - Translation management
- [Caching](/advanced/caching) - Performance optimization
