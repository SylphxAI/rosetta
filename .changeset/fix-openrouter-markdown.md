---
"@sylphx/rosetta-admin": patch
---

Fix OpenRouter translator to handle markdown-wrapped JSON responses

Some models ignore `response_format: { type: 'json_object' }` and return
JSON wrapped in markdown code fences. The translator now strips these
fences before parsing.
