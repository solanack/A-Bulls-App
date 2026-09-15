import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTricksterDirectorCues,buildTricksterSimulationCue,buildCutShareSvg,__tricksterUniverseDirectorContract} from './trickster-universe-director.mjs';

test('observed director cues stay bounded and evidence referenced',()=>{
  const timeline=Array.from({length:100},(_,i)=>({id:`e${i}`,signature:`sig${i}`,timestamp:1000+i,kind:'trade',side:i%2?'buy':'sell',magnitude:.6,token:'TokenAddressExample123456789',wallet:'WalletAddressExample123456789'}));
  const cues=buildTricksterDirectorCues(timeline);
  assert.ok(cues.length<=24);assert.ok(cues.every(c=>c.claimKind==='observed'&&c.evidenceId));
});

test('simulation cue is unmistakably disclosed',()=>{
  const cue=buildTricksterSimulationCue({at:5,summary:'Held instead of selling'});
  assert.equal(cue.claimKind,'simulated');assert.match(cue.disclosure,/not an observed blockchain event/i);
});

test('director contract makes no network calls',()=>{
  assert.equal(__tricksterUniverseDirectorContract.noNetworkCalls,true);assert.equal(__tricksterUniverseDirectorContract.simulationAlwaysDisclosed,true);
});

test('vertical share SVG burns INDEXED receipts and stays honest without OHLC',()=>{
  const svg=buildCutShareSvg({
    manifest:{output:{aspectRatio:'9:16'},coverage:{from:1_700_000_000,to:1_700_086_400,statement:'Currently indexed evidence only.'},evidence:[{signature:'Sig11111111111111111111111111111111111111111'}]},
    shareHref:'https://abullsapp.com/?cut=abc',
    candles:[{timestamp:1,open:1,high:2,low:0.5,close:1.5},{timestamp:2,open:1.5,high:2.2,low:1.1,close:1.2}],
    tokenLabel:'Pons · PONS'
  });
  assert.match(svg, /width="1080"/);
  assert.match(svg, /height="1920"/);
  assert.match(svg,/INDEXED/);
  assert.match(svg,/VERIFY https:\/\/abullsapp.com\/\?cut=abc/);
  assert.match(svg,/SIG Sig11111/);
  const empty=buildCutShareSvg({manifest:{output:{aspectRatio:'9:16'},coverage:{},evidence:[]},shareHref:'https://x/?cut=1',candles:[]});
  assert.match(empty,/No indexed OHLC/);
  assert.match(empty,/No price path was invented/);
  assert.match(empty,/signature unavailable/);
});

