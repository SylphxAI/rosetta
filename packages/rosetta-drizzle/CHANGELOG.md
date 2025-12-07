# Changelog

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
