---
"@sylphx/rosetta": patch
---

Performance and security improvements:

**Performance:**
- Cache `Intl.PluralRules` instances per locale on server (2-5x faster plurals)
- Single-pass regex interpolation: O(n) instead of O(m×n)

**Security:**
- Add ICU parsing depth limits to server (matching client)
- Add iteration limits to prevent infinite loops
- Fix `replaceHash` to use replacer function (avoids $ interpretation)
- Add text length limits (50k chars max)
