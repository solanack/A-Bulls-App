# Worker 8.1.0 synchronized deployment payload

The production-style Worker 8.1.0 source is stored here as ordered gzip/base64 chunks because a single large contents-API payload can be truncated by tooling.

## Reconstruct

```bash
cat .worker-sync/worker.js.gz.b64.part-* | base64 -d | gzip -dc > worker-8.1.0.mjs
```

Expected SHA-256 of the reconstructed Worker:

`351b491f7729c3d15f81e5e574f22d20f472271dc937691223e66def757de64d`

The Bull Intelligence CI performs this reconstruction automatically, verifies the hash, checks JavaScript syntax, and smoke-tests the read-only Intelligence routes.

Do not edit individual chunk files manually. Rebuild all chunks from the authoritative Worker source if the Worker changes.

Deployment safety:
- Migration `workers/migrations/0007_bull_intelligence.sql` must be applied before enabling `BULL_INDEXER_ENABLED`.
- `BULL_ARCHIVAL_ENABLED` stays disabled until a real archival source is configured.
- Helius credentials remain Cloudflare Worker secrets and must never be committed here.
