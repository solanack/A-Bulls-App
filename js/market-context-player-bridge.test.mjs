import test from 'node:test';
import assert from 'node:assert/strict';
import { marketReplayPriceOptions, selectedPricePairForOption } from './market-context-player-bridge.mjs';

const quoteA='A'.repeat(32),quoteB='B'.repeat(32);
const context={pricePairs:[
  {quoteMint:quoteA,bucketSeconds:60,candles:[{timestamp:1000,open:1,high:1,low:1,close:1}]},
  {quoteMint:quoteB,bucketSeconds:300,candles:[{timestamp:2000,open:2,high:2,low:2,close:2}]}
]};

test('price options always default to time-only and keep quote markets separate',()=>{
  const options=marketReplayPriceOptions(context);
  assert.equal(options[0].id,'time-only');
  assert.equal(options[0].candles.length,0);
  assert.equal(options.length,3);
  assert.equal(options[1].quoteMint,quoteA);
  assert.equal(options[1].bucketSeconds,60);
  assert.equal(options[2].quoteMint,quoteB);
  assert.equal(options[2].bucketSeconds,300);
});

test('selected story/replay price pair resolves only the explicit labeled market',()=>{
  const options=marketReplayPriceOptions(context);
  assert.equal(selectedPricePairForOption(context,options[0]),null);
  assert.equal(selectedPricePairForOption(context,options[2]).quoteMint,quoteB);
  assert.equal(selectedPricePairForOption(context,options[2]).bucketSeconds,300);
});
