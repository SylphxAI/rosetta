# Changelog

## 1.0.3 (2025-12-09)

### 🐛 Bug Fixes

- **rosetta-next:** use production JSX runtime (jsx instead of jsxDEV) ([1f948f1](https://github.com/SylphxAI/rosetta/commit/1f948f10b5fec3ea2fe73ae3fa2b615c00adee9a))

## 1.0.1

### Patch Changes

- 540cf76: Fix JSX runtime import - configure bunup to use automatic JSX runtime with proper import source

## 1.0.0

### Minor Changes

- 0ba0566: feat(rosetta-next): add Turbopack/Webpack loader for compile-time string extraction

  - `@sylphx/rosetta-next/loader` - extracts t() calls during build
  - `@sylphx/rosetta-next/sync` - syncs extracted strings to storage
  - Writes to `.rosetta/manifest.json` during build
  - `syncRosetta()` function to register strings to DB
  - `withRosetta()` Next.js config wrapper (optional)

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

- 2c1f64f: Comprehensive reliability and performance improvements

  **Breaking Changes:**

  - Auto-sync removed from RosettaProvider - use `syncRosetta()` explicitly in postbuild script
  - `syncRosetta()` return type changed to include `lockAcquired` and `skipped` fields

  **Critical Fixes:**

  - Fixed race conditions in serverless/multi-pod deployments with distributed file lock
  - Fixed manifest deletion timing - production preserves manifest by default
  - Fixed atomic manifest writes using temp file + rename pattern
  - Fixed ICU pluralization to use actual locale instead of hardcoded 'en'
  - Fixed hash collision detection in both loader and sync

  **New Features:**

  - Configurable manifest directory via `ROSETTA_MANIFEST_DIR` env var
  - Manifest schema validation with detailed error reporting
  - Debounced manifest writes (100ms) to batch multiple file changes
  - Sorted manifest output for deterministic diffs
  - Lock acquisition timeout and stale lock recovery

  **Performance:**

  - Removed fs.existsSync calls from request path (no more file I/O per request)
  - Clear collected strings after write to prevent memory growth

  **Utilities:**

  - Added `flushManifest()` for testing/manual sync
  - Added `resetLoaderState()` for testing

- a37df1a: feat(rosetta-next): add locale utilities for language picker

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

- 64d88e4: feat(rosetta-next): add page-level translation loading (zero-config)

  Automatic optimization that loads only the translations needed for each page:

  - Build generates `routes.json` mapping routes to translation hashes
  - `RosettaProvider` automatically uses route manifest for optimized loading
  - Supports Next.js App Router conventions (pages, layouts, route groups, dynamic segments)
  - Shared components marked as `_shared` and included in all routes
  - Falls back to loading all translations if no manifest exists

  ```tsx
  // Zero-config - automatic optimization
  <RosettaProvider rosetta={rosetta} locale={locale}>
    {children}
  </RosettaProvider>

  // Or with explicit pathname for nested layouts
  <RosettaProvider rosetta={rosetta} locale={locale} pathname="/products">
    {children}
  </RosettaProvider>
  ```

  New exports from loader:

  - `readRoutes()` - Read route manifest
  - `getHashesForRoute(route)` - Get hashes for a specific route
  - `filePathToRoute()` - Convert file paths to routes (for testing)

- 2c2d43d: Security and performance improvements:

  **Security Fixes:**

  - ReDoS-safe regex patterns with bounded repetition in loader
  - ICU parsing depth limits to prevent DoS attacks
  - Prototype pollution prevention using Map for translations lookup
  - Path traversal validation for ROSETTA_MANIFEST_DIR
  - Error boundaries in translation function

  **Performance Improvements:**

  - Cache Intl.PluralRules instances per locale (2-5x faster plurals)
  - Memory safety limits for large codebases

  **Bug Fixes:**

  - Fixed hash mismatch between loader and client by importing hashText from core
  - Added context extraction support in loader to match runtime behavior
  - Fixed webpack loader with enforce:'pre' to run before other loaders

### Patch Changes

- 5b58cae: feat(rosetta): add CLI for compile-time string extraction

  - `rosetta extract` scans source files for t() calls
  - Extracts strings and generates JSON output
  - Supports --root, --output, --verbose, --include, --exclude options
  - Remove runtime string collection (use compile-time extraction instead)

- 2183abe: Add automatic manifest sync on first request

  - RosettaProvider now auto-syncs extracted strings from .rosetta/manifest.json to storage
  - Sync runs once per server lifecycle on first render
  - Eliminates need for manual postbuild scripts

- 101d507: fix(rosetta-next): use production JSX runtime instead of development
- 284b162: fix(rosetta-next): fix duplicate export in locales.js build

  Fixed bundler issue causing duplicate export statements in the built locales.js file.

- Updated dependencies [5b58cae]
- Updated dependencies [8abda25]
- Updated dependencies [e9a4fe3]
- Updated dependencies [d7f08b6]
- Updated dependencies [96e2d0f]
  - @sylphx/rosetta@0.2.0

## 0.1.17 (2025-12-08)

### 🐛 Bug Fixes

- **rosetta-next:** fix duplicate export in locales.js build ([32d5ec3](https://github.com/SylphxAI/rosetta/commit/32d5ec3ccbeeec4966e9ee24a231c37e268af997))

## 0.1.16 (2025-12-08)

### ✨ Features

- **rosetta-next:** add page-level translation loading (zero-config) ([64d88e4](https://github.com/SylphxAI/rosetta/commit/64d88e4ac252c7e88ef67895e3c54be04cb8d37e))

## 0.1.15 (2025-12-08)

### ✨ Features

- **rosetta-next:** add comprehensive locale list for language pickers ([d1ccc7f](https://github.com/SylphxAI/rosetta/commit/d1ccc7fbbcb56f6502d384d6e668d553b342551d))

## 0.1.14 (2025-12-08)

### ✨ Features

- **rosetta-next:** add locale utilities for language picker ([2db5f79](https://github.com/SylphxAI/rosetta/commit/2db5f7989b21993e47ba6213d0b6e5adba3fe870))

## 0.1.13 (2025-12-08)

### 🐛 Bug Fixes

- **rosetta-drizzle:** simplify table types for Drizzle compatibility ([c38bae0](https://github.com/SylphxAI/rosetta/commit/c38bae09babfddd7d9ce55e4bf9752956669ca55))

## 0.1.12 (2025-12-08)

### ✨ Features

- **rosetta-next:** comprehensive reliability and performance overhaul ([151f53d](https://github.com/SylphxAI/rosetta/commit/151f53dfcf5cd6caee40b2878edf28be72ea6cb0))

### 🐛 Bug Fixes

- **rosetta-next,rosetta-drizzle:** security and performance hardening ([2c2d43d](https://github.com/SylphxAI/rosetta/commit/2c2d43d27d4db579bc94c5aee238ca5131df2228))

### ♻️ Refactoring

- **rosetta:** extract shared ICU formatter module ([924a61f](https://github.com/SylphxAI/rosetta/commit/924a61f658cce082757f133140b1714124c8ce6a))

### ✅ Tests

- **rosetta-next:** add loader and sync tests ([1b76245](https://github.com/SylphxAI/rosetta/commit/1b7624501ef0da61e53e38ab8bd4fd50456d3da2))

## 0.1.11 (2025-12-08)

### ✨ Features

- **rosetta-next:** comprehensive reliability and performance overhaul ([151f53d](https://github.com/SylphxAI/rosetta/commit/151f53dfcf5cd6caee40b2878edf28be72ea6cb0))

### 🐛 Bug Fixes

- **rosetta-next,rosetta-drizzle:** security and performance hardening ([2c2d43d](https://github.com/SylphxAI/rosetta/commit/2c2d43d27d4db579bc94c5aee238ca5131df2228))

### ♻️ Refactoring

- **rosetta:** extract shared ICU formatter module ([924a61f](https://github.com/SylphxAI/rosetta/commit/924a61f658cce082757f133140b1714124c8ce6a))

### ✅ Tests

- **rosetta-next:** add loader and sync tests ([1b76245](https://github.com/SylphxAI/rosetta/commit/1b7624501ef0da61e53e38ab8bd4fd50456d3da2))

## 0.1.10 (2025-12-08)

### 🐛 Bug Fixes

- **rosetta-next:** support hot reload in dev mode ([e74c5d0](https://github.com/SylphxAI/rosetta/commit/e74c5d0a818041e42fa897bde8a7cad65f05afee))

### 💅 Styles

- fix lint formatting ([651be20](https://github.com/SylphxAI/rosetta/commit/651be2074c18d9a127e30c77eef18ea3fbe6cdbe))

## 0.1.9 (2025-12-08)

### ✨ Features

- **rosetta-next:** add automatic manifest sync on first request ([178e50b](https://github.com/SylphxAI/rosetta/commit/178e50bd034fcda81676a71028ed0581b03e2998))

## 0.1.7 (2025-12-08)

### ♻️ Refactoring

- **rosetta-next:** separate compile-time extraction from runtime sync ([fc3cd30](https://github.com/SylphxAI/rosetta/commit/fc3cd3036344b532c91425e8675d12c72f295365))

## 0.1.6 (2025-12-08)

### 🐛 Bug Fixes

- **rosetta-next:** fix Turbopack/Next.js compatibility issues ([7774c41](https://github.com/SylphxAI/rosetta/commit/7774c41eca1e79ed14fb71191292b3f3a8c2d4a8))

## 0.1.5 (2025-12-08)

### 🐛 Bug Fixes

- **rosetta-next:** add CJS exports for Next.js config compatibility ([f6f0c7c](https://github.com/SylphxAI/rosetta/commit/f6f0c7cc1d5665305d767c62ed7c1722f657dd45))

## 0.1.4 (2025-12-08)

### 🐛 Bug Fixes

- **rosetta-next:** inline manifest functions to fix duplicate export bug ([7b782b3](https://github.com/SylphxAI/rosetta/commit/7b782b3ce4c174c0daddc355a8bacb016429bccd))

## 0.1.3 (2025-12-08)

### ✨ Features

- **rosetta-next:** add automatic Turbopack/Webpack integration in withRosetta() ([ecdfe4c](https://github.com/SylphxAI/rosetta/commit/ecdfe4c35dccd1495de9d9377577eefbe043c5f6))
- **rosetta-next:** add Turbopack loader for compile-time extraction ([0ba0566](https://github.com/SylphxAI/rosetta/commit/0ba056673b4fd0e50de0b6fad2d2463355246e93))

## 0.1.2 (2025-12-08)

### ✨ Features

- **rosetta:** compile-time string extraction CLI ([5b58cae](https://github.com/SylphxAI/rosetta/commit/5b58cae8c90db38fb274c87b49c42b1aedaad28c))

## 0.1.1 (2025-12-08)

### 🐛 Bug Fixes

- **rosetta-next:** use production JSX runtime ([101d507](https://github.com/SylphxAI/rosetta/commit/101d50704ce917135eea0e3da38453cf0e13d347))

## 0.1.0 (2025-12-07)

### ✨ Features

- **rosetta:** add ICU MessageFormat, locale fallback chain, and validation ([4e62e59](https://github.com/SylphxAI/rosetta/commit/4e62e59df2a6efbfafbae082151286bc89832eee))

### 🐛 Bug Fixes

- **types:** resolve TypeScript declaration emit errors for CI ([f3bebcd](https://github.com/SylphxAI/rosetta/commit/f3bebcd8c68c07a83988ae7b0f867e3f7f0d37f6))

### ♻️ Refactoring

- 💥 rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))

### 💥 Breaking Changes

- rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))
  Package renamed to reflect Next.js-specific nature

## 0.1.0 (2025-12-07)

### ✨ Features

- **rosetta:** add ICU MessageFormat, locale fallback chain, and validation ([4e62e59](https://github.com/SylphxAI/rosetta/commit/4e62e59df2a6efbfafbae082151286bc89832eee))

### ♻️ Refactoring

- 💥 rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))

### 💥 Breaking Changes

- rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))
  Package renamed to reflect Next.js-specific nature

## 0.1.0 (2025-12-07)

### ✨ Features

- **rosetta:** add ICU MessageFormat, locale fallback chain, and validation ([4e62e59](https://github.com/SylphxAI/rosetta/commit/4e62e59df2a6efbfafbae082151286bc89832eee))

### ♻️ Refactoring

- 💥 rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))

### 💥 Breaking Changes

- rename rosetta-react to rosetta-next ([557d241](https://github.com/SylphxAI/rosetta/commit/557d24181a3899f830319a54f755cff52d237fd2))
  Package renamed to reflect Next.js-specific nature
