---
"@sylphx/rosetta-admin": patch
---

Fix stale closure in streaming callbacks

- Use `getState()` instead of captured `state` variable in `onTranslation` callback
- Progress now persists correctly when navigating between dashboard and editor views
