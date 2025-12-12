---
"@sylphx/rosetta": minor
"@sylphx/rosetta-next": minor
"@sylphx/rosetta-admin": patch
"@sylphx/rosetta-drizzle": patch
---

Architecture refactor: Move server code from core to rosetta-next

**@sylphx/rosetta** (core):
- Now exports only pure functions with zero Node.js dependencies
- Removed `/server` entry point
- All builds use browser target

**@sylphx/rosetta-next**:
- Added `@sylphx/rosetta-next/server` entry point with all server functionality:
  - `Rosetta` class and `createRosetta()` factory
  - `t()`, `getTranslations()`, `getLocale()` via AsyncLocalStorage
  - `RosettaProvider` server component
  - Cache adapters: `InMemoryCache`, `ExternalCache`, `RequestScopedCache`
  - Locale utilities: `getReadyLocales`, `buildLocaleCookie`, etc.

**Migration:**
```typescript
// Before
import { t, Rosetta } from '@sylphx/rosetta/server';

// After
import { t, createRosetta } from '@sylphx/rosetta-next/server';
```

See `docs/architecture/REFACTOR_PLAN.md` for full migration guide.
