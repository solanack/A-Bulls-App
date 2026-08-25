import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWalletComparisonStoryWhatIf, walletComparisonWhatIfClaim } from './wallet-comparison-what-if.mjs';

const bundle={storyType:'wallet-comparison',evidence:[{id:'a1',source:'rpc'}],replay:{events:[{id:'a1',wallet:'A',timestamp:1000,side:'buy'},{id:'a2',wallet:'A',timestamp:2000,side:'transfer'},{id:'b1',wallet:'B',timestamp:3000,side:'sell'}]}};

test('builds simulation only from explicitly selected source wallet buy sell events',()=>{const result=buildWalletComparisonStoryWhatIf(bundle,{sourceWallet:'A',targetWallet:'B'});assert.deepEqual(result.events.map(event=>event.id),['story-whatif-1-a1']);assert.equal(result.events[0].wallet,'B');assert.equal(result.events[0].hypothetical,true);assert.equal(result.events[0].verification,'simulation');assert.deepEqual(result.evidenceIds,['a1']);assert.match(result.disclosure,/Hypothetical replay/);});
test('builds inferred manifest claim linked to observed source receipts',()=>{const whatIf=buildWalletComparisonStoryWhatIf(bundle,{sourceWallet:'A',targetWallet:'B'}),claim=walletComparisonWhatIfClaim({...bundle,whatIf});assert.equal(claim.kind,'inferred');assert.deepEqual(claim.evidenceIds,['a1']);assert.match(claim.statement,/hypothetical replay/i);assert.match(claim.disclosure,/does not claim/i);});
test('requires distinct explicit source and target wallets',()=>{assert.throws(()=>buildWalletComparisonStoryWhatIf(bundle,{sourceWallet:'A',targetWallet:'A'}),/distinct/);});
