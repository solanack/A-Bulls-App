import test from 'node:test';
import assert from 'node:assert/strict';
import { dataCompleteness, distributionsFromClosedRows, median, profitConcentration, summarizeTradePnls } from './intelligence-distribution-metrics.mjs';

test('median and top-trade profit share ignore losses in the concentration denominator',()=>{
  assert.equal(median([10,1,-1,-2,-3]),-1);
  assert.equal(median([1,3]),2);
  assert.equal(median([]),null);
  const share=profitConcentration([10,1,-4]);
  assert.ok(Math.abs(share.top1-(10/11))<1e-9);
  assert.equal(share.top3,1);
  assert.equal(profitConcentration([-2,-3]).top1,null);
});

test('net of fees stays null unless every trade has an observed fee',()=>{
  const gross=summarizeTradePnls([2,-1]);
  assert.equal(gross.grossPnl,1);
  assert.equal(gross.netOfFeesPnl,null);
  const net=summarizeTradePnls([2,-1],[0.25,0.25]);
  assert.equal(net.netOfFeesPnl,0.5);
  assert.equal(net.observedFees,0.5);
  const missing=summarizeTradePnls([2,-1],[0.25,null]);
  assert.equal(missing.netOfFeesPnl,null);
});

test('provider closed trades are not marked chain-matched and a one-trade sample is insufficient',()=>{
  const thin=dataCompleteness({sampleSize:1,tokenCount:1,providerBasisUnverified:true,fresh:true});
  assert.equal(thin.state,'insufficient');
  assert.equal(thin.sampleSufficient,false);
  const wide=dataCompleteness({sampleSize:6,tokenCount:2,providerBasisUnverified:true,fresh:true});
  assert.equal(wide.state,'partial');
  assert.equal(wide.costBasisMatched,false);
  assert.ok(wide.reasons.includes('provider-reported-basis-not-verified'));
  const rows=[
    {handle:'Ada',token_address:'mint-a',realized_pnl_usd:10,trade_count:2},
    {handle:'ada',token_address:'mint-b',realized_pnl_usd:-4,trade_count:2},
  ];
  const grouped=distributionsFromClosedRows(rows,{capturedAtMs:1_000,nowMs:1_000,freshSeconds:10});
  const ada=grouped.get('ada');
  assert.equal(ada.distribution.sampleSize,2);
  assert.equal(ada.distribution.tokenCount,2);
  assert.equal(ada.distribution.medianTradePnl,3);
  assert.equal(ada.distribution.netOfFeesPnl,null);
  assert.equal(ada.distribution.feeTreatment,'provider-reported-fees-not-in-feed');
  assert.equal(ada.completeness.fresh,true);
});
