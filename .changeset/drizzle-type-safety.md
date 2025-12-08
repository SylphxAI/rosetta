---
"@sylphx/rosetta-drizzle": minor
"@sylphx/rosetta": minor
---

refactor: Improve type safety and extract shared ICU formatter

**@sylphx/rosetta:**
- New `@sylphx/rosetta/icu` entry point for shared ICU MessageFormat implementation
- Exports: `formatMessage`, `createPluralRulesCache`, `getPluralCategory`
- Consistent security limits across server/client (depth=5, length=50KB, iterations=100)
- Server uses 50-entry LRU cache, client uses 10-entry cache

**@sylphx/rosetta-drizzle:**
- Generic type parameters for tables (`DrizzleStorageAdapter<S, T>`)
- Runtime validation for required columns at construction time
- New type exports: `DrizzleQueryBuilder`, `SourcesTable`, `TranslationsTable`
- Removed unsafe `any` casts in favor of proper type constraints
- Clear error messages when table schema is incompatible
