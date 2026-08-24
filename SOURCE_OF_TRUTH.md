# A Bulls App Source of Truth

Current authoritative versions:

- **Pages:** 8.1.0 — Dusk Atelier
- **Worker:** 8.0.2
- **Repository structure/docs baseline:** v8.0.1 MASTER

Repository layout after rebuild:

```text
/
├── README / audit / deployment documentation
├── pages/      # deploy this directory to Cloudflare Pages
└── workers/    # deploy this directory to Cloudflare Worker
```

Do not restore the old flattened root-level Pages files. Do not restore the abandoned Pilot collection or its six sample assets. Bull Pen behavior remains governed by the current Pages 8.1.0 code and its feature flags.

The Pages and Worker packages intentionally share the `abulls-v8.0.1` ranked replay-hash namespace for compatibility. Worker runtime version remains 8.0.2.
