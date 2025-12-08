---
"@sylphx/rosetta": minor
"@sylphx/rosetta-next": patch
---

feat(rosetta): add CLI for compile-time string extraction

- `rosetta extract` scans source files for t() calls
- Extracts strings and generates JSON output
- Supports --root, --output, --verbose, --include, --exclude options
- Remove runtime string collection (use compile-time extraction instead)
