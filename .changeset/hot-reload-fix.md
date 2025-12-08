---
"@sylphx/rosetta-next": minor
---

Comprehensive reliability and performance improvements

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
