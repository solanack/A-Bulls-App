import test from 'node:test';
import assert from 'node:assert/strict';
import { reconstructMarketSequence } from './market-sequence-reconstruction.mjs';

const base={
  subject:{mint:'Token111111111111111111111111111111111',quoteMint:null},
  window:{bucketSeconds:60},
  events:[
    {id:'e1',signature:'e1',timestamp:1000,wallet:'WalletA11111111111111111111111111111111',side:'buy',tokenDelta:10,programId:'ProgA'},
    {id:'e2',signature:'e2',timestamp:2000,wallet:'WalletB11111111111111111111111111111111',side:'sell',tokenDelta:-50,programId:'ProgA'},
    {id:'e3',signature:'e3',timestamp:3000,wallet:'WalletC11111111111111111111111111111111',side:'buy',tokenDelta:25,programId:'ProgB'}
  ],
  candles:[]
};

test('reconstructs ordered evidence beats without inventing route or price context',()=>{
  const result=reconstructMarketSequence(base);
  assert.equal(result.beats[0].id,'opening-event');
  assert.ok(result.beats.some(beat=>beat.id==='participation-expansion'));
  assert.ok(result.beats.some(beat=>beat.id==='largest-token-delta'));
  const shift=result.beats.find(beat=>beat.id==='program-context-change');
  assert.ok(shift);
  assert.match(shift.statement,/program context changes/i);
  assert.match(shift.statement,/does not assert a DEX route or venue/i);
  assert.equal(result.beats.some(beat=>beat.id==='explicit-price-aftermath'),false);
  assert.equal(result.priceEvidence,null);
  assert.ok(result.claims.every(claim=>claim.evidenceIds.length>0));
});

test('adds selected quote-market movement only when explicit quote candles exist',()=>{
  const bundle={...base,subject:{...base.subject,quoteMint:'Quote111111111111111111111111111111111'},candles:[
    {timestamp:1000,close:1,sources:['indexed-candles']},
    {timestamp:3000,close:1.1,sources:['indexed-candles']}
  ]};
  const result=reconstructMarketSequence(bundle);
  const priceBeat=result.beats.find(beat=>beat.id==='explicit-price-aftermath');
  assert.ok(priceBeat);
  assert.match(priceBeat.statement,/explicitly selected/i);
  assert.match(priceBeat.statement,/\+10\.00%/);
  assert.ok(result.priceEvidence);
  const priceClaim=result.claims.find(claim=>claim.id==='sequence-selected-price-movement');
  assert.deepEqual(priceClaim.evidenceIds,[result.priceEvidence.id]);
});

test('missing numeric token deltas remain absent from largest-delta reconstruction',()=>{
  const result=reconstructMarketSequence({...base,events:[{id:'a',timestamp:1000,wallet:'W1',side:'buy',tokenDelta:null},{id:'b',timestamp:2000,wallet:'W2',side:'sell',tokenDelta:undefined}]});
  assert.equal(result.beats.some(beat=>beat.id==='largest-token-delta'),false);
});
