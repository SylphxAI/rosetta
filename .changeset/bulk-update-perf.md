---
"@sylphx/rosetta-drizzle": patch
---

Performance: Replace N+1 queries with bulk operations

- `registerSources`: Single UPDATE for occurrence increments instead of N parallel queries
- `saveTranslations`: Single bulk INSERT ... ON CONFLICT UPDATE instead of N parallel calls
