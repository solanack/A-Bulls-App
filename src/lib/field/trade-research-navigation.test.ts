import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTradeResearchMode, tradeReplaySelection, TRADE_RESEARCH_ACTIONS } from "./trade-research-navigation.ts";

const wallet="9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU";
const mint="5761e8gCMZFBHLU4RuFsfkWab96oJEtEr3uoF9A4pump";

test("selected Fomo trade opens a bounded wallet-token Replay context",()=>{
  const now=1_789_560_000_000,observed=now-60_000,selection=tradeReplaySelection({id:"trade-1",eventId:"sig-1",verificationState:"observed",observedAt:observed,metadata:{wallet,mint}},null,now);
  assert.ok(selection);
  assert.equal(selection.wallet,wallet);
  assert.equal(selection.mint,mint);
  assert.equal(selection.replayCursor,0);
  assert.deepEqual(selection.evidenceIds,["sig-1"]);
  assert.equal(selection.fromTs,observed-12*60*60*1000);
  assert.equal(selection.toTs,now);
});

test("selected trade or trader token planet can inherit the focused trader wallet but never invents a subject",()=>{
  const selected=tradeReplaySelection({id:"trade-2",eventId:"sig-2",observedAt:1_789_500_000_000,metadata:{mint}},wallet,1_789_560_000_000);
  assert.equal(selected?.wallet,wallet);
  assert.equal(selected?.mint,mint);
  assert.equal(tradeReplaySelection({id:"trade-3",observedAt:1_789_500_000_000,metadata:{mint}},null,1_789_560_000_000),null);
});

test("Replay exposes the selected trade research tool family including Index",()=>{
  assert.deepEqual(TRADE_RESEARCH_ACTIONS.map(item=>item.mode),["trickster","compare","what-if","index","evidence","sequences","ghost"]);
  assert.equal(normalizeTradeResearchMode("trickster"),"trickster");
  assert.equal(normalizeTradeResearchMode("what-if"),"what-if");
  assert.equal(normalizeTradeResearchMode("index"),"index");
  assert.equal(normalizeTradeResearchMode("query"),null);
});

test("provider context and planet IDs never become observed Replay receipts",()=>{
  const now=1_789_560_000_000;
  for(const particle of [
    {id:"planet:solana-core:"+mint,metadata:{mint}},
    {id:"provider-trade",eventId:"fomo:provider-event",verificationState:"provider-reported" as const,metadata:{mint}},
  ]) {
    const selection=tradeReplaySelection(particle,wallet,now);
    assert.deepEqual(selection?.evidenceIds,[]);
    assert.equal(selection?.replayCursor,0);
  }
});
