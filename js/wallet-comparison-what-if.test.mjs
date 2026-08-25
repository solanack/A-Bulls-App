import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWalletComparisonStoryWhatIf } from './wallet-comparison-what-if.mjs';

const bundle={storyType:'wallet-comparison',replay:{events:[{id:'a1',wallet:'A',timestamp:1000,side:'buy'},{id:'a2',wallet:'A',timestamp:2000,side:'transfer'},{id:'b1',wallet:'B',timestamp:3000,side:'sell'}]}};

test('builds simulation only from explicitly selected source wallet buy sell events',()=>{const result=buildWalletComparisonStoryWhatIf(bundle,{sourceWallet:'A',targetWallet:'B'});assert.deepEqual(result.events.map(event=>event.id),['story-whatif-1-a1']);assert.equal(result.events[0].wallet,'B');assert.equal(result.events[0].hypothetical,true);assert.equal(result.events[0].verification,'simulation');assert.match(result.disclosure,/Hypothetical replay/);});
test('requires distinct explicit source and target wallets',()=>{assert.throws(()=>buildWalletComparisonStoryWhatIf(bundle,{sourceWallet:'A',targetWallet:'A'}),/distinct/);});
