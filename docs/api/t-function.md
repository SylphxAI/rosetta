# t() Function

The translation function for server components.

## Import

```ts
import { t } from '@sylphx/rosetta-next/server';
```

## Signature

```ts
function t(
  text: string,
  paramsOrOptions?: Record<string, string | number> | TranslateOptions
): string;
```

## Parameters

### text

The source text to translate (English).

```ts
t("Hello World")
```

### paramsOrOptions

Either interpolation parameters or options object:

```ts
// Just parameters
t("Hello {name}", { name: "World" })

// Options object
t("Submit", { context: "button" })

// Both
t("Hello {name}", { params: { name: "World" }, context: "greeting" })
```

## TranslateOptions

```ts
interface TranslateOptions {
  /** Context for disambiguation */
  context?: string;

  /** Interpolation parameters */
  params?: Record<string, string | number>;
}
```

## Usage

### Basic Translation

```ts
import { t } from '@sylphx/rosetta-next/server';

function ServerComponent() {
  return <h1>{t("Welcome to our app")}</h1>;
}
```

### With Parameters

```ts
// Simple interpolation
t("Hello {name}!", { name: user.name })
// → "Hello John!"

// Multiple parameters
t("Created by {author} on {date}", { author: "John", date: "2024-01-01" })
// → "Created by John on 2024-01-01"
```

### With Context

Disambiguate same text in different contexts:

```ts
// Same text, different translations
t("Post", { context: "noun.blog" })   // → "文章" (Chinese)
t("Post", { context: "verb.action" }) // → "發布" (Chinese)

// Common contexts
t("Save", { context: "button" })
t("Save", { context: "menu" })
t("Save", { context: "keyboard-shortcut" })
```

### With Both

```ts
t("Welcome back, {name}!", {
  context: "greeting",
  params: { name: user.name }
})
```

### ICU MessageFormat

```ts
// Pluralization
t("{count, plural, =0 {No items} one {# item} other {# items}}", { count: 5 })
// → "5 items"

// Select
t("{gender, select, male {He} female {She} other {They}} liked this", { gender: 'female' })
// → "She liked this"
```

## Behavior

### Fallback Chain

If translation not found:
1. Try exact locale (e.g., `zh-TW`)
2. Try language code (e.g., `zh`)
3. Try default locale (e.g., `en`)
4. Return original text

### Outside Context

When called outside `RosettaProvider`:

```ts
// Outside context - returns original text
t("Hello World")  // → "Hello World"
```

No error is thrown; it gracefully falls back.

### Hashing

Text is hashed for lookup:

```ts
t("Hello World")
// → hash("Hello World") → "a1b2c3d4"
// → translations.get("a1b2c3d4")

t("Hello World", { context: "greeting" })
// → hash("greeting::Hello World") → "e5f6g7h8"
// → translations.get("e5f6g7h8")
```

## Related Functions

### getLocale()

Get current locale:

```ts
import { getLocale } from '@sylphx/rosetta-next/server';

const locale = getLocale();  // "zh-TW"
```

### getLocaleChain()

Get fallback chain:

```ts
import { getLocaleChain } from '@sylphx/rosetta-next/server';

const chain = getLocaleChain();  // ["zh-TW", "zh", "en"]
```

### getDefaultLocale()

Get default locale:

```ts
import { getDefaultLocale } from '@sylphx/rosetta-next/server';

const defaultLocale = getDefaultLocale();  // "en"
```

### isInsideRosettaContext()

Check if inside context:

```ts
import { isInsideRosettaContext } from '@sylphx/rosetta-next/server';

if (isInsideRosettaContext()) {
  // Safe to use t()
}
```

### getRosettaContext()

Get full context object:

```ts
import { getRosettaContext } from '@sylphx/rosetta-next/server';

const ctx = getRosettaContext();
// { locale, defaultLocale, localeChain, translations, storage }
```

## Best Practices

### Use Descriptive Text

```ts
// ✅ Good - self-documenting
t("Sign in to your account")

// ❌ Bad - unclear
t("sign_in")
```

### Add Context for Ambiguous Text

```ts
// ✅ Good - clear context
t("Save", { context: "button.save-document" })

// ❌ Bad - ambiguous
t("Save")
```

### Keep Text Consistent

```ts
// ✅ Good - consistent
t("Sign In")  // Use everywhere
t("Sign In")

// ❌ Bad - inconsistent
t("Sign In")
t("Sign in")  // Different hash!
t("Log In")   // Different text
```

### Use Parameters for Dynamic Content

```ts
// ✅ Good - parameterized
t("Welcome, {name}!", { name: user.name })

// ❌ Bad - dynamic string
t(`Welcome, ${user.name}!`)  // Won't be extracted!
```

## TypeScript

```ts
import type { TranslateFunction, TranslateOptions } from '@sylphx/rosetta-next/server';

// Type-safe usage
const text: string = t("Hello");

// With options
const options: TranslateOptions = {
  context: "button",
  params: { count: 5 },
};
t("Submit", options);
```

## See Also

- [useT() Hook](/api/hooks#uset)
- [ICU Format](/advanced/icu-format)
- [How It Works](/guide/how-it-works)
