import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildUniverseSnapshotFromFieldV0,
  dyingToParticle,
  holderExitToParticle,
  planetToParticle,
  starToParticle,
  tradeToParticle,
  type FieldV0DyingEvent,
  type FieldV0HolderExitEvent,
  type FieldV0TradeEvent,
} from "./indexer-field-v0.ts";

const trade: FieldV0TradeEvent = {
  v: 1,
  chain: "solana",
  ts: 1_700_000_000_000,
  source: "pumpfun",
  mint: "Mint111111111111111111111111111111111111111",
  sig: "SigTrade111",
  type: "token.trade",
  side: "buy",
  wallet: "Wallet1111111111111111111111111111111111111",
  solAmount: 2.5,
  tokenAmount: 1000,
  priceSol: 0.0025,
  slot: 42,
};

describe("indexer-field-v0 adapter", () => {
  it("maps token.trade to a comet pulse", () => {
    const particle = tradeToParticle(trade);
    assert.equal(particle.cosmicKind, "comet");
    assert.equal(particle.kind, "transaction");
    assert.equal(particle.category, "swap");
    assert.equal(particle.metadata?.side, "buy");
    assert.equal(particle.metadata?.mint, trade.mint);
    assert.equal(particle.source, "pumpfun");
  });

  it("maps active stars and dying stars with evidence to black-holes", () => {
    const active = starToParticle({
      mint: trade.mint,
      symbol: "ABC",
      state: "active",
      visualDrivers: { volumeSol24h: 12 },
      lastTrade: { side: "buy", priceSol: 0.01, ts: trade.ts },
    });
    assert.equal(active.cosmicKind, "star");
    assert.equal(active.verificationState, "observed");

    const dying = starToParticle({
      mint: trade.mint,
      state: "dying",
      visualDrivers: { score: 0.8 },
      incomplete: false,
    });
    assert.equal(dying.cosmicKind, "black-hole");
    assert.equal(dying.magnitudeBand, 0.8);

    const incompleteDying = starToParticle({
      mint: trade.mint,
      state: "dying",
      incomplete: true,
    });
    assert.equal(incompleteDying.cosmicKind, "star");
    assert.equal(incompleteDying.verificationState, "incomplete");
  });

  it("maps planets with linked mints and exit trail metadata", () => {
    const planet = planetToParticle({
      wallet: trade.wallet,
      linkedMints: [trade.mint],
      exits: [
        {
          mint: trade.mint,
          remainingPct: 0,
          isFullExit: true,
          solReceived: 1.2,
          ts: trade.ts,
        },
      ],
    });
    assert.equal(planet.cosmicKind, "planet");
    assert.deepEqual(planet.metadata?.linkedMints, [trade.mint]);
    assert.equal(planet.metadata?.hasExitTrails, true);
  });

  it("omits incomplete dying and exit events (honest empty)", () => {
    const dyingIncomplete: FieldV0DyingEvent = {
      v: 1,
      chain: "solana",
      ts: trade.ts,
      source: "derived",
      mint: trade.mint,
      sig: null,
      type: "token.dying",
      reason: ["liquidity_drain"],
      score: 0.9,
      incomplete: true,
    };
    assert.equal(dyingToParticle(dyingIncomplete), null);

    const exitIncomplete: FieldV0HolderExitEvent & { incomplete?: boolean } = {
      v: 1,
      chain: "solana",
      ts: trade.ts,
      source: "derived",
      mint: trade.mint,
      sig: null,
      type: "holder.exit",
      wallet: trade.wallet,
      soldAmount: 10,
      solReceived: 0.5,
      remainingPct: 0,
      isFullExit: true,
      incomplete: true,
    };
    assert.equal(holderExitToParticle(exitIncomplete), null);
  });

  it("builds a universe snapshot from trade evidence without inventing dying", () => {
    const snapshot = buildUniverseSnapshotFromFieldV0({
      stars: [{ mint: trade.mint, state: "active", lastTrade: { side: "sell", priceSol: 0.1, ts: trade.ts } }],
      planets: [{ wallet: trade.wallet, linkedMints: [trade.mint] }],
      events: [trade],
      options: { galaxyId: "pump-fun" },
    });
    assert.equal(snapshot.galaxyId, "pump-fun");
    assert.equal(snapshot.particles.length, 3);
    assert.ok(snapshot.particles.some((p) => p.cosmicKind === "comet"));
    assert.ok(snapshot.particles.some((p) => p.cosmicKind === "star"));
    assert.ok(snapshot.particles.some((p) => p.cosmicKind === "planet"));
    assert.ok(!snapshot.particles.some((p) => p.cosmicKind === "black-hole"));
    assert.match(snapshot.samplingPolicy, /evidence-only/);
  });
});
