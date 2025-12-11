# React Hooks

Client-side hooks from `@sylphx/rosetta-next`.

## useT()

Get the translation function in client components.

```ts
import { useT } from '@sylphx/rosetta-next';
```

### Signature

```ts
function useT(): TranslateFunction;

type TranslateFunction = (
  text: string,
  paramsOrOptions?: Record<string, string | number> | TranslateOptions
) => string;
```

### Usage

```tsx
'use client';

import { useT } from '@sylphx/rosetta-next';

function MyButton() {
  const t = useT();

  return (
    <button>
      {t("Click me")}
    </button>
  );
}
```

### With Parameters

```tsx
function Greeting({ name }: { name: string }) {
  const t = useT();

  return <p>{t("Hello {name}!", { name })}</p>;
}
```

### With Context

```tsx
function Form() {
  const t = useT();

  return (
    <form>
      <button type="submit">
        {t("Submit", { context: "form" })}
      </button>
    </form>
  );
}
```

### With Both

```tsx
function WelcomeMessage({ user }: { user: User }) {
  const t = useT();

  return (
    <p>
      {t("Welcome back, {name}!", {
        context: "greeting",
        params: { name: user.name }
      })}
    </p>
  );
}
```

---

## useLocale()

Get the current locale.

```ts
import { useLocale } from '@sylphx/rosetta-next';
```

### Signature

```ts
function useLocale(): string;
```

### Usage

```tsx
'use client';

import { useLocale } from '@sylphx/rosetta-next';

function LocaleDisplay() {
  const locale = useLocale();

  return <span>Current: {locale}</span>;
  // → "Current: zh-TW"
}
```

### With Locale-Specific Logic

```tsx
function DateDisplay({ date }: { date: Date }) {
  const locale = useLocale();

  return (
    <time>
      {date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </time>
  );
}
```

---

## useDefaultLocale()

Get the default/fallback locale.

```ts
import { useDefaultLocale } from '@sylphx/rosetta-next';
```

### Signature

```ts
function useDefaultLocale(): string;
```

### Usage

```tsx
'use client';

import { useDefaultLocale } from '@sylphx/rosetta-next';

function DefaultLocaleInfo() {
  const defaultLocale = useDefaultLocale();

  return <span>Default: {defaultLocale}</span>;
  // → "Default: en"
}
```

---

## useTranslation()

Get the full translation context.

```ts
import { useTranslation } from '@sylphx/rosetta-next';
```

### Signature

```ts
function useTranslation(): TranslationContextValue;

interface TranslationContextValue {
  locale: string;
  defaultLocale: string;
  t: TranslateFunction;
}
```

### Usage

```tsx
'use client';

import { useTranslation } from '@sylphx/rosetta-next';

function MyComponent() {
  const { locale, defaultLocale, t } = useTranslation();

  return (
    <div>
      <p>Locale: {locale}</p>
      <p>Default: {defaultLocale}</p>
      <p>{t("Hello")}</p>
    </div>
  );
}
```

---

## Cookie Hooks

### setLocaleCookie()

Set locale preference cookie.

```ts
import { setLocaleCookie } from '@sylphx/rosetta-next';
```

#### Signature

```ts
function setLocaleCookie(
  locale: string,
  options?: SetLocaleCookieOptions
): void;

interface SetLocaleCookieOptions {
  path?: string;      // default: '/'
  maxAge?: number;    // default: 1 year
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
}
```

#### Usage

```tsx
'use client';

import { setLocaleCookie } from '@sylphx/rosetta-next';
import { useRouter } from 'next/navigation';

function LanguageSwitcher() {
  const router = useRouter();

  const changeLocale = (locale: string) => {
    setLocaleCookie(locale);
    router.push(`/${locale}`);
    router.refresh();
  };

  return (
    <select onChange={(e) => changeLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="zh-TW">繁體中文</option>
    </select>
  );
}
```

### getLocaleCookie()

Read locale from cookie.

```ts
import { getLocaleCookie } from '@sylphx/rosetta-next';
```

#### Signature

```ts
function getLocaleCookie(): string | undefined;
```

#### Usage

```tsx
'use client';

import { getLocaleCookie } from '@sylphx/rosetta-next';

const savedLocale = getLocaleCookie();
// → "zh-TW" or undefined
```

### clearLocaleCookie()

Remove locale cookie.

```ts
import { clearLocaleCookie } from '@sylphx/rosetta-next';
```

#### Usage

```tsx
clearLocaleCookie();
```

---

## Locale Data Hooks

### getAllLocales()

Get all supported locales.

```ts
import { getAllLocales } from '@sylphx/rosetta-next';

const locales = getAllLocales();
// [{ code: 'en', name: 'English', nativeName: 'English' }, ...]
```

### getCommonLocales()

Get commonly used locales.

```ts
import { getCommonLocales } from '@sylphx/rosetta-next';

const common = getCommonLocales();
// [{ code: 'en', ... }, { code: 'zh-TW', ... }, ...]
```

### getLocaleByCode()

Look up locale info.

```ts
import { getLocaleByCode } from '@sylphx/rosetta-next';

const locale = getLocaleByCode('zh-TW');
// { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' }
```

### searchLocales()

Search locales by name.

```ts
import { searchLocales } from '@sylphx/rosetta-next';

const results = searchLocales('chin');
// [{ code: 'zh-CN', ... }, { code: 'zh-TW', ... }]
```

### isValidLocale()

Validate locale code.

```ts
import { isValidLocale } from '@sylphx/rosetta-next';

isValidLocale('en');      // true
isValidLocale('zh-TW');   // true
isValidLocale('invalid'); // false
```

---

## Types

```ts
import type {
  TranslateFunction,
  TranslateOptions,
  TranslationContextValue,
  LocaleInfo,
  SetLocaleCookieOptions,
} from '@sylphx/rosetta-next';
```

## See Also

- [t() Function](/api/t-function)
- [Next.js Integration](/guide/next-js)
- [@sylphx/rosetta-next](/packages/rosetta-next)
