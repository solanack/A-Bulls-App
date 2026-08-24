import assert from 'node:assert/strict';
import {
  normalizeIndexedEvents,
  deriveWalletWindow,
  deriveRelationships,
  deriveTokenCohorts,
  intelligenceDb
} from '../workers/intelligence-indexer.mjs';

const wallet = '11111111111111111111111111111111';
const peer = '22222222222222222222222222222222';
const rows = [
  { signature: 'a', blockTime: 100, wallet, counterparty: peer, mint: 'MintA', type: 'buy', tokenDelta: 10, solDelta: -1, feeLamports: 5000 },
  { signature: 'b', blockTime: 200, wallet, counterparty: peer, mint: 'MintA', type: 'sell', tokenDelta: -4, solDelta: .7, feeLamports: 5000 },
  { signature: 'c', blockTime: 300, wallet, mint: 'MintB', type: 'transfer', tokenDelta: 3, solDelta: 0, feeLamports: 5000 }
];

const events = normalizeIndexedEvents(rows, wallet);
assert.equal(events.length, 3);
assert.equal(events[0].eventClass, 'swap-like');
assert.equal(events[2].eventClass, 'transfer');

const summary = deriveWalletWindow(events, wallet, 'test');
assert.equal(summary.txCount, 3);
assert.equal(summary.swaps, 2);
assert.equal(summary.uniqueMints, 2);
assert.equal(summary.solIn, .7);
assert.equal(summary.solOut, 1);
assert.equal(summary.feesSol, 0.000015);

const relationships = deriveRelationships(events, wallet);
assert.equal(relationships.length, 1);
assert.equal(relationships[0].interactionCount, 2);
assert.equal(relationships[0].tokenEventCount, 2);
assert.ok(relationships[0].relationshipTypes.includes('swap-like'));

const cohorts = deriveTokenCohorts(events, 0, 3600);
const a = cohorts.find(row => row.mint === 'MintA');
assert.equal(a.uniqueWallets, 1);
assert.equal(a.inboundWallets, 1);
assert.equal(a.outboundWallets, 1);
assert.equal(a.eventCount, 2);

const fake = { prepare() {} };
assert.equal(intelligenceDb({ LEADERBOARD_DB: fake }), fake);
assert.equal(intelligenceDb({ BULL_INTELLIGENCE_DB: fake }), fake);
assert.equal(intelligenceDb({}), null);

console.log('Intelligence Indexer tests passed.');
