---
"@sylphx/rosetta-drizzle": patch
---

Fix: Add unique constraint on (locale, hash) for SQLite schema

SQLite was missing the unique constraint that PostgreSQL and MySQL schemas already had.
This ensures proper upsert behavior with ON CONFLICT.
