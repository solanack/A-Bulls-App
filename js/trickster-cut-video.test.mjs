import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCutFrameModel,buildSceneNarration,headlineMetricFromClaims,normalizeCutCandles,observedEntryExitPriceDelta,preferredCutVideoMime,__tricksterCutVideoContract} from './trickster-cut-video.mjs';
import {autoSelectTricksterMoment,buildTricksterDirectorCues} from './trickster-universe-director.mjs';

test('Auto Cut centers a bounded receipt window on the strongest observed magnitude',()=>{
  const events=Array.from({length:9},(_,index)=>({id:`event-${index}`,timestamp:1000+index,side:index%2?'buy':'sell',magnitude:index===6?.95:.2}));
  const selected=autoSelectTricksterMoment(events,5);
  assert.equal(selected.length,5);
  assert.ok(selected.some(row=>row.receiptId==='event-6'));
  assert.equal(Math.max(...selected.map(row=>row.magnitude)),.95);
  const cues=buildTricksterDirectorCues(events);
  assert.ok(cues.some(cue=>cue.magnitude===.95));
});

test('entry-to-exit metric requires directly observed same-unit receipt prices',()=>{
  const metric=observedEntryExitPriceDelta([{side:'buy',priceSol:2,timestamp:1},{side:'sell',priceSol:2.5,timestamp:2}]);
  assert.equal(metric.unit,'SOL');
  assert.equal(metric.display,'+25.00%');
  assert.match(metric.statement,/Observed entry-to-exit SOL price delta/);
  assert.equal(observedEntryExitPriceDelta([{side:'buy',priceSol:2},{side:'sell',priceUsd:3}]),null);
  assert.equal(observedEntryExitPriceDelta([{side:'buy',priceSol:2}]),null);
});

test('frame model maps one frozen scene to candles, exact receipt marker, captions and VERIFY watermark',()=>{
  const manifest={output:{aspectRatio:'9:16'},subject:{id:'wallet:mint'},coverage:{statement:'Currently indexed evidence only.'},evidence:[{id:'receipt-0',signature:'sig-1'}],claims:[{id:'claim-0',kind:'observed',statement:'BUY observed for selected token.',evidenceIds:['receipt-0']},{id:'metric-0',kind:'calculated',statement:'Observed entry-to-exit SOL price delta: +12.50%.',evidenceIds:['receipt-0']}],scenes:[{id:'scene-0',durationFrames:144,claimIds:['claim-0','metric-0']}]};
  const candles=[{timestamp:1000,open:1,high:1.1,low:.9,close:1.05},{timestamp:2000,open:1.05,high:1.2,low:1,close:1.15},{timestamp:3000,open:1.15,high:1.25,low:1.1,close:1.2}];
  const model=buildCutFrameModel({manifest,candles,events:[{timestamp:2000,side:'buy',signature:'sig-1'}],sceneIndex:0,progress:1,shareHref:'https://abullsapp.com/?cut=abc',tokenLabel:'TOKEN',walletLabel:'WALLET'});
  assert.deepEqual(model.size,{w:1080,h:1920});
  assert.equal(model.markerVisible,true);
  assert.equal(model.metric.display,'+12.50%');
  assert.match(model.caption.eyebrow,/BUY RECEIPT/);
  assert.equal(model.shareHref,'https://abullsapp.com/?cut=abc');
  assert.match(model.narration.grey,/BUY observed/);
  assert.match(model.narration.trickster,/Interpretation:/);
});

test('missing OHLC stays missing in frame model',()=>{
  const manifest={output:{aspectRatio:'1:1'},coverage:{statement:'No OHLC retained.'},claims:[{id:'c',kind:'observed',statement:'Receipt observed.',evidenceIds:['r']}],evidence:[{id:'r',signature:'sig'}],scenes:[{id:'s',durationFrames:120,claimIds:['c']}]};
  const model=buildCutFrameModel({manifest,candles:[],events:[{timestamp:2000,signature:'sig'}],progress:1});
  assert.equal(model.rows.length,0);
  assert.equal(model.markerVisible,false);
  assert.equal(model.coverage,'No OHLC retained.');
});

test('candle normalization rejects incomplete OHLC instead of fabricating it',()=>{
  const rows=normalizeCutCandles([{timestamp:1,open:1,high:2,low:.5,close:1.5},{timestamp:2,open:1,high:0,low:0,close:1}]);
  assert.equal(rows.length,1);
});

test('narration keeps Grey fact and Trickster interpretation separate',()=>{
  const lines=buildSceneNarration({claim:{statement:'SELL observed at indexed receipt.'},event:{side:'sell',signature:'signature-123'},index:1,total:3});
  assert.equal(lines.grey,'SELL observed at indexed receipt.');
  assert.match(lines.trickster,/^Interpretation:/);
  assert.doesNotMatch(lines.grey,/Interpretation:/);
});

test('video MIME preference uses MP4 when supported then WebM fallback',()=>{
  assert.match(preferredCutVideoMime(mime=>mime.startsWith('video/mp4')),/^video\/mp4/);
  assert.match(preferredCutVideoMime(mime=>mime==='video/webm;codecs=vp8,opus'),/^video\/webm/);
  assert.equal(__tricksterCutVideoContract.receiptBoundFrames,true);
  assert.equal(__tricksterCutVideoContract.missingOhlcStaysMissing,true);
});

test('headline parser only accepts frozen observed price delta wording',()=>{
  assert.equal(headlineMetricFromClaims([{statement:'Profit was +99%'}]),null);
  assert.equal(headlineMetricFromClaims([{statement:'Observed entry-to-exit USD price delta: -4.20%.'}]).display,'-4.20%');
});
