# A Bulls App Rebuild Audit

Authoritative source combination:
- Cloudflare Pages: 8.1.0 Dusk Atelier
- Cloudflare Worker: 8.0.2
- Structural/documentation baseline: v8.0.1 MASTER

## Results
- Pilot code references in Pages 8.1.0: 0
- Obsolete Pilot sample assets removed: 6
- Missing static references after resolving relative paths: 0
- Browser secret-pattern hits: 0
- Ranked replay hash compatibility between Pages and Worker: PASS
- Worker verification test: PASS

## Version compatibility
Pages 8.1.0 and Worker 8.0.2 intentionally retain the `abulls-v8.0.1` ranked replay-hash namespace on both sides. This is compatible and must not be changed on only one side.

## Deployment boundaries
- Deploy Cloudflare Pages from `/pages`.
- Deploy the API Worker from `/workers`.
- Keep Worker secrets/variables in Cloudflare, never browser source.

## Source-of-truth rule
The supplied v8.0.1 MASTER provides the repository structure and documentation only. Its old `/pages` and `/workers` contents are superseded by the supplied Pages 8.1.0 and Worker 8.0.2 packages.
