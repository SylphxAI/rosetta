# Changelog

## 1.0.0

### Minor Changes

- 8abda25: refactor: Improve type safety, add validation, and comprehensive testing

  **@sylphx/rosetta:**

  - New `@sylphx/rosetta/icu` entry point for shared ICU MessageFormat implementation
  - New validation module with input size limits (10KB max text, 1000 batch size)
  - Exports: `validateText`, `validateLocale`, `assertValidText`, etc.
  - Consistent security limits across server/client (depth=5, length=50KB, iterations=100)
  - Server uses 50-entry LRU cache, client uses 10-entry cache
  - OpenRouter adapter now has configurable timeout (default 30s)

  **@sylphx/rosetta-drizzle:**

  - Generic type parameters for tables (`DrizzleStorageAdapter<S, T>`)
  - Runtime validation for required columns at construction time
  - New type exports: `DrizzleQueryBuilder`, `SourcesTable`, `TranslationsTable`
  - Fix: `registerSources` now correctly increments occurrences for existing sources
  - 34 comprehensive tests with bun:sqlite in-memory database

  **@sylphx/rosetta-next:**

  - `MANIFEST_DIR` now reads env at runtime (testability improvement)
  - 36 comprehensive tests for loader extraction and sync functionality
  - Tests cover: t() extraction, manifest ops, sync to storage, lock handling

- 3d6ce17: feat: Support custom table names in schema creators

  All database schema creators now support custom table names via options:

  ```ts
  // PostgreSQL
  const { rosettaSources, rosettaTranslations } = createRosettaSchema({
    sourcesTable: "i18n_sources",
    translationsTable: "i18n_translations",
  });

  // SQLite
  const { rosettaSources, rosettaTranslations } = createRosettaSchemaSQLite({
    sourcesTable: "my_sources",
    translationsTable: "my_translations",
  });

  // MySQL
  const { rosettaSources, rosettaTranslations } = createRosettaSchemaMySQL({
    sourcesTable: "custom_sources",
    translationsTable: "custom_translations",
  });
  ```

  Default table names (`rosetta_sources`, `rosetta_translations`) are used when options are omitted.

### Patch Changes

- 37c7541: Performance: Replace N+1 queries with bulk operations

  - `registerSources`: Single UPDATE for occurrence increments instead of N parallel queries
  - `saveTranslations`: Single bulk INSERT ... ON CONFLICT UPDATE instead of N parallel calls

- 2c2d43d: Fix: Add unique constraint on (locale, hash) for SQLite schema

  SQLite was missing the unique constraint that PostgreSQL and MySQL schemas already had.
  This ensures proper upsert behavior with ON CONFLICT.

- Updated dependencies [5b58cae]
- Updated dependencies [8abda25]
- Updated dependencies [e9a4fe3]
- Updated dependencies [d7f08b6]
- Updated dependencies [96e2d0f]
  - @sylphx/rosetta@0.2.0

## 0.1.9 (2025-12-08)

### ✨ Features

