# Changelog

## 0.2.0

### Minor Changes

- 5b58cae: feat(rosetta): add CLI for compile-time string extraction

  - `rosetta extract` scans source files for t() calls
  - Extracts strings and generates JSON output
  - Supports --root, --output, --verbose, --include, --exclude options
  - Remove runtime string collection (use compile-time extraction instead)

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

- 96e2d0f: feat: Add caching layer for serverless deployments

  New cache adapters to reduce database queries in serverless environments:

  - **InMemoryCache**: LRU cache with TTL for traditional Node.js servers
  - **ExternalCache**: Redis/Upstash adapter for serverless (Vercel, Lambda)
  - **RequestScopedCache**: Request-level deduplication

  Usage:

  ```ts
  // Serverless with Upstash Redis
  import { Redis } from "@upstash/redis";
  import { ExternalCache, Rosetta } from "@sylphx/rosetta/server";

  const redis = new Redis({ url, token });
  const cache = new ExternalCache(redis, { ttlSeconds: 60 });

  const rosetta = new Rosetta({
    storage,
    cache, // Optional cache adapter
    defaultLocale: "en",
  });
  ```

  Also adds `rosetta.invalidateCache(locale?)` to clear cached translations after updates.

### Patch Changes

- e9a4fe3: fix(rosetta): remove duplicate exports from bunup build output

  Added post-build script to fix bunup bundler bug that generates duplicate export statements.

- d7f08b6: Performance and security improvements:

  **Performance:**

  - Cache `Intl.PluralRules` instances per locale on server (2-5x faster plurals)
  - Single-pass regex interpolation: O(n) instead of O(m×n)

  **Security:**

  - Add ICU parsing depth limits to server (matching client)
  - Add iteration limits to prevent infinite loops
  - Fix `replaceHash` to use replacer function (avoids $ interpretation)
  - Add text length limits (50k chars max)

## 0.1.7 (2025-12-08)

### ✨ Features

- **rosetta:** add source override and staleness detection ([540c04d](https://github.com/SylphxAI/rosetta/commit/540c04daedebe3b730b35ccecd4cb43dc518450f))

## 0.1.6 (2025-12-08)

### 🐛 Bug Fixes

- **rosetta:** remove duplicate exports from bunup build output ([a189744](https://github.com/SylphxAI/rosetta/commit/a18974410b5196164668de646d6b3c0579730790))

## 0.1.5 (2025-12-08)

### ✨ Features

- **rosetta:** add CJS exports for Node.js compatibility ([aea0045](https://github.com/SylphxAI/rosetta/commit/aea0045d5b1bc2638e209101f6dedd97a360ef04))

## 0.1.4 (2025-12-08)

### ✨ Features

- **rosetta:** add timeout to OpenRouter adapter ([129f86d](https://github.com/SylphxAI/rosetta/commit/129f86d856e8f15f322e358106c975f57d86ed12))
- **rosetta:** add input validation with size limits ([b46f023](https://github.com/SylphxAI/rosetta/commit/b46f023cf9a68bf5eda0bee516619df5acd1e4c7))
- **rosetta:** add caching layer for serverless deployments ([96e2d0f](https://github.com/SylphxAI/rosetta/commit/96e2d0f3e1db1aeed407d69963456ec8a2bb8520))

### 🐛 Bug Fixes

- **rosetta:** add explicit type annotations for isolatedDeclarations ([a9f7955](https://github.com/SylphxAI/rosetta/commit/a9f7955fe3e7778c8f5501826d2718000877e27d))

### ⚡️ Performance

- **rosetta:** optimize interpolation and add server ICU security ([d7f08b6](https://github.com/SylphxAI/rosetta/commit/d7f08b654e7437c9addc34c8583c08a643f39358))

### ♻️ Refactoring

- **rosetta:** extract shared ICU formatter module ([924a61f](https://github.com/SylphxAI/rosetta/commit/924a61f658cce082757f133140b1714124c8ce6a))

### 💅 Styles

- fix lint formatting ([651be20](https://github.com/SylphxAI/rosetta/commit/651be2074c18d9a127e30c77eef18ea3fbe6cdbe))

## 0.1.3 (2025-12-08)

### ✨ Features

- **rosetta:** add timeout to OpenRouter adapter ([129f86d](https://github.com/SylphxAI/rosetta/commit/129f86d856e8f15f322e358106c975f57d86ed12))
- **rosetta:** add input validation with size limits ([b46f023](https://github.com/SylphxAI/rosetta/commit/b46f023cf9a68bf5eda0bee516619df5acd1e4c7))
- **rosetta:** add caching layer for serverless deployments ([96e2d0f](https://github.com/SylphxAI/rosetta/commit/96e2d0f3e1db1aeed407d69963456ec8a2bb8520))

### ⚡️ Performance

- **rosetta:** optimize interpolation and add server ICU security ([d7f08b6](https://github.com/SylphxAI/rosetta/commit/d7f08b654e7437c9addc34c8583c08a643f39358))

### ♻️ Refactoring

- **rosetta:** extract shared ICU formatter module ([924a61f](https://github.com/SylphxAI/rosetta/commit/924a61f658cce082757f133140b1714124c8ce6a))

### 💅 Styles

- fix lint formatting ([651be20](https://github.com/SylphxAI/rosetta/commit/651be2074c18d9a127e30c77eef18ea3fbe6cdbe))

## 0.1.2 (2025-12-08)

### ✨ Features

- **rosetta-next:** add Turbopack loader for compile-time extraction ([0ba0566](https://github.com/SylphxAI/rosetta/commit/0ba056673b4fd0e50de0b6fad2d2463355246e93))

## 0.1.1 (2025-12-08)

### ✨ Features

- **rosetta:** compile-time string extraction CLI ([5b58cae](https://github.com/SylphxAI/rosetta/commit/5b58cae8c90db38fb274c87b49c42b1aedaad28c))

## 0.1.0 (2025-12-07)

### ✨ Features

- **rosetta:** add ICU MessageFormat, locale fallback chain, and validation ([4e62e59](https://github.com/SylphxAI/rosetta/commit/4e62e59df2a6efbfafbae082151286bc89832eee))
- add fine-grained translation loading (optional) ([85e7a24](https://github.com/SylphxAI/rosetta/commit/85e7a24e4e8812531d054bb923cbdc152b23fc1a))
- **rosetta-react:** add RosettaProvider server component ([5947eb4](https://github.com/SylphxAI/rosetta/commit/5947eb4ce2d7db201d97bd02cd5798e66df4f393))

### 🐛 Bug Fixes

- comprehensive architecture improvements ([555a8f2](https://github.com/SylphxAI/rosetta/commit/555a8f2c27214d575e561ab3ea9c1edca37ea938))
- replace remaining lingua references with rosetta ([5a28967](https://github.com/SylphxAI/rosetta/commit/5a28967ec1962a6e69266b42fe993aa092fe6af1))

### ♻️ Refactoring

- 💥 rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))
- 💥 remove internal cache (serverless-first) ([61e9f39](https://github.com/SylphxAI/rosetta/commit/61e9f3914b7899a97e98490a4f949d5fc1c09533))
- 💥 unify client/server to use hash-based lookup ([93d2e5b](https://github.com/SylphxAI/rosetta/commit/93d2e5b008d65ca121bc5940e96d26c9b77f7a34))
- 💥 rename I18n to Rosetta for consistent branding ([993d193](https://github.com/SylphxAI/rosetta/commit/993d193b9e867fc21edc87ebb490f31800c4fb99))
- 💥 remove enabledLocales, discover languages from DB ([479c441](https://github.com/SylphxAI/rosetta/commit/479c441f1aca0b81158bf8ce11052e10b0b4b8a4))
- 💥 rename packages from lingua to rosetta ([0daf9aa](https://github.com/SylphxAI/rosetta/commit/0daf9aa6be1bbe2aa5e5371e54576ee56641866e))

### 💥 Breaking Changes

- rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))
  Package renamed to reflect Next.js-specific nature
- remove internal cache (serverless-first) ([61e9f39](https://github.com/SylphxAI/rosetta/commit/61e9f3914b7899a97e98490a4f949d5fc1c09533))
  Removed cacheTTL and maxCacheSize config options
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

- **rosetta:** add ICU MessageFormat, locale fallback chain, and validation ([4e62e59](https://github.com/SylphxAI/rosetta/commit/4e62e59df2a6efbfafbae082151286bc89832eee))
- add fine-grained translation loading (optional) ([85e7a24](https://github.com/SylphxAI/rosetta/commit/85e7a24e4e8812531d054bb923cbdc152b23fc1a))
- **rosetta-react:** add RosettaProvider server component ([5947eb4](https://github.com/SylphxAI/rosetta/commit/5947eb4ce2d7db201d97bd02cd5798e66df4f393))

### 🐛 Bug Fixes

- comprehensive architecture improvements ([555a8f2](https://github.com/SylphxAI/rosetta/commit/555a8f2c27214d575e561ab3ea9c1edca37ea938))
- replace remaining lingua references with rosetta ([5a28967](https://github.com/SylphxAI/rosetta/commit/5a28967ec1962a6e69266b42fe993aa092fe6af1))

### ♻️ Refactoring

- 💥 rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))
- 💥 remove internal cache (serverless-first) ([61e9f39](https://github.com/SylphxAI/rosetta/commit/61e9f3914b7899a97e98490a4f949d5fc1c09533))
- 💥 unify client/server to use hash-based lookup ([93d2e5b](https://github.com/SylphxAI/rosetta/commit/93d2e5b008d65ca121bc5940e96d26c9b77f7a34))
- 💥 rename I18n to Rosetta for consistent branding ([993d193](https://github.com/SylphxAI/rosetta/commit/993d193b9e867fc21edc87ebb490f31800c4fb99))
- 💥 remove enabledLocales, discover languages from DB ([479c441](https://github.com/SylphxAI/rosetta/commit/479c441f1aca0b81158bf8ce11052e10b0b4b8a4))
- 💥 rename packages from lingua to rosetta ([0daf9aa](https://github.com/SylphxAI/rosetta/commit/0daf9aa6be1bbe2aa5e5371e54576ee56641866e))

### 💥 Breaking Changes

- rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))
  Package renamed to reflect Next.js-specific nature
- remove internal cache (serverless-first) ([61e9f39](https://github.com/SylphxAI/rosetta/commit/61e9f3914b7899a97e98490a4f949d5fc1c09533))
  Removed cacheTTL and maxCacheSize config options
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

- **rosetta:** add ICU MessageFormat, locale fallback chain, and validation ([4e62e59](https://github.com/SylphxAI/rosetta/commit/4e62e59df2a6efbfafbae082151286bc89832eee))
- add fine-grained translation loading (optional) ([85e7a24](https://github.com/SylphxAI/rosetta/commit/85e7a24e4e8812531d054bb923cbdc152b23fc1a))
- **rosetta-react:** add RosettaProvider server component ([5947eb4](https://github.com/SylphxAI/rosetta/commit/5947eb4ce2d7db201d97bd02cd5798e66df4f393))

### 🐛 Bug Fixes

- comprehensive architecture improvements ([555a8f2](https://github.com/SylphxAI/rosetta/commit/555a8f2c27214d575e561ab3ea9c1edca37ea938))
- replace remaining lingua references with rosetta ([5a28967](https://github.com/SylphxAI/rosetta/commit/5a28967ec1962a6e69266b42fe993aa092fe6af1))

### ♻️ Refactoring

- 💥 rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))
- 💥 remove internal cache (serverless-first) ([61e9f39](https://github.com/SylphxAI/rosetta/commit/61e9f3914b7899a97e98490a4f949d5fc1c09533))
- 💥 unify client/server to use hash-based lookup ([93d2e5b](https://github.com/SylphxAI/rosetta/commit/93d2e5b008d65ca121bc5940e96d26c9b77f7a34))
- 💥 rename I18n to Rosetta for consistent branding ([993d193](https://github.com/SylphxAI/rosetta/commit/993d193b9e867fc21edc87ebb490f31800c4fb99))
- 💥 remove enabledLocales, discover languages from DB ([479c441](https://github.com/SylphxAI/rosetta/commit/479c441f1aca0b81158bf8ce11052e10b0b4b8a4))
- 💥 rename packages from lingua to rosetta ([0daf9aa](https://github.com/SylphxAI/rosetta/commit/0daf9aa6be1bbe2aa5e5371e54576ee56641866e))

### 💥 Breaking Changes

- rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))
  Package renamed to reflect Next.js-specific nature
- remove internal cache (serverless-first) ([61e9f39](https://github.com/SylphxAI/rosetta/commit/61e9f3914b7899a97e98490a4f949d5fc1c09533))
  Removed cacheTTL and maxCacheSize config options
- unify client/server to use hash-based lookup ([93d2e5b](https://github.com/SylphxAI/rosetta/commit/93d2e5b008d65ca121bc5940e96d26c9b77f7a34))
  Client now uses hash-based lookup (same as server)
- rename I18n to Rosetta for consistent branding ([993d193](https://github.com/SylphxAI/rosetta/commit/993d193b9e867fc21edc87ebb490f31800c4fb99))
  All I18n-related names changed to Rosetta
- remove enabledLocales, discover languages from DB ([479c441](https://github.com/SylphxAI/rosetta/commit/479c441f1aca0b81158bf8ce11052e10b0b4b8a4))
  enabledLocales config removed
- rename packages from lingua to rosetta ([0daf9aa](https://github.com/SylphxAI/rosetta/commit/0daf9aa6be1bbe2aa5e5371e54576ee56641866e))
  All package names have changed
