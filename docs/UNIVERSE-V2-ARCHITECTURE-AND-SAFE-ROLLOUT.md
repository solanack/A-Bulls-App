# A Bulls App — Universe v2 / Pattern Lab / Decision Research

Status: **feature branch only — not production deployed**.

Branch: `feature/ecosystem-universes-pattern-lab-v2`

## Core invariant

Canonical public-chain evidence is stored once. Ecosystem Universes are durable scopes over that evidence. A token leaving a live universe does not delete its historical evidence or its prior universe membership.

## Data flow

1. Universe selector obtains a bounded token set.
2. Selector snapshot is persisted before membership changes are applied.
3. New entrants require consecutive source snapshots by default to reduce rank-boundary flapping.
4. Membership enter/exit/rank-change events are persisted.
5. Z500 Helius watchlist reconciliation adds incoming addresses before retiring outgoing addresses.
6. Helius webhook events are filtered against currently active Universe mints before canonical persistence.
7. Canonical `bull_wallet_events` rows are durably linked to the Universe membership active when the event was indexed.
8. Particle-field snapshots render active member anchors plus bounded live observations for the selected Universe.
9. Pattern Lab, Decision Research, and Anomaly Research derive evidence-backed hypotheses from durable canonical events.

## Research semantics

- Pattern Lab: repeated timing, sizing, burst, time-window and cross-token behavioral patterns.
- Decision Research: reconstructs indexed conditions immediately preceding trades and looks for recurring entry/exit rules.
- Anomaly Research: synchronized entries, repeated wallet cohorts, rapid alternating trade patterns and shared-counterparty hubs.
- These systems generate hypotheses and investigation leads only. They do not claim access to private thought, prove automation, identify a person, prove common ownership, label a bad actor, or prove manipulation.

## Z500 selector

Default discovery source preserves the historical A Bulls App Ansem.io mechanism:

- CoinGecko `/api/v3/coins/markets`
- `category=ansem-io-ecosystem`
- `order=market_cap_desc`

The exact historical meaning of the product label `Z500` has not yet been independently proven from old source code. For that reason, `Z500_SOURCE_URL` can override the discovery source without changing the Universe architecture.

Defaults:

- Top limit: 10
- Refresh lease: 900 seconds
- New entrant confirmation: 2 consecutive cycles
- Fail closed on malformed/short source responses
- Solana mint identity verification required
- SOL/WSOL, USDC and USDT excluded

## Launchpad Universes

Generic fail-closed source adapters are present for:

- `jupiter-launchpad`
- `pump-fun`
- `raydium-launchlab`

They are disabled until a trustworthy source URL is supplied. The adapter expects a JSON array or a common container (`tokens`, `data`, `items`, `results`, `projects`) containing Solana mint/address fields. Source failures preserve the last known-good membership.

## Scheduler protection

The Cloudflare cron may remain frequent because every expensive subsystem has its own persisted D1 lease:

- Z500 discovery: default every 15 minutes
- Pattern Lab: default every 1 hour
- Decision Research: default every 3 hours
- Anomaly Research: default every 6 hours

A duplicate/retried cron cannot normally run the same leased subsystem concurrently.

## Helius protection

`Z500_HELIUS_ROTATION_ENABLED` defaults to `false`.

When explicitly enabled:

- no PATCH occurs when the desired address set already matches;
- incoming addresses are added before outgoing addresses are removed;
- a failed second step leaves a safe superset rather than creating an observation gap;
- an independent daily webhook-update cap defaults to 48 PATCH operations;
- reconciliation state is persisted;
- webhook ingestion accepts a maximum of 100 transactions per HTTP batch;
- canonical ingestion filters events against active Universe mints.

## New feature flags / variables

Keep all new flags off during the first dry run.

```toml
ECOSYSTEM_UNIVERSES_ENABLED = "false"
Z500_UNIVERSE_ENABLED = "false"
Z500_HELIUS_ROTATION_ENABLED = "false"
UNIVERSE_PATTERN_LAB_ENABLED = "false"
UNIVERSE_DECISION_RESEARCH_ENABLED = "false"
UNIVERSE_ANOMALY_RESEARCH_ENABLED = "false"

Z500_TOP_LIMIT = "10"
Z500_REFRESH_SECONDS = "900"
Z500_CONFIRMATION_CYCLES = "2"
Z500_COINGECKO_CATEGORY = "ansem-io-ecosystem"
Z500_MAX_WEBHOOK_UPDATES_PER_DAY = "48"

PATTERN_LAB_REFRESH_SECONDS = "3600"
DECISION_RESEARCH_REFRESH_SECONDS = "10800"
ANOMALY_RESEARCH_REFRESH_SECONDS = "21600"
```

Optional source overrides:

```toml
# Z500_SOURCE_URL = "https://trusted-source.example/z500"
# JUPITER_LAUNCHPAD_ENABLED = "true"
# JUPITER_LAUNCHPAD_SOURCE_URL = "https://trusted-source.example/jupiter"
# PUMPFUN_UNIVERSE_ENABLED = "true"
# PUMPFUN_UNIVERSE_SOURCE_URL = "https://trusted-source.example/pump"
# RAYDIUM_LAUNCHLAB_ENABLED = "true"
# RAYDIUM_LAUNCHLAB_SOURCE_URL = "https://trusted-source.example/launchlab"
```

Secrets must remain Cloudflare secrets, not committed variables:

- `HELIUS_API_KEY`
- `HELIUS_WEBHOOK_AUTH_SECRET` or the existing compatible `PUMP_INGEST_SECRET`

## Required migrations

Apply in order after the existing schema:

1. `workers/migrations/0015_ecosystem_universes_pattern_lab.sql`
2. `workers/migrations/0016_universe_runtime_research.sql`
3. `workers/migrations/0017_decision_research_anomalies.sql`

All three are additive. They intentionally contain no destructive DROP statements.

## Validation gate before production

Do not deploy this branch over the current Z500 Worker package yet. The user's current Termux Worker contains `intelligence-pump-top10.mjs`, while this GitHub feature branch evolved from the retained vNext Worker and does not contain that local module. The two code lines must be reconciled first.

Required validation sequence:

1. Reconcile current local/deployed Worker source with this branch.
2. Run `npm run test:universe-v2`.
3. Run `npm run test:worker-compat`.
4. Run the existing release-candidate validation/dry-run.
5. Apply migrations to the intended D1 database.
6. Deploy with all new ingest/rotation flags **false**.
7. Verify read-only Universe APIs and existing application routes.
8. Enable Z500 selector only; verify two source cycles and membership history.
9. Enable Helius rotation only after inspecting the desired ten mint addresses.
10. Observe Helius and D1 usage before enabling Decision/Anomaly scheduled research.

GitHub Actions currently cannot validate this branch because the private-repository job is failing before the first workflow step starts (`runner_id=0`, zero steps). That infrastructure failure must not be interpreted as a passing or failing code test.
