---
"@sylphx/rosetta-drizzle": minor
---

feat: Support custom table names in schema creators

All database schema creators now support custom table names via options:

```ts
// PostgreSQL
const { rosettaSources, rosettaTranslations } = createRosettaSchema({
  sourcesTable: 'i18n_sources',
  translationsTable: 'i18n_translations',
});

// SQLite
const { rosettaSources, rosettaTranslations } = createRosettaSchemaSQLite({
  sourcesTable: 'my_sources',
  translationsTable: 'my_translations',
});

// MySQL
const { rosettaSources, rosettaTranslations } = createRosettaSchemaMySQL({
  sourcesTable: 'custom_sources',
  translationsTable: 'custom_translations',
});
```

Default table names (`rosetta_sources`, `rosetta_translations`) are used when options are omitted.
