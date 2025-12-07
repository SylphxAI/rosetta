# Changelog

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
