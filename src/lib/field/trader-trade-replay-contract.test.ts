import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const fieldOS=readFileSync(new URL("./field-os.ts",import.meta.url),"utf8");
const replay=readFileSync(new URL("../../components/replay-workspace.tsx",import.meta.url),"utf8");
const workspace=readFileSync(new URL("../../components/universe-workspace.tsx",import.meta.url),"utf8");
const appShell=readFileSync(new URL("../../components/app-shell.tsx",import.meta.url),"utf8");
const closedTrades=readFileSync(new URL("../../components/fomo-closed-trades.tsx",import.meta.url),"utf8");
const trickster=readFileSync(new URL("../../components/trickster-director.tsx",import.meta.url),"utf8");
const recorder=readFileSync(new URL("../trickster-cut-recorder.ts",import.meta.url),"utf8");

test("Fomo trader comets and token planets open the selected wallet-token Replay",()=>{
  assert.match(fieldOS,/fieldSection\.kind==="trader-system"&&\(particle\.cosmicKind==="comet"\|\|particle\.cosmicKind==="planet"\)&&mint/);
  assert.match(fieldOS,/tradeReplaySelection\(particle,this\.fieldSection\.wallet\)/);
  assert.match(fieldOS,/saveResearchThread\(createResearchThreadContext\(\{\.\.\.selected/);
  assert.match(fieldOS,/this\.mode="replay"/);
});

test("Replay chart renders trader buys and sells without inventing execution price",()=>{
  assert.match(replay,/TRADER RECEIPTS/);
  assert.match(replay,/replay-trade-marker--buy/);
  assert.match(replay,/replay-trade-marker--sell/);
  assert.match(replay,/time marker only; execution price unavailable/);
  assert.match(replay,/Candle and volume geometry comes only from indexed market evidence/);
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


test("Replay is a full-screen creator-oriented Studio with presentation-only controls",()=>{
  assert.match(replay,/REPLAY STUDIO/);
  assert.match(replay,/CINEMA/);
  assert.match(replay,/MAKE CUT/);
  assert.match(replay,/replay-workspace--fullscreen/);
  assert.match(replay,/data-fx=\{fxLevel\}/);
  assert.match(replay,/COSMIC/);
  assert.match(replay,/VOLUME/);
  assert.match(replay,/CINEMA MODE changes presentation only/);
});

test("Trickster Cut export accepts user soundtrack audio and keeps it separate from evidence",()=>{
  assert.match(trickster,/UPLOAD YOUR TRACK/);
  assert.match(trickster,/I have the right to use this track/);
  assert.match(trickster,/A BULLS ORIGINAL/);
  assert.match(trickster,/A Bulls originals are synthesized in-browser/);
  assert.match(trickster,/musicFile,musicPreset,musicVolume,sfxPack/);
  assert.match(recorder,/decodeMusic/);
  assert.match(recorder,/scheduleMusic/);
  assert.match(recorder,/scheduleProceduralMusic/);
  assert.match(recorder,/CutMusicPreset/);
  assert.match(recorder,/musicIncluded/);
  assert.match(recorder,/CutSoundPack/);
});


test("Trickster ships built-in rights-safe procedural soundtrack choices for mobile creators",()=>{
  assert.match(trickster,/A BULLS ORIGINAL/);
  assert.match(trickster,/A Bulls originals are synthesized in-browser/);
  assert.match(trickster,/Pulse/);
  assert.match(trickster,/Nebula/);
  assert.match(trickster,/Drive/);
});
