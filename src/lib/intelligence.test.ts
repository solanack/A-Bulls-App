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
test('Grey keeps a cited thesis as user speech after observed market facts and never judges it', () => {
  const speech = speakFromResolve('token', {
    ok:true,
    kind:'solana-token',
    market:{symbol:'TEST',marketCapUsd:500000,liquidityUsd:50000},
    theses:{
      coverage:'fresh',
      count:1,
      records:[{
        id:'thesis-1',
        claim:'Market cap will double.',
        status:'resolved',
        resolution:{
          atPublishMarketCap:500000,
          atResolveMarketCap:600000,
          atPublishLiquidity:50000,
          atResolveLiquidity:55000,
          atPublishTopHolderPct:null,
          atResolveTopHolderPct:null,
          evidenceQuality:'partial',
          resolvedAt:Date.now(),
        },
      }],
    },
  });
  assert.ok(speech.indexOf('market cap $500,000') < speech.indexOf('1 cited claim is on record'));
  assert.match(speech,/User claim: “Market cap will double\.”/);
  assert.match(speech,/Observed after 24 hours:/);
  assert.doesNotMatch(speech,/(thesis was right|thesis was wrong|correct call|verdict)/i);
});