- **rosetta:** add source override and staleness detection ([540c04d](https://github.com/SylphxAI/rosetta/commit/540c04daedebe3b730b35ccecd4cb43dc518450f))

## 0.1.8 (2025-12-08)

### 🐛 Bug Fixes

- **rosetta-drizzle:** simplify table types for Drizzle compatibility ([c38bae0](https://github.com/SylphxAI/rosetta/commit/c38bae09babfddd7d9ce55e4bf9752956669ca55))

## 0.1.7 (2025-12-08)

### ✨ Features

- **rosetta-drizzle:** support custom table names in schema creators ([3d6ce17](https://github.com/SylphxAI/rosetta/commit/3d6ce17d86b5eea7d8a88032f4cc623612e825ea))

### 🐛 Bug Fixes

- **rosetta-next,rosetta-drizzle:** security and performance hardening ([2c2d43d](https://github.com/SylphxAI/rosetta/commit/2c2d43d27d4db579bc94c5aee238ca5131df2228))

### ⚡️ Performance

- **rosetta-drizzle:** replace N+1 queries with bulk operations ([37c7541](https://github.com/SylphxAI/rosetta/commit/37c7541d78675f7b013e55c37e19f86c32c235f7))

### ♻️ Refactoring

- improve DrizzleAdapter type safety and shared ICU module ([8abda25](https://github.com/SylphxAI/rosetta/commit/8abda25f533f3ae5695282b9cc6e325f2d914a61))

### 💅 Styles

- fix lint formatting ([651be20](https://github.com/SylphxAI/rosetta/commit/651be2074c18d9a127e30c77eef18ea3fbe6cdbe))

### ✅ Tests

- **rosetta-drizzle:** add comprehensive adapter tests ([01d58ec](https://github.com/SylphxAI/rosetta/commit/01d58ec82c99ee99c2ff2e6b3720820847330d37))

## 0.1.6 (2025-12-08)

### ✨ Features

- **rosetta-drizzle:** support custom table names in schema creators ([3d6ce17](https://github.com/SylphxAI/rosetta/commit/3d6ce17d86b5eea7d8a88032f4cc623612e825ea))

### 🐛 Bug Fixes

- **rosetta-next,rosetta-drizzle:** security and performance hardening ([2c2d43d](https://github.com/SylphxAI/rosetta/commit/2c2d43d27d4db579bc94c5aee238ca5131df2228))

### ⚡️ Performance

- **rosetta-drizzle:** replace N+1 queries with bulk operations ([37c7541](https://github.com/SylphxAI/rosetta/commit/37c7541d78675f7b013e55c37e19f86c32c235f7))

### ♻️ Refactoring

- improve DrizzleAdapter type safety and shared ICU module ([8abda25](https://github.com/SylphxAI/rosetta/commit/8abda25f533f3ae5695282b9cc6e325f2d914a61))

### 💅 Styles

- fix lint formatting ([651be20](https://github.com/SylphxAI/rosetta/commit/651be2074c18d9a127e30c77eef18ea3fbe6cdbe))

### ✅ Tests

- **rosetta-drizzle:** add comprehensive adapter tests ([01d58ec](https://github.com/SylphxAI/rosetta/commit/01d58ec82c99ee99c2ff2e6b3720820847330d37))

## 0.1.5 (2025-12-07)

### 🐛 Bug Fixes

- **rosetta-drizzle:** proper type inference with tsup ([eb9f8a5](https://github.com/SylphxAI/rosetta/commit/eb9f8a5a4254bdbca1e108953e59e8a34bdaeb89))

## 0.1.4 (2025-12-07)

Export schema helpers from main entry to avoid drizzle-kit ESM issues

### ✨ Features

- **rosetta-drizzle:** export schema helpers from main entry ([f6a7e55](https://github.com/SylphxAI/rosetta/commit/f6a7e559673aae6c18659fddcb7a65cd5f32ad67))

## 0.1.3 (2025-12-07)

Fix DrizzleDatabase type contravariance issue

### 🐛 Bug Fixes

- **rosetta-drizzle:** use any for DrizzleDatabase method args ([906614e](https://github.com/SylphxAI/rosetta/commit/906614e14d04b5b6fd05b2bf944742b9e41a036d))

## 0.1.2 (2025-12-07)

Fix type constraints for Drizzle table compatibility

### 🐛 Bug Fixes

- **rosetta-drizzle:** use permissive types for better drizzle compatibility ([1331c5c](https://github.com/SylphxAI/rosetta/commit/1331c5c6c935cff1753f17e9af13923f8799999a))

## 0.1.1 (2025-12-07)

Update drizzle-orm to 0.45.0 for better type compatibility

### 🔧 Chores

- **rosetta-drizzle:** update drizzle-orm to 0.45.0 ([27eb139](https://github.com/SylphxAI/rosetta/commit/27eb139ee09ff1e5848805b96f8e14243b78b8a7))

## 0.1.0 (2025-12-07)

### ✨ Features

- add fine-grained translation loading (optional) ([85e7a24](https://github.com/SylphxAI/rosetta/commit/85e7a24e4e8812531d054bb923cbdc152b23fc1a))

### 🐛 Bug Fixes

- **types:** resolve TypeScript declaration emit errors for CI ([f3bebcd](https://github.com/SylphxAI/rosetta/commit/f3bebcd8c68c07a83988ae7b0f867e3f7f0d37f6))
- **rosetta-drizzle:** use explicit property syntax for declaration emit ([3d1c9ff](https://github.com/SylphxAI/rosetta/commit/3d1c9ff6ee34523e947042b7f08314c1645320ce))
- comprehensive architecture improvements ([555a8f2](https://github.com/SylphxAI/rosetta/commit/555a8f2c27214d575e561ab3ea9c1edca37ea938))
- replace remaining lingua references with rosetta ([5a28967](https://github.com/SylphxAI/rosetta/commit/5a28967ec1962a6e69266b42fe993aa092fe6af1))

### ⚡️ Performance

- **rosetta-drizzle:** parallelize registerSources occurrence updates ([0ad15bb](https://github.com/SylphxAI/rosetta/commit/0ad15bb0059ed5c57e0090f141d13fa75ceb98c7))
- **rosetta-drizzle:** parallelize saveTranslations batch operation ([4af751a](https://github.com/SylphxAI/rosetta/commit/4af751a06647cd3e13e8e0e4fe73868250e7ac89))

### ♻️ Refactoring

- 💥 unify client/server to use hash-based lookup ([93d2e5b](https://github.com/SylphxAI/rosetta/commit/93d2e5b008d65ca121bc5940e96d26c9b77f7a34))
- 💥 rename I18n to Rosetta for consistent branding ([993d193](https://github.com/SylphxAI/rosetta/commit/993d193b9e867fc21edc87ebb490f31800c4fb99))
- 💥 remove enabledLocales, discover languages from DB ([479c441](https://github.com/SylphxAI/rosetta/commit/479c441f1aca0b81158bf8ce11052e10b0b4b8a4))
- 💥 rename packages from lingua to rosetta ([0daf9aa](https://github.com/SylphxAI/rosetta/commit/0daf9aa6be1bbe2aa5e5371e54576ee56641866e))

### 💥 Breaking Changes

- unify client/server to use hash-based lookup ([93d2e5b](https://github.com/SylphxAI/rosetta/commit/93d2e5b008d65ca121bc5940e96d26c9b77f7a34))
  Client now uses hash-based lookup (same as server)
- rename I18n to Rosetta for consistent branding ([993d193](https://github.com/SylphxAI/rosetta/commit/993d193b9e867fc21edc87ebb490f31800c4fb99))
  All I18n-related names changed to Rosetta
- remove enabledLocales, discover languages from DB ([479c441](https://github.com/SylphxAI/rosetta/commit/479c441f1aca0b81158bf8ce11052e10b0b4b8a4))
  enabledLocales config removed
- rename packages from lingua to rosetta ([0daf9aa](https://github.com/SylphxAI/rosetta/commit/0daf9aa6be1bbe2aa5e5371e54576ee56641866e))
  All package names have changed

## 0.1.0 (2025-12-07)

### ✨ Features

- add fine-grained translation loading (optional) ([85e7a24](https://github.com/SylphxAI/rosetta/commit/85e7a24e4e8812531d054bb923cbdc152b23fc1a))

### 🐛 Bug Fixes

- **rosetta-drizzle:** use explicit property syntax for declaration emit ([3d1c9ff](https://github.com/SylphxAI/rosetta/commit/3d1c9ff6ee34523e947042b7f08314c1645320ce))
- comprehensive architecture improvements ([555a8f2](https://github.com/SylphxAI/rosetta/commit/555a8f2c27214d575e561ab3ea9c1edca37ea938))
- replace remaining lingua references with rosetta ([5a28967](https://github.com/SylphxAI/rosetta/commit/5a28967ec1962a6e69266b42fe993aa092fe6af1))

### ⚡️ Performance

- **rosetta-drizzle:** parallelize registerSources occurrence updates ([0ad15bb](https://github.com/SylphxAI/rosetta/commit/0ad15bb0059ed5c57e0090f141d13fa75ceb98c7))
- **rosetta-drizzle:** parallelize saveTranslations batch operation ([4af751a](https://github.com/SylphxAI/rosetta/commit/4af751a06647cd3e13e8e0e4fe73868250e7ac89))

### ♻️ Refactoring

- 💥 unify client/server to use hash-based lookup ([93d2e5b](https://github.com/SylphxAI/rosetta/commit/93d2e5b008d65ca121bc5940e96d26c9b77f7a34))
- 💥 rename I18n to Rosetta for consistent branding ([993d193](https://github.com/SylphxAI/rosetta/commit/993d193b9e867fc21edc87ebb490f31800c4fb99))
- 💥 remove enabledLocales, discover languages from DB ([479c441](https://github.com/SylphxAI/rosetta/commit/479c441f1aca0b81158bf8ce11052e10b0b4b8a4))
- 💥 rename packages from lingua to rosetta ([0daf9aa](https://github.com/SylphxAI/rosetta/commit/0daf9aa6be1bbe2aa5e5371e54576ee56641866e))

### 💥 Breaking Changes

- unify client/server to use hash-based lookup ([93d2e5b](https://github.com/SylphxAI/rosetta/commit/93d2e5b008d65ca121bc5940e96d26c9b77f7a34))
  Client now uses hash-based lookup (same as server)
- rename I18n to Rosetta for consistent branding ([993d193](https://github.com/SylphxAI/rosetta/commit/993d193b9e867fc21edc87ebb490f31800c4fb99))
  All I18n-related names changed to Rosetta
- remove enabledLocales, discover languages from DB ([479c441](https://github.com/SylphxAI/rosetta/commit/479c441f1aca0b81158bf8ce11052e10b0b4b8a4))
  enabledLocales config removed
- rename packages from lingua to rosetta ([0daf9aa](https://github.com/SylphxAI/rosetta/commit/0daf9aa6be1bbe2aa5e5371e54576ee56641866e))
  All package names have changed

## 0.1.0 (2025-12-07)

### ✨ Features

- add fine-grained translation loading (optional) ([85e7a24](https://github.com/SylphxAI/rosetta/commit/85e7a24e4e8812531d054bb923cbdc152b23fc1a))

### 🐛 Bug Fixes

- comprehensive architecture improvements ([555a8f2](https://github.com/SylphxAI/rosetta/commit/555a8f2c27214d575e561ab3ea9c1edca37ea938))
- replace remaining lingua references with rosetta ([5a28967](https://github.com/SylphxAI/rosetta/commit/5a28967ec1962a6e69266b42fe993aa092fe6af1))

### ⚡️ Performance

- **rosetta-drizzle:** parallelize registerSources occurrence updates ([0ad15bb](https://github.com/SylphxAI/rosetta/commit/0ad15bb0059ed5c57e0090f141d13fa75ceb98c7))
- **rosetta-drizzle:** parallelize saveTranslations batch operation ([4af751a](https://github.com/SylphxAI/rosetta/commit/4af751a06647cd3e13e8e0e4fe73868250e7ac89))

### ♻️ Refactoring

- 💥 unify client/server to use hash-based lookup ([93d2e5b](https://github.com/SylphxAI/rosetta/commit/93d2e5b008d65ca121bc5940e96d26c9b77f7a34))
- 💥 rename I18n to Rosetta for consistent branding ([993d193](https://github.com/SylphxAI/rosetta/commit/993d193b9e867fc21edc87ebb490f31800c4fb99))
- 💥 remove enabledLocales, discover languages from DB ([479c441](https://github.com/SylphxAI/rosetta/commit/479c441f1aca0b81158bf8ce11052e10b0b4b8a4))
- 💥 rename packages from lingua to rosetta ([0daf9aa](https://github.com/SylphxAI/rosetta/commit/0daf9aa6be1bbe2aa5e5371e54576ee56641866e))

### 💥 Breaking Changes

- unify client/server to use hash-based lookup ([93d2e5b](https://github.com/SylphxAI/rosetta/commit/93d2e5b008d65ca121bc5940e96d26c9b77f7a34))
  Client now uses hash-based lookup (same as server)
- rename I18n to Rosetta for consistent branding ([993d193](https://github.com/SylphxAI/rosetta/commit/993d193b9e867fc21edc87ebb490f31800c4fb99))
  All I18n-related names changed to Rosetta
- remove enabledLocales, discover languages from DB ([479c441](https://github.com/SylphxAI/rosetta/commit/479c441f1aca0b81158bf8ce11052e10b0b4b8a4))
  enabledLocales config removed
- rename packages from lingua to rosetta ([0daf9aa](https://github.com/SylphxAI/rosetta/commit/0daf9aa6be1bbe2aa5e5371e54576ee56641866e))
  All package names have changed
