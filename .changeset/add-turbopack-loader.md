---
"@sylphx/rosetta-next": minor
---

feat(rosetta-next): add Turbopack/Webpack loader for compile-time string extraction

- `@sylphx/rosetta-next/loader` - extracts t() calls during build
- `@sylphx/rosetta-next/sync` - syncs extracted strings to storage
- Writes to `.rosetta/manifest.json` during build
- `syncRosetta()` function to register strings to DB
- `withRosetta()` Next.js config wrapper (optional)
