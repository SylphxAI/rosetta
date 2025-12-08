---
"@sylphx/rosetta-next": minor
---

feat(rosetta-next): add locale utilities for language picker

New server utilities:
- `getReadyLocales(rosetta, config)` - Get locales with translation coverage stats
- `LocaleConfig` type - Define locale names, native names, and min coverage thresholds
- `buildLocaleCookie()` / `parseLocaleCookie()` - Server-side cookie helpers

New client utilities:
- `setLocaleCookie(locale)` - Set locale preference and optionally reload
- `getLocaleCookie()` - Read current locale preference
- `clearLocaleCookie()` - Clear locale preference
