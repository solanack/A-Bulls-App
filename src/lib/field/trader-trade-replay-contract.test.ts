import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const fieldOS=readFileSync(new URL("./field-os.ts",import.meta.url),"utf8");
const replay=readFileSync(new URL("../../components/replay-workspace.tsx",import.meta.url),"utf8");

test("Fomo trader comets and token planets open the selected wallet-token Replay",()=>{
  assert.match(fieldOS,/fieldSection\.kind==="trader-system"&&\(particle\.cosmicKind==="comet"\|\|particle\.cosmicKind==="planet"\)&&mint/);
  assert.match(fieldOS,/tradeReplaySelection\(particle,this\.fieldSection\.wallet\)/);
  assert.match(fieldOS,/saveResearchThread\(createResearchThreadContext\(\{\.\.\.selected/);
  assert.match(fieldOS,/this\.mode="replay"/);
});

test("Replay chart renders trader buys and sells without inventing execution price",()=>{
  assert.match(replay,/TRADER BUY\/SELL RECEIPTS/);
  assert.match(replay,/replay-trade-marker--buy/);
  assert.match(replay,/replay-trade-marker--sell/);
  assert.match(replay,/time marker only; execution price unavailable/);
  assert.match(replay,/Marker height uses indexed execution price/);
});

test("selected trade exposes the downstream research tools",()=>{
  assert.match(replay,/aria-label="Research this selected trade"/);
  assert.match(replay,/TRADE_RESEARCH_ACTIONS/);
  assert.match(replay,/requestTradeResearchMode/);
});

test("Replay automatically re-reads a queued tape until receipts and candles arrive",()=>{
  assert.match(replay,/MAX_HYDRATION_ATTEMPTS=18/);
  assert.match(replay,/marketPending/);
  assert.match(replay,/historyPending/);
  assert.match(replay,/tool:"replay"/);
  assert.match(replay,/BUILDING REPLAY/);
  assert.match(replay,/chart will start automatically/i);
});
