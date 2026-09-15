import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateTraderHoldings, holdingsDisclosure, HOLDINGS_METHOD } from './intelligence-research-holdings.mjs';

const round = (mint, status, extras = {}) => ({ mint, status, method: HOLDINGS_METHOD, ...extras });

test('aggregates matched realized SOL by mint and never treats missing PnL as zero', () => {
  const items = aggregateTraderHoldings([
    round('mint-a', 'closed', { matchedRealizedSol: 1.25, exitTs: 200 }),
    round('mint-a', 'closed', { matchedRealizedSol: -0.25, exitTs: 250 }),
    round('mint-b', 'open', { observedInventory: 40, matchedRealizedSol: null, entryTs: 300 }),
    round('mint-c', 'closed', { matchedRealizedSol: null, exitTs: 400 }),
  ], [
    { mint: 'mint-a', name: 'Alpha', symbol: 'ALP' },
    { mint: 'mint-b', name: 'Beta', symbol: 'BET' },
  ]);
  assert.equal(items.length, 3);
  assert.equal(items[0].mint, 'mint-b');
  assert.equal(items[0].matchedRealizedSol, null);
  assert.equal(items[0].observedInventory, 40);
  assert.equal(items[0].name, 'Beta');
  const alpha = items.find((item) => item.mint === 'mint-a');
  assert.equal(alpha.matchedRealizedSol, 1);
  assert.equal(alpha.name, 'Alpha');
  const unknown = items.find((item) => item.mint === 'mint-c');
  assert.equal(unknown.matchedRealizedSol, null);
  assert.equal(unknown.name, null);
  assert.equal(unknown.closedCount, 1);
  assert.equal(unknown.closedMatchedCount, 0);
});

test('excludes unmatched sells instead of inventing cost basis', () => {
  const items = aggregateTraderHoldings([
    round('mint-a', 'unmatched', { sellSol: 2, matchedRealizedSol: null }),
    round('mint-a', 'closed', { matchedRealizedSol: 0.5, exitTs: 10 }),
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].matchedRealizedSol, 0.5);
  assert.equal(items[0].closedCount, 1);
});

test('honest empty stays empty and matched zero remains a real zero', () => {
  assert.deepEqual(aggregateTraderHoldings([]), []);
  assert.match(holdingsDisclosure(0), /Empty coverage stays empty/);
  const items = aggregateTraderHoldings([round('mint-z', 'closed', { matchedRealizedSol: 0, exitTs: 1 })]);
  assert.equal(items[0].matchedRealizedSol, 0);
  assert.match(holdingsDisclosure(1), /matched realized SOL/);
});
