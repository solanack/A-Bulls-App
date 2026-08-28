import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWalletTokenComparison, comparisonObservations, buildCounterfactualOverlay } from './trade-comparison-replay.mjs';

const events=[
  {id:'a1',timestamp:1000,side:'buy',wallet:'A',token:'T',amount:100,valueUsd:1000,evidenceId:'e1'},
  {id:'b1',timestamp:1500,side:'buy',wallet:'B',token:'T',amount:50,valueUsd:600,evidenceId:'e2'},
  {id:'a2',timestamp:2000,side:'buy',wallet:'A',token:'T',amount:40,valueUsd:500,evidenceId:'e3'},
  {id:'b2',timestamp:2500,side:'sell',wallet:'B',token:'T',amount:20,valueUsd:300,evidenceId:'e4'},
  {id:'a3',timestamp:3500,side:'sell',wallet:'A',token:'T',amount:30,valueUsd:450,evidenceId:'e7'},
  {id:'x',timestamp:3600,side:'buy',wallet:'C',token:'T',amount:999,valueUsd:9999,evidenceId:'e5'},
  {id:'other-token',timestamp:3700,side:'buy',wallet:'A',token:'OTHER',amount:1,valueUsd:1,evidenceId:'e6'}
];

test('comparison scopes replay to two wallets and one token',()=>{
  const result=buildWalletTokenComparison({events,walletA:'A',walletB:'B',token:'T'});
  assert.deepEqual(result.timeline.events.map(event=>event.id),['a1','b1','a2','b2','a3']);
  assert.equal(result.summaries.walletA.tradeCount,3);
  assert.equal(result.summaries.walletA.buys,2);
  assert.equal(result.summaries.walletB.sells,1);
  assert.equal(result.summaries.walletA.grossObservedAmount,170);
  assert.equal(result.summaries.walletA.netObservedAmount,110);
  assert.equal(result.summaries.walletA.firstTradeAt,1000);
  assert.equal(result.summaries.walletA.lastTradeAt,3500);
  assert.equal(result.summaries.walletA.directionChanges,1);
  assert.equal(result.summaries.walletA.peakCumulativeIncrease,140);
  assert.match(result.summaries.walletA.disclosure,/not a complete wallet balance, cost basis, P&L/);
});

test('comparison calculates timing without inferring strategy or profit',()=>{
  const result=buildWalletTokenComparison({events,walletA:'A',walletB:'B',token:'T'});
  assert.equal(result.timing.firstTradeGapMs,500);
  assert.equal(result.timing.earlierFirstTrade,'A');
  assert.equal(result.timing.activePeriodsOverlap,true);
  assert.match(result.disclosure,/does not infer intent, identity, strategy, profitability/);
});

test('comparison observations are calculated, evidenced, and avoid intent claims',()=>{
  const result=buildWalletTokenComparison({events,walletA:'A',walletB:'B',token:'T'});
  const observations=comparisonObservations(result);
  assert.ok(observations.some(item=>item.metric==='trade-count'));
  assert.ok(observations.some(item=>item.metric==='gross-token-flow'));
  assert.ok(observations.some(item=>item.metric==='first-trade-gap'));
  assert.ok(observations.every(item=>item.kind==='calculated'));
  assert.ok(observations.every(item=>Array.isArray(item.evidenceIds)));
  assert.ok(observations.every(item=>!/(wanted|believed|felt|intended|profited|smart|bad trader)/i.test(item.statement)));
});

test('what-if overlay mirrors timing but preserves simulation disclosure',()=>{
  const result=buildWalletTokenComparison({events,walletA:'A',walletB:'B',token:'T'});
  const overlay=buildCounterfactualOverlay({comparison:result,sourceWallet:'A',targetWallet:'B'});
  assert.equal(overlay.events.length,3);
  assert.ok(overlay.events.every(event=>event.wallet==='B'&&event.hypothetical===true&&event.verification==='simulation'));
  assert.ok(/Hypothetical/.test(overlay.disclosure));
  assert.ok(/does not claim/i.test(overlay.disclosure));
  assert.ok(/profitability/.test(overlay.disclosure));
});
