import test from 'node:test';
import assert from 'node:assert/strict';
import { applyExplicitEventStoryPriceSelection } from './event-story-price-selection.mjs';

const quoteA='A'.repeat(32),quoteB='B'.repeat(32),token='T'.repeat(32);
function baseBundle(){return{storyType:'transaction-replay',coverage:{from:900,to:1200},claims:[{id:'selected-event-observed',kind:'observed',evidenceIds:['sig']},{id:'price-after-300',kind:'calculated',evidenceIds:['old-pair']}],evidence:[{id:'sig',signature:'sig',source:'rpc'},{id:'old-pair',source:'candles',sourceReference:'price-pair:old'}],candles:[{timestamp:1}],marketContext:{subject:{mint:token,eventTime:1000000},selectedPricePair:null,pricePairs:[{quoteMint:quoteA,bucketSeconds:60,from:900,to:1200,sources:['candles-a'],candles:[{timestamp:960000,open:1,high:1,low:1,close:1}],after:[{requestedSeconds:300,actualSeconds:360,changePercent:25}]},{quoteMint:quoteB,bucketSeconds:300,from:900,to:1200,sources:['candles-b'],candles:[{timestamp:900000,open:2,high:2,low:2,close:2}],after:[{requestedSeconds:300,actualSeconds:300,changePercent:-10}]}]}};}

test('time-only selection strips automatic price claims and candles',()=>{
  const output=applyExplicitEventStoryPriceSelection(baseBundle());
  assert.equal(output.priceSelection.mode,'time-only');
  assert.equal(output.candles.length,0);
  assert.ok(!output.claims.some(claim=>/^price-after-/.test(claim.id)));
  assert.ok(!output.evidence.some(item=>String(item.sourceReference||'').startsWith('price-pair:')));
});

test('explicit selected pair rebuilds price claims and candles from that exact pair',()=>{
  const input=baseBundle();input.marketContext.selectedPricePair=input.marketContext.pricePairs[1];
  const output=applyExplicitEventStoryPriceSelection(input);
  assert.equal(output.priceSelection.mode,'indexed-quote-pair');
  assert.equal(output.priceSelection.quoteMint,quoteB);
  assert.equal(output.priceSelection.bucketSeconds,300);
  assert.equal(output.candles.length,1);
  assert.equal(output.candles[0].close,2);
  const claim=output.claims.find(item=>item.id==='price-after-300');
  assert.match(claim.statement,/-10\.00%/);
  assert.ok(output.evidence.some(item=>String(item.sourceReference||'').includes(quoteB)));
  assert.ok(!output.evidence.some(item=>String(item.sourceReference||'').includes(quoteA)));
});
