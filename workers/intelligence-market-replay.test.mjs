import assert from 'node:assert/strict';
import { handleMarketReplayRequest, normalizeMarketReplayEvent } from './intelligence-market-replay.mjs';

const missing=normalizeMarketReplayEvent({signature:'sig-missing',wallet:'11111111111111111111111111111111',mint:'11111111111111111111111111111111',event_class:'swap-like',block_time:123,token_delta:null,sol_delta:null,fee_lamports:null,source:'indexed-test'});
assert.equal(missing.side,'trade');
assert.equal(missing.price,null);
assert.equal(missing.tokenDelta,null);
assert.equal(missing.solDelta,null);
assert.equal(missing.feeLamports,null);

const buy=normalizeMarketReplayEvent({signature:'sig-buy',wallet:'11111111111111111111111111111111',mint:'11111111111111111111111111111111',event_class:'swap-like',block_time:124,token_delta:5,sol_delta:-1,fee_lamports:5000,verified:1,source:'indexed-test'});
assert.equal(buy.side,'buy');
assert.equal(buy.tokenDelta,5);
assert.equal(buy.solDelta,-1);
assert.equal(buy.feeLamports,5000);
assert.equal(buy.verification,'verified');

const disabled=await handleMarketReplayRequest(new Request('https://api.example/api/intelligence/market-replay',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),{PLAYABLE_DATA_ENABLED:'false'});
assert.equal(disabled.status,404);
assert.equal((await disabled.json()).error,'feature_disabled');

const mismatch=await handleMarketReplayRequest(new Request('https://api.example/api/other',{method:'POST'}),{});
assert.equal(mismatch,null);

console.log('Token Market Replay truth contract passed');
