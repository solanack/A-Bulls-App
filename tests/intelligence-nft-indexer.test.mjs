import assert from 'node:assert/strict';
import {
  normalizeNftEvent,
  normalizeNftEvents,
  collectionWindows,
  collectionCohorts
} from '../workers/intelligence-nft-indexer.mjs';

const rows = [
  { signature: 'a', blockTime: 100, wallet: 'W1', assetId: 'NFT1', collection: 'COLL', type: 'buy', solValue: 2, metadata: { direction: 'in' } },
  { signature: 'b', blockTime: 200, wallet: 'W1', assetId: 'NFT2', collection: 'COLL', type: 'transfer received', metadata: { direction: 'in' } },
  { signature: 'c', blockTime: 300, wallet: 'W1', assetId: 'NFT1', collection: 'COLL', type: 'sold', solValue: 4, metadata: { direction: 'out' } },
  { signature: 'd', blockTime: 350, wallet: 'W2', assetId: 'NFT3', collection: 'COLL', type: 'buy', solValue: 1, metadata: { direction: 'in' } },
  { signature: 'e', blockTime: 400, wallet: 'W2', assetId: 'NFT4', collection: 'OTHER', type: 'mint' }
];

const first = normalizeNftEvent(rows[0]);
assert.equal(first.eventClass, 'nft-sale');
assert.equal(first.solValue, 2);
assert.equal(first.usdValue, null);

const normalized = normalizeNftEvents(rows);
assert.equal(normalized.length, 5);
assert.equal(normalized[1].eventClass, 'nft-transfer');
assert.equal(normalized[4].eventClass, 'nft-mint');

const windows = collectionWindows(rows, { bucketSeconds: 3600 });
const w1 = windows.find(item => item.wallet === 'W1' && item.collection === 'COLL');
assert.ok(w1);
assert.equal(w1.uniqueAssets, 2);
assert.equal(w1.acquiredCount, 1);
assert.equal(w1.disposedCount, 1);
assert.equal(w1.transferInCount, 1);
assert.equal(w1.observedSolOut, 2);
assert.equal(w1.observedSolIn, 4);

const cohorts = collectionCohorts(rows, { bucketSeconds: 3600 });
const coll = cohorts.find(item => item.collection === 'COLL');
assert.ok(coll);
assert.equal(coll.activeWallets, 2);
assert.equal(coll.acquiringWallets, 2);
assert.equal(coll.disposingWallets, 1);
assert.equal(coll.transferWallets, 1);
assert.equal(coll.eventCount, 4);

console.log('NFT Intelligence Indexer tests passed.');
