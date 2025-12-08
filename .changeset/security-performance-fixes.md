---
"@sylphx/rosetta-next": minor
---

Security and performance improvements:

**Security Fixes:**
- ReDoS-safe regex patterns with bounded repetition in loader
- ICU parsing depth limits to prevent DoS attacks
- Prototype pollution prevention using Map for translations lookup
- Path traversal validation for ROSETTA_MANIFEST_DIR
- Error boundaries in translation function

**Performance Improvements:**
- Cache Intl.PluralRules instances per locale (2-5x faster plurals)
- Memory safety limits for large codebases

**Bug Fixes:**
- Fixed hash mismatch between loader and client by importing hashText from core
- Added context extraction support in loader to match runtime behavior
- Fixed webpack loader with enforce:'pre' to run before other loaders
