# Changelog

## 0.2.2 (2025-12-10)

Simplify to CLI-based manifest extraction, remove createManifestReader

### ✨ Features

- **rosetta:** add TypeScript manifest generation ([1422741](https://github.com/SylphxAI/rosetta/commit/1422741c5d71b7b350bd3308da182cfe4f64f51f))
- **rosetta-admin:** add createManifestReader helper ([6959183](https://github.com/SylphxAI/rosetta/commit/6959183f40ce2830035476e83c6624b89bae6c5b))

### ♻️ Refactoring

- simplify to CLI-based manifest extraction ([bae3c39](https://github.com/SylphxAI/rosetta/commit/bae3c399ef9c85c6b458cfc83c34a337a0a8b7a0))

### ⏪ Reverts

- remove manual version bumps (CI handles releases) ([f3d9b06](https://github.com/SylphxAI/rosetta/commit/f3d9b06e1a45028fa83a311b7caed543ae41d67e))

## 0.2.0 (2025-12-09)

### ✨ Features

- 💥 manifest-based architecture - sources as static files ([430dc2b](https://github.com/SylphxAI/rosetta/commit/430dc2bb2b06812a217bae968957bb2a9ba1a563))

### 💥 Breaking Changes

- manifest-based architecture - sources as static files ([430dc2b](https://github.com/SylphxAI/rosetta/commit/430dc2bb2b06812a217bae968957bb2a9ba1a563))

## 0.1.8 (2025-12-09)

### ✨ Features

- **rosetta:** add sourceHash for efficient staleness detection ([7ff0088](https://github.com/SylphxAI/rosetta/commit/7ff00889dba4de5fb33dbc85daaf1af1afc727df))

### 🐛 Bug Fixes

- revert package versions after accidental publish ([e6ebd37](https://github.com/SylphxAI/rosetta/commit/e6ebd37f8cea8f8085e94be4257df4184756a30b))

## 1.0.0

### Minor Changes

- 5d4ac89: feat: add sourceHash for efficient staleness detection

  - Add `sourceHash` column to rosetta_translations table (8-char hex hash)
  - Replace inefficient `translatedFrom` (full source text) with hash-based comparison
  - Maintain backward compatibility: `translatedFrom` deprecated but still supported
  - Storage savings: ~100KB → 8 bytes per translation for long texts

  Migration required: Add `source_hash TEXT` column to your rosetta_translations table.

### Patch Changes

- Updated dependencies [5d4ac89]
  - @sylphx/rosetta@0.3.0

## 0.1.7 (2025-12-09)

### ✨ Features

- **rosetta-admin:** add per-locale batch translation progress ([1c49b75](https://github.com/SylphxAI/rosetta/commit/1c49b759f976801a20066c09922f4fffc85585b6))

## 0.1.6 (2025-12-09)

### 🐛 Bug Fixes

- **rosetta-admin:** fix stale closure in streaming callbacks ([6098d41](https://github.com/SylphxAI/rosetta/commit/6098d41cf447670e2c82c3aa3ea8eabc88751213))
- **rosetta-admin:** fix stale closure in streaming callbacks ([4edf3f7](https://github.com/SylphxAI/rosetta/commit/4edf3f706ddfc8b7edcfcc16a702c76c88b87030))

## 0.1.5 (2025-12-09)

### ✨ Features

- **rosetta-admin:** add SSE streaming for batch translation progress
  - `batchTranslate` now only requires `{ locale }`
  - Server looks up untranslated strings from storage
  - Optional `hashes` array for selective translation
  - No more sending sourceText from client
  - **SSE streaming support**: Real-time progress updates as translations complete
    - Server streams progress events via SSE when `Accept: text/event-stream` header is set
    - Client can use `batchTranslateStream` for real-time UI updates
    - Falls back to non-streaming mode if SSE not requested

## 0.1.4 (2025-12-09)

### ♻️ Refactoring

- **rosetta-admin:** server-first batch translate API

## 0.1.3 (2025-12-09)

### ✨ Features

- split AI translators into separate packages ([f2b7ed0](https://github.com/SylphxAI/rosetta/commit/f2b7ed0865c38207b2cfb45d17d77a4a6f16cb6a))
- **rosetta-admin:** improve AI translators with proper SDK support ([8f52f9c](https://github.com/SylphxAI/rosetta/commit/8f52f9cb27e1747797b45e5c4829fa8286e6aaee))
- **rosetta-admin:** add createAiSdkTranslator for AI SDK users ([b7c8944](https://github.com/SylphxAI/rosetta/commit/b7c8944a1677117d2522eaac4a146a9afd6c6e84))

### 🐛 Bug Fixes

- **rosetta-admin:** add zod as optional dependency for trpc ([b938b94](https://github.com/SylphxAI/rosetta/commit/b938b9492c1a77f97c28849dc3ba82ea3c11bb40))
- **rosetta-admin:** handle markdown-wrapped JSON in OpenRouter responses ([ba56fb4](https://github.com/SylphxAI/rosetta/commit/ba56fb4182f9e5e5d760ca1408b85848d29e7b5a))

## 0.1.2 (2025-12-09)

### ✨ Features

- split AI translators into separate packages ([f2b7ed0](https://github.com/SylphxAI/rosetta/commit/f2b7ed0865c38207b2cfb45d17d77a4a6f16cb6a))
- **rosetta-admin:** improve AI translators with proper SDK support ([8f52f9c](https://github.com/SylphxAI/rosetta/commit/8f52f9cb27e1747797b45e5c4829fa8286e6aaee))
- **rosetta-admin:** add createAiSdkTranslator for AI SDK users ([b7c8944](https://github.com/SylphxAI/rosetta/commit/b7c8944a1677117d2522eaac4a146a9afd6c6e84))

### 🐛 Bug Fixes

- **rosetta-admin:** handle markdown-wrapped JSON in OpenRouter responses ([ba56fb4](https://github.com/SylphxAI/rosetta/commit/ba56fb4182f9e5e5d760ca1408b85848d29e7b5a))

## 0.1.1 (2025-12-08)

### 🐛 Bug Fixes

- **rosetta-admin:** export SourceEntry type from react module ([e3ce4aa](https://github.com/SylphxAI/rosetta/commit/e3ce4aa8a392e9f35ff966aa7d2ccf2f0e84dcc2))

## 0.1.0 (2025-12-08)

### ✨ Features

- **rosetta-admin:** add headless translation admin package ([ad939c5](https://github.com/SylphxAI/rosetta/commit/ad939c5406ad076b7f64ac20ac687c7a4da892d1))
