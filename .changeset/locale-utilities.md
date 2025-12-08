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

New locale data (`@sylphx/rosetta-next/locales` or main export):
- `ALL_LOCALES` - Complete list of 130+ world languages with codes, names, and native names
- `COMMON_LOCALES` - Top 30 languages by internet usage
- `getAllLocales()` / `getCommonLocales()` - Get locale lists
- `getLocaleByCode(code)` - Find specific locale info
- `searchLocales(query)` - Search by name or native name
- `isValidLocale(code)` - Validate locale codes
