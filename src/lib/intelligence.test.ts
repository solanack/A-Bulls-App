import test from 'node:test';
import assert from 'node:assert/strict';
import { speakFromResolve } from './intelligence.ts';

test('token speech leads with valuation and five-minute activity, keeping FDV distinct', () => {
  const speech = speakFromResolve('token', {ok:true,kind:'solana-token',market:{symbol:'TEST',priceUsd:1,marketCapUsd:500000,fdvUsd:1000000,volumeUsd:{m5:1200,h1:9000},priceChangePct:{m5:-2},pairCreatedAt:Date.now()-86400000},activity:{pressure:{m5:{buys:2,sells:8}}}});
  assert.match(speech,/market cap \$500,000, FDV \$1,000,000/);
  assert.match(speech,/five minutes: down 2.0 percent, \$1,200 volume/);
  assert.match(speech,/2 buys versus 8 sells/);
  assert.ok(speech.indexOf('five minutes') < speech.indexOf('Market age'));
  assert.doesNotMatch(speech,/prototype|rent-exempt|safety claim/);
});
test('missing metrics are never narrated as zero and stale data is disclosed first', () => {
  const speech = speakFromResolve('token', {ok:true,kind:'evm-token',coverage:'stale',market:{symbol:'TEST',marketCapUsd:null,fdvUsd:null}});
  assert.match(speech,/cached observations/);
  assert.match(speech,/Current price and trading activity are unavailable/);
  assert.doesNotMatch(speech,/\$0/);
});
