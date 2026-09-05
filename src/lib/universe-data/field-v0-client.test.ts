import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { snapshotFromFieldV0Payloads } from "./field-v0-client.ts";
import type { FieldV0DyingEvent, FieldV0TradeEvent } from "@/lib/field/indexer-field-v0.ts";

const mint = "Mint111111111111111111111111111111111111111";
const wallet = "Wallet1111111111111111111111111111111111111";

const trade: FieldV0TradeEvent = {
  v: 1,
  chain: "solana",
  ts: 1_700_000_000_000,
  source: "pumpfun",
  mint,
  sig: "SigTrade111",
  type: "token.trade",
  side: "buy",
  wallet,
  solAmount: 2.5,
  tokenAmount: 1000,
  priceSol: 0.0025,
  slot: 42,
};

const dyingIncomplete: FieldV0DyingEvent = {
  v: 1,
  chain: "solana",
  ts: trade.ts,
  source: "derived",
  mint,
  sig: null,
  type: "token.dying",
  reason: ["activity_collapse"],
  score: 0.8,
  incomplete: true,
};

describe("field-v0-client", () => {
  it("builds trade pulses without inventing black holes from incomplete dying", () => {
    const snapshot = snapshotFromFieldV0Payloads({
      stars: [
        {
          mint,
          state: "dying",
          incomplete: true,
          visualDrivers: { score: 0.8, volumeSol24h: 1 },
          lastTrade: { side: "sell", priceSol: 0.01, ts: trade.ts },
        },
      ],
      events: [trade, dyingIncomplete],
      galaxyId: "pump-fun",
    });

    assert.ok(snapshot.particles.some((p) => p.cosmicKind === "comet"));
    assert.ok(snapshot.particles.some((p) => p.cosmicKind === "star"));
    assert.ok(
      !snapshot.particles.some((p) => p.cosmicKind === "black-hole"),
      "producer incomplete dying must not become black-hole visuals",
    );
  });
});
