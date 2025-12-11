# ICU MessageFormat

Rosetta supports ICU MessageFormat for complex localization patterns.

## Basic Syntax

### Variable Interpolation

```ts
t("Hello {name}!", { name: "World" })
// → "Hello World!"

t("You have {count} items", { count: 5 })
// → "You have 5 items"
```

## Plural Rules

Handle singular/plural forms based on count:

```ts
t("{count, plural, =0 {No messages} one {# message} other {# messages}}", { count: 0 })
// → "No messages"

t("{count, plural, =0 {No messages} one {# message} other {# messages}}", { count: 1 })
// → "1 message"

t("{count, plural, =0 {No messages} one {# message} other {# messages}}", { count: 5 })
// → "5 messages"
```

### Plural Categories

ICU defines these plural categories (varies by language):

| Category | Description | Example (English) |
|----------|-------------|-------------------|
| `zero` | Zero items | Some languages use this |
| `one` | Singular | 1 |
| `two` | Dual | Some languages (Arabic) |
| `few` | Few items | Some languages (Polish) |
| `many` | Many items | Some languages |
| `other` | Default | 0, 2, 3, 4, ... |

### Exact Match

Use `=N` for exact values:

```ts
t("{count, plural, =0 {None} =1 {One} =2 {A couple} other {Many}}", { count: 2 })
// → "A couple"
```

### The `#` Symbol

`#` is replaced with the actual number:

```ts
t("{count, plural, one {# item} other {# items}}", { count: 42 })
// → "42 items"
```

## Select

Choose text based on a string value:

```ts
t("{gender, select, male {He} female {She} other {They}} liked your post", { gender: 'female' })
// → "She liked your post"

t("{role, select, admin {Administrator} user {User} guest {Guest} other {Unknown}}", { role: 'admin' })
// → "Administrator"
```

## Nesting

Combine patterns:

```ts
t("{gender, select, male {He has {count, plural, one {# item} other {# items}}} female {She has {count, plural, one {# item} other {# items}}} other {They have {count, plural, one {# item} other {# items}}}}", { gender: 'male', count: 3 })
// → "He has 3 items"
```

## Escaping

Use single quotes to escape special characters:

```ts
t("This '{isn''t}' special")
// → "This {isn't} special"

t("Price: '{price}'")
// → "Price: {price}" (literal, not interpolated)
```

## Language-Specific Plurals

### English (simple)

```ts
// one, other
"{count, plural, one {# day} other {# days}}"
```

### Chinese (no plural)

```ts
// Chinese doesn't have plural forms
// Same text for all counts
"{count, plural, other {# 天}}"
```

### Russian (complex)

```ts
// one, few, many, other
"{count, plural, one {# день} few {# дня} many {# дней} other {# дня}}"
```

### Arabic (complex)

```ts
// zero, one, two, few, many, other
"{count, plural, zero {لا أيام} one {يوم واحد} two {يومان} few {# أيام} many {# يومًا} other {# يوم}}"
```

## Real-World Examples

### File Count

```ts
const message = t("{count, plural, =0 {No files} one {# file} other {# files}} selected", { count: files.length });
```

### Time Ago

```ts
function timeAgo(minutes: number) {
  if (minutes < 60) {
    return t("{count, plural, one {# minute ago} other {# minutes ago}}", { count: minutes });
  }
  const hours = Math.floor(minutes / 60);
  return t("{count, plural, one {# hour ago} other {# hours ago}}", { count: hours });
}
```

### User Greeting

```ts
const greeting = t("{time, select, morning {Good morning} afternoon {Good afternoon} evening {Good evening} other {Hello}}, {name}!", {
  time: getTimeOfDay(),
  name: user.name,
});
```

### Shopping Cart

```ts
const cartMessage = t("{count, plural, =0 {Your cart is empty} one {# item in cart} other {# items in cart}}", { count: cart.items.length });
```

### Review Summary

```ts
const reviewText = t("{count, plural, =0 {No reviews yet} one {# review} other {# reviews}}", { count: reviews });
```

## API

### formatMessage()

```ts
import { formatMessage } from '@sylphx/rosetta/icu';

const result = formatMessage(
  pattern,      // ICU pattern string
  params,       // { key: value } parameters
  options       // { locale, pluralRulesCache, onError }
);
```

### Options

```ts
interface FormatMessageOptions {
  /** Locale for plural rules (e.g., 'en', 'zh-TW') */
  locale: string;

  /** Shared PluralRules cache for performance */
  pluralRulesCache?: PluralRulesCache;

  /** Error handler */
  onError?: (error: Error, context: string) => void;
}
```

### PluralRules Cache

Reuse `Intl.PluralRules` instances:

```ts
import { createPluralRulesCache, formatMessage } from '@sylphx/rosetta/icu';

const cache = createPluralRulesCache({ maxSize: 50 });

// Use across multiple formatMessage calls
formatMessage(pattern1, params1, { locale: 'en', pluralRulesCache: cache });
formatMessage(pattern2, params2, { locale: 'en', pluralRulesCache: cache });
```

## Security Limits

To prevent DoS attacks via malicious patterns:

```ts
const ICU_LIMITS = {
  maxDepth: 5,           // Maximum nesting depth
  maxIterations: 100,    // Maximum parser iterations
  maxTextLength: 50000,  // Maximum input length
};
```

Exceeding limits throws an error (gracefully handled by `t()`).

## Common Mistakes

### Missing `other` Category

```ts
// ❌ Wrong - missing 'other'
"{count, plural, one {# item}}"

// ✅ Correct
"{count, plural, one {# item} other {# items}}"
```

### Wrong Parameter Type

```ts
// ❌ Wrong - plural needs a number
t("{count, plural, one {#} other {#}}", { count: "5" })

// ✅ Correct
t("{count, plural, one {#} other {#}}", { count: 5 })
```

### Unescaped Braces

```ts
// ❌ Wrong - braces interpreted as placeholders
t("CSS: {color: red}")

// ✅ Correct - escaped
t("CSS: '{color: red}'")
```

## Debugging

Enable error logging:

```ts
formatMessage(pattern, params, {
  locale: 'en',
  onError: (error, context) => {
    console.error(`[ICU ${context}] ${error.message}`);
    console.error(`Pattern: ${pattern}`);
    console.error(`Params:`, params);
  },
});
```

## Next Steps

- [t() Function API](/api/t-function) - Translation function
- [How It Works](/guide/how-it-works) - Architecture
- [Quick Start](/guide/quick-start) - Get started
