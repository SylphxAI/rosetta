# @sylphx/rosetta-next

Next.js App Router integration with server and client components support.

## Installation

```bash
bun add @sylphx/rosetta-next
```

## Entry Points

| Entry | Description |
|-------|-------------|
| `@sylphx/rosetta-next` | Client-side (hooks, cookie utilities) |
| `@sylphx/rosetta-next/server` | Server-side (RosettaProvider) |
| `@sylphx/rosetta-next/locales` | Locale data and utilities |

## Server Components

### RosettaProvider

Async server component that sets up translation context:

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

### Props

| Prop | Type | Description |
|------|------|-------------|
| `rosetta` | `Rosetta` | Rosetta instance |
| `locale` | `string` | Current locale code |
| `children` | `ReactNode` | Child components |
| `hashes` | `string[]` | Optional: specific hashes to load |

### Fine-Grained Loading

Load only specific translations:

```tsx
<RosettaProvider
  rosetta={rosetta}
  locale={locale}
  hashes={['abc123', 'def456']}  // Only load these
>
  {children}
</RosettaProvider>
```

## Client Hooks

### useT()

Get the translation function:

```tsx
'use client';
import { useT } from '@sylphx/rosetta-next';

function MyComponent() {
  const t = useT();

  return (
    <div>
      <h1>{t("Welcome")}</h1>
      <p>{t("Hello {name}", { name: "World" })}</p>
      <button>{t("Submit", { context: "form" })}</button>
    </div>
  );
}
```

### useLocale()

Get the current locale:

```tsx
'use client';
import { useLocale } from '@sylphx/rosetta-next';

function LocaleDisplay() {
  const locale = useLocale();
  return <span>Current: {locale}</span>;  // "zh-TW"
}
```

### useDefaultLocale()

Get the default locale:

```tsx
'use client';
import { useDefaultLocale } from '@sylphx/rosetta-next';

function DefaultLocale() {
  const defaultLocale = useDefaultLocale();
  return <span>Default: {defaultLocale}</span>;  // "en"
}
```

### useTranslation()

Get the full context (locale + t function):

```tsx
'use client';
import { useTranslation } from '@sylphx/rosetta-next';

function MyComponent() {
  const { locale, defaultLocale, t } = useTranslation();

  return (
    <div>
      <p>Locale: {locale}</p>
      <p>{t("Hello")}</p>
    </div>
  );
}
```

## Locale Cookie

### setLocaleCookie()

Set locale preference in a cookie:

```tsx
'use client';
import { setLocaleCookie } from '@sylphx/rosetta-next';

function LanguageSwitcher() {
  const handleChange = (locale: string) => {
    setLocaleCookie(locale);
    window.location.reload();  // or use router.refresh()
  };

  return (
    <select onChange={(e) => handleChange(e.target.value)}>
      <option value="en">English</option>
      <option value="zh-TW">繁體中文</option>
    </select>
  );
}
```

### Options

```ts
setLocaleCookie(locale, {
  path: '/',           // Cookie path (default: '/')
  maxAge: 31536000,    // Max age in seconds (default: 1 year)
  sameSite: 'lax',     // SameSite attribute
  secure: true,        // Secure attribute
});
```

### getLocaleCookie()

Read locale from cookie (client-side):

```tsx
'use client';
import { getLocaleCookie } from '@sylphx/rosetta-next';

const savedLocale = getLocaleCookie();  // "zh-TW" or undefined
```

### clearLocaleCookie()

Remove locale cookie:

```tsx
import { clearLocaleCookie } from '@sylphx/rosetta-next';

clearLocaleCookie();
```

### Constants

```ts
import { LOCALE_COOKIE_NAME, LOCALE_COOKIE_MAX_AGE } from '@sylphx/rosetta-next';

LOCALE_COOKIE_NAME;   // 'locale'
LOCALE_COOKIE_MAX_AGE; // 31536000 (1 year)
```

## Server Locale Utilities

### getReadyLocales()

Get locales with translation progress:

```tsx
import { getReadyLocales } from '@sylphx/rosetta-next/server';

const locales = await getReadyLocales({
  storage: rosetta.getStorage(),
  minProgress: 0.8,  // Optional: minimum 80% translated
});

// Returns:
// [
//   { code: 'en', name: 'English', nativeName: 'English', progress: 1.0 },
//   { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', progress: 0.95 },
// ]
```

### buildLocaleCookie()

Create Set-Cookie header value:

```ts
import { buildLocaleCookie } from '@sylphx/rosetta-next/server';

const cookie = buildLocaleCookie('zh-TW');
// "locale=zh-TW; Path=/; Max-Age=31536000; SameSite=Lax"
```

### parseLocaleCookie()

Parse locale from cookie header:

```ts
import { parseLocaleCookie } from '@sylphx/rosetta-next/server';

const locale = parseLocaleCookie('locale=zh-TW; other=value');
// "zh-TW"
```

## Locale Data

### getAllLocales()

Get all supported locales:

```ts
import { getAllLocales } from '@sylphx/rosetta-next';

const locales = getAllLocales();
// [
//   { code: 'en', name: 'English', nativeName: 'English' },
//   { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
//   // ... 100+ locales
// ]
```

### getCommonLocales()

Get commonly used locales:

```ts
import { getCommonLocales } from '@sylphx/rosetta-next';

const common = getCommonLocales();
// ['en', 'zh-TW', 'zh-CN', 'ja', 'ko', 'es', 'fr', 'de', ...]
```

### getLocaleByCode()

Look up locale info by code:

```ts
import { getLocaleByCode } from '@sylphx/rosetta-next';

const locale = getLocaleByCode('zh-TW');
// { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' }
```

### searchLocales()

Search locales by name:

```ts
import { searchLocales } from '@sylphx/rosetta-next';

const results = searchLocales('chin');
// [
//   { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
//   { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
// ]
```

### isValidLocale()

Check if locale code is valid:

```ts
import { isValidLocale } from '@sylphx/rosetta-next';

isValidLocale('en');     // true
isValidLocale('zh-TW');  // true
isValidLocale('invalid'); // false
```

## RosettaClientProvider

For client-only apps (no server components):

```tsx
'use client';
import { RosettaClientProvider } from '@sylphx/rosetta-next';

export function App() {
  const translations = {
    'abc123': '你好',
    'def456': '世界',
  };

  return (
    <RosettaClientProvider
      locale="zh-TW"
      defaultLocale="en"
      translations={translations}
    >
      <MyApp />
    </RosettaClientProvider>
  );
}
```

## Types

### LocaleInfo

```ts
interface LocaleInfo {
  code: string;        // 'zh-TW'
  name: string;        // 'Chinese (Traditional)'
  nativeName: string;  // '繁體中文'
}
```

### TranslateFunction

```ts
type TranslateFunction = (
  text: string,
  paramsOrOptions?: Record<string, string | number> | TranslateOptions
) => string;
```

### TranslateOptions

```ts
interface TranslateOptions {
  context?: string;
  params?: Record<string, string | number>;
}
```

## Next Steps

- [Next.js Integration](/guide/next-js) - Full integration guide
- [Quick Start](/guide/quick-start) - Get started
- [Admin Dashboard](/packages/rosetta-admin) - Translation management
