# Claude Code instructions — A Bulls App

Before doing any work, read in this order:

1. `MASTER_PLAN.md` — highest-level product/architecture direction; it wins over older conflicting docs.
2. `AGENTS.md` — implementation/release/evidence guardrails.
3. `UNIVERSE_VISION.md` and/or `SOCIALFI_ARCHITECTURE.md` as relevant.
4. Current `main` implementation and live state before assuming a feature is missing or deployed.

Do not create a parallel product. Reuse the existing Field, Grey, Replay, Evidence, Trickster/Create, Index/data contracts, account/social primitives, D1, and Intelligence Worker where possible.

For any substantial change, state which `MASTER_PLAN.md` roadmap item it advances. Preserve source separation, the Seeker WebGL lifecycle, and the non-execution boundary. Never claim production changed until deployment and live verification actually succeed.
