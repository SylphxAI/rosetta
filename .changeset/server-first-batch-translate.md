---
"@sylphx/rosetta-admin": minor
---

Server-first batch translate API with SSE streaming

- `batchTranslate` now only requires `{ locale }`
- Server looks up untranslated strings from storage
- Optional `hashes` array for selective translation
- No more sending sourceText from client
- **SSE streaming support**: Real-time progress updates as translations complete
  - Server streams progress events via SSE when `Accept: text/event-stream` header is set
  - Client can use `batchTranslateStream` for real-time UI updates
  - Falls back to non-streaming mode if SSE not requested
