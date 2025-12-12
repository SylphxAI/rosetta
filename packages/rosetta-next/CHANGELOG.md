# Changelog

## 0.3.6 (2025-12-12)

### 🐛 Bug Fixes

- add biome-ignore comments for noExplicitAny lint errors ([dcf99d8](https://github.com/SylphxAI/rosetta/commit/dcf99d83b7ae92ba709c32a5d7e2be1cfebde137))
- resolve TypeScript type errors and exclude test files from typecheck ([46f3222](https://github.com/SylphxAI/rosetta/commit/46f32221b9c22fa82b73c37dd63880aa85c754fe))
- resolve biome lint errors ([619969b](https://github.com/SylphxAI/rosetta/commit/619969b119a2827e54d327c5bc907f585c81b442))

### 💅 Styles

- format package.json files ([f26787d](https://github.com/SylphxAI/rosetta/commit/f26787d55f657f22eb764651104feb775f7a98db))

### ✅ Tests

- add comprehensive tests to improve coverage to >95% ([ac23a71](https://github.com/SylphxAI/rosetta/commit/ac23a71af4f68ad11b89e2b2b2e5ecdeea944b06))

## 0.3.5 (2025-12-11)

### 🐛 Bug Fixes

- **rosetta,rosetta-next:** use --target browser for Edge-compatible entries ([78a54fb](https://github.com/SylphxAI/rosetta/commit/78a54fb00a5146655a880626b97be93ad732b4a0))

## 0.3.4 (2025-12-11)

### 🐛 Bug Fixes

- use sed -i.bak for cross-platform compatibility ([64b839c](https://github.com/SylphxAI/rosetta/commit/64b839c8a810c473dd6e72f94e4c15c4c2ebdb6f))
- **rosetta,rosetta-next:** strip node:module from Edge-compatible bundles ([f3be5b0](https://github.com/SylphxAI/rosetta/commit/f3be5b00c58d1efbf38da902a2235723dbb3da56))

## 0.3.3 (2025-12-11)

### 🐛 Bug Fixes

- **rosetta-next:** disable code splitting for Turbopack compatibility ([85dc492](https://github.com/SylphxAI/rosetta/commit/85dc4921f42acca3dd6f413c24371d2981f04b5a))

## 0.3.2 (2025-12-10)

### 🐛 Bug Fixes

- remove node:module deps for Edge runtime compatibility ([23c73bd](https://github.com/SylphxAI/rosetta/commit/23c73bd26c654ffc17c5d556431a3dc576e1b1b8))

## 0.3.1 (2025-12-10)

Deprecate withRosetta in favor of CLI extraction

### 🐛 Bug Fixes

- sync package versions with npm ([e2637db](https://github.com/SylphxAI/rosetta/commit/e2637dbd931da825edcbf8d01f945851da1ffde7))

### ⏪ Reverts

- remove manual version bumps (CI handles releases) ([f3d9b06](https://github.com/SylphxAI/rosetta/commit/f3d9b06e1a45028fa83a311b7caed543ae41d67e))

## 0.2.0 (2025-12-09)

### ✨ Features

- 💥 manifest-based architecture - sources as static files ([430dc2b](https://github.com/SylphxAI/rosetta/commit/430dc2bb2b06812a217bae968957bb2a9ba1a563))

### 💥 Breaking Changes

- manifest-based architecture - sources as static files ([430dc2b](https://github.com/SylphxAI/rosetta/commit/430dc2bb2b06812a217bae968957bb2a9ba1a563))

## 0.1.22 (2025-12-09)

### ✨ Features

- **rosetta-next:** bulletproof auto-sync with timeout + instrumentation.ts support ([ff9ee75](https://github.com/SylphxAI/rosetta/commit/ff9ee75c4f2abba622fbaa72c907a92946d91eec))

## 0.1.21 (2025-12-09)

### ✨ Features

- **rosetta-next:** robust auto-sync with webpack hooks + process.exit interception ([e100678](https://github.com/SylphxAI/rosetta/commit/e1006787ef9a5891434bd1a9b54b441bffe40fdc))

## 0.1.20 (2025-12-09)

### 🐛 Bug Fixes

- **rosetta-next:** use process.beforeExit for auto-sync (Turbopack compat) ([707fa5e](https://github.com/SylphxAI/rosetta/commit/707fa5e3392632f8c20316226e1a464d3a4ae0c9))

## 0.1.19 (2025-12-09)

### ✨ Features

- **rosetta-next:** add zero-config auto-sync with storage option ([1732dd6](https://github.com/SylphxAI/rosetta/commit/1732dd6307ecf5a4f88310a576b32f384da4e089))

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
