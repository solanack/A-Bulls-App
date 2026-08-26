import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBoundedRetrievalCoverage } from './intelligence-bounded-coverage.mjs';

test('summarizes verified bounded search separately from wallet-history completeness',()=>{
  const summary=summarizeBoundedRetrievalCoverage({verified_window_wallets:2,verified_receipts:3,observed_rows:14,earliest_searched_from:100,latest_searched_to:200},5);
  assert.equal(summary.verifiedWindowWallets,2);
  assert.equal(summary.unverifiedOrUncoveredObservedWallets,3);
  assert.match(summary.statement,/2 of 5 wallets/);
  assert.match(summary.caveat,/does not mark the wallet complete to genesis/i);
});

test('zero verified receipts never becomes a no-activity claim',()=>{
  const summary=summarizeBoundedRetrievalCoverage({},4);
  assert.equal(summary.verifiedWindowWallets,0);
  assert.equal(summary.observedRows,0);
  assert.match(summary.statement,/No verified external bounded-search receipts/);
  assert.doesNotMatch(summary.statement,/no activity/i);
});
