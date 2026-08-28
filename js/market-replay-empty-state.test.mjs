import test from 'node:test';
import assert from 'node:assert/strict';
import { marketReplayEmptyCopy } from './market-replay-empty-state.mjs';

test('zero indexed events never become a no-activity claim',()=>{
  const copy=marketReplayEmptyCopy({activity:{walletCount:0},coverage:{status:'coverage-unknown'}});
  assert.equal(copy.title,'NO INDEXED EVIDENCE RETURNED');
  assert.match(copy.detail,/must not be interpreted as proof that no on-chain activity occurred/i);
  assert.match(copy.detail,/coverage is unknown/i);
});

test('observed-wallet coverage remains scoped and never implies complete market coverage',()=>{
  const copy=marketReplayEmptyCopy({activity:{walletCount:3},coverage:{status:'mixed-observed-wallet-coverage'}});
  assert.match(copy.detail,/applies only to the 3 wallets already observed/i);
  assert.match(copy.detail,/does not establish complete market coverage/i);
});
