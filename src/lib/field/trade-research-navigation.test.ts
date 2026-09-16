import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTradeResearchMode, tradeReplaySelection, TRADE_RESEARCH_ACTIONS } from "./trade-research-navigation.ts";

const wallet="9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU";
const mint="5761e8gCMZFBHLU4RuFsfkWab96oJEtEr3uoF9A4pump";
const evmWallet="0x1111111111111111111111111111111111111111";
const evmToken="0x2222222222222222222222222222222222222222";
const evmQuote="0x3333333333333333333333333333333333333333";

test("selected Fomo trade opens an event-centered wallet-token Replay context without a 24h ceiling",()=>{
  const now=1_789_560_000_000,observed=now-60_000,selection=tradeReplaySelection({id:"trade-1",eventId:"sig-1",verificationState:"observed",observedAt:observed,metadata:{wallet,mint}},null,now);
  assert.ok(selection);
  assert.equal(selection.chainKey,"solana");
  assert.equal(selection.wallet,wallet);
  assert.equal(selection.mint,mint);
  assert.equal(selection.replayCursor,0);
  assert.deepEqual(selection.evidenceIds,["sig-1"]);
  assert.equal(selection.fromTs,observed-60*60*1000);
  assert.equal(selection.toTs,now);
});

test("closed EVM trades preserve their real chain and entry-to-exit span with bounded chart context",()=>{
  const now=1_789_560_000_000,entry=now-20*24*60*60*1000,exit=now-5*24*60*60*1000;
  const selection=tradeReplaySelection({id:"base-trade",observedAt:exit,metadata:{chain:"base",wallet:evmWallet,tokenAddress:evmToken,quoteAddress:evmQuote,createdAt:entry,closedAt:exit}},null,now);
  assert.ok(selection);
  assert.equal(selection.chainKey,"base");
  assert.equal(selection.wallet,evmWallet);
  assert.equal(selection.mint,evmToken);
  assert.equal(selection.quoteMint,evmQuote);
  assert.ok(selection.fromTs<entry);
  assert.ok(selection.toTs>exit);
  assert.ok(selection.toTs-selection.fromTs>15*24*60*60*1000);
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
    {id:"planet:solana-core:"+mint,observedAt:now,metadata:{mint}},
    {id:"provider-trade",observedAt:now,eventId:"fomo:provider-event",verificationState:"provider-reported" as const,metadata:{mint}},
  ]) {
    const selection=tradeReplaySelection(particle,wallet,now);
    assert.deepEqual(selection?.evidenceIds,[]);
    assert.equal(selection?.replayCursor,0);
  }
});