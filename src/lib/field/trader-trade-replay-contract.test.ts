import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const fieldOS=readFileSync(new URL("./field-os.ts",import.meta.url),"utf8");
const replay=readFileSync(new URL("../../components/replay-workspace.tsx",import.meta.url),"utf8");
const workspace=readFileSync(new URL("../../components/universe-workspace.tsx",import.meta.url),"utf8");
const appShell=readFileSync(new URL("../../components/app-shell.tsx",import.meta.url),"utf8");
const closedTrades=readFileSync(new URL("../../components/fomo-closed-trades.tsx",import.meta.url),"utf8");

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

test("Replay omits the Solana WSOL default for an EVM wallet-token subject",()=>{
  assert.match(workspace,/evmSubject=\/\^0x/);
  assert.match(workspace,/effectiveQuote=evmSubject/);
  assert.match(workspace,/effectiveQuote\?\{quoteMint:effectiveQuote\}/);
});

test("Replay shows source-labeled provider USD trade price points while real OHLC is hydrating or unavailable",()=>{
  assert.match(replay,/ReplayProviderPriceTape/);
  assert.match(replay,/PROVIDER-REPORTED TRADE PRICE POINTS/);
  assert.match(replay,/NOT OHLC/);
  assert.match(replay,/NO INTERPOLATED PATH/);
});


test("Replay renders a deterministic time-axis visual when trade timing exists but price history does not",()=>{
  assert.match(replay,/ReplayEventTimeline/);
  assert.match(replay,/TRADE EVENT TIMELINE/);
  assert.match(replay,/PRICE EVIDENCE UNAVAILABLE/);
  assert.match(replay,/NO INVENTED PRICE PATH/);
});


test("closed Fomo outcomes preserve the selected blockchain into Replay",()=>{
  assert.match(appShell,/chainKey:trade\.chain/);
  assert.match(closedTrades,/trade\.chain\.toUpperCase\(\)/);
  assert.match(closedTrades,/CANDLES READY/);
  assert.doesNotMatch(closedTrades,/maximumFractionDigits:0\}\);/);
});
