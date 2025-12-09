# Changelog

## 0.1.18 (2025-12-09)

### 🐛 Bug Fixes

- revert package versions after accidental publish ([e6ebd37](https://github.com/SylphxAI/rosetta/commit/e6ebd37f8cea8f8085e94be4257df4184756a30b))
- **rosetta-next:** robust manifest write with fallback ([8f2ab14](https://github.com/SylphxAI/rosetta/commit/8f2ab14d4ddff1fb1023631589626fdbf1c9c720))
- **rosetta-next:** use production JSX runtime (jsx instead of jsxDEV) ([1f948f1](https://github.com/SylphxAI/rosetta/commit/1f948f10b5fec3ea2fe73ae3fa2b615c00adee9a))
- **rosetta-next:** add JSX runtime configuration to bunup build ([78304a1](https://github.com/SylphxAI/rosetta/commit/78304a1cbe6318b09bb0df1001f395fc1a45d44a))

## 1.0.6

### Patch Changes

- Updated dependencies [5d4ac89]
  - @sylphx/rosetta@0.3.0

## 1.0.5 (2025-12-09)

### Bug Fixes

- **rosetta-next:** robust manifest write with fallback ([8f2ab14](https://github.com/SylphxAI/rosetta/commit/8f2ab14d4ddff1fb1023631589626fdbf1c9c720))

## 1.0.3 (2025-12-09)

### Bug Fixes

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

### Patch Changes

- Updated dependencies [8abda25]
- Updated dependencies [0ba0566]
  - @sylphx/rosetta@0.2.0
