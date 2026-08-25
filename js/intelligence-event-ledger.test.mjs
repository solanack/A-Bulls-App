import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLedgerRows, buildEventStoryBundle } from './intelligence-event-ledger.mjs';
import { composeGuidedStory } from './trickster-composer.mjs';

const walletA='A'.repeat(32),walletB='B'.repeat(32),token='T'.repeat(32),quote='Q'.repeat(32);

test('builds ordered evidence rows with wallet labels and sources',()=>{const rows=buildLedgerRows([{id:'b',timestamp:2000,wallet:walletB,side:'sell',tokenDelta:-5,verification:'finalized',sources:['rpc','archive'],signature:'sig-b'},{id:'a',timestamp:1000,wallet:walletA,side:'buy',tokenDelta:10,verification:'confirmed',source:'rpc',signature:'sig-a'}],{wallets:[walletA,walletB]});assert.equal(rows.length,2);assert.equal(rows[0].id,'a');assert.equal(rows[0].walletLabel,'Wallet A');assert.equal(rows[0].amount,10);assert.deepEqual(rows[0].sources,['rpc']);assert.equal(rows[1].walletLabel,'Wallet B');assert.equal(rows[1].side,'sell');});

test('preserves indexed event inspector context and direct execution evidence',()=>{const rows=buildLedgerRows([{id:'swap-1',signature:'sig-1',timestamp:3000000,slot:44,wallet:walletA,token,side:'buy',tokenDelta:12.5,solDelta:-1.2,price:.1,feeLamports:5000,counterparty:'C'.repeat(32),programId:'P'.repeat(32),confidence:.91,verification:'verified',sources:['rpc','archive'],execution:{baseAmount:12.5,quoteAmount:1.25,venue:'Jupiter',pool:'R'.repeat(32)}}],{wallets:[walletA]});const row=rows[0];assert.equal(row.slot,44);assert.equal(row.programId,'P'.repeat(32));assert.equal(row.counterparty,'C'.repeat(32));assert.equal(row.feeLamports,5000);assert.equal(row.confidence,.91);assert.equal(row.execution.venue,'Jupiter');assert.equal(row.execution.baseAmount,12.5);assert.deepEqual(row.sources,['rpc','archive']);});

test('creates one-event evidence-backed Trickster story bundle',()=>{const [row]=buildLedgerRows([{id:'swap-1',signature:'sig-1',timestamp:3000000,slot:44,wallet:walletA,token,side:'buy',tokenDelta:12.5,verification:'verified',sources:['rpc']}],{wallets:[walletA]});const story=buildEventStoryBundle(row);assert.equal(story.storyType,'transaction-replay');assert.equal(story.subject.id,'sig-1');assert.equal(story.coverage.verifiedPercent,100);assert.equal(story.evidence.length,1);assert.equal(story.claims[0].evidenceIds[0],'sig-1');assert.equal(story.replayEvents.length,1);assert.equal(story.replayEvents[0].side,'buy');assert.ok(story.replay.startTime<row.timestamp&&story.replay.endTime>row.timestamp);});

test('market-enriched event story keeps every calculated claim evidence-backed and composable',()=>{
  const [row]=buildLedgerRows([{id:'swap-1',signature:'sig-1',timestamp:1000000,slot:44,wallet:walletA,token,side:'buy',tokenDelta:12.5,verification:'verified',sources:['rpc']}],{wallets:[walletA]});
  const context={window:{from:100,to:1900,windowSeconds:900},subject:{eventTime:1000000},activity:{eventCount:2,walletCount:2,buyCount:1,sellCount:1,events:[{signature:'sig-1',wallet:walletA,timestamp:1000000,slot:44,side:'buy',tokenDelta:12.5,source:'rpc'},{signature:'sig-2',wallet:walletB,timestamp:1100000,slot:45,side:'sell',tokenDelta:-5,source:'archive'}]},pricePairs:[{quoteMint:quote,bucketSeconds:60,from:900,to:1320,sources:['candles'],after:[{requestedSeconds:300,actualSeconds:360,changePercent:25}]}],routes:{routeRows:2,sources:['routes'],venues:[{id:'Jupiter',count:2}]}};
  const story=buildEventStoryBundle(row,context);
  assert.ok(story.claims.some(claim=>claim.id==='market-window-activity'));
  assert.ok(story.claims.some(claim=>claim.id==='price-after-300'));
  assert.ok(story.claims.every(claim=>claim.evidenceIds.length>0));
  assert.ok(story.replayEvents.length>=2);
  const manifest=composeGuidedStory({id:story.id,storyType:story.storyType,subject:story.subject,coverage:story.coverage,evidence:story.evidence,claims:story.claims,output:story.output});
  assert.equal(manifest.storyType,'transaction-replay');
  assert.ok(manifest.claims.some(claim=>claim.kind==='calculated'));
});

test('limits ledger rows and preserves non-trade events',()=>{const rows=buildLedgerRows([{id:'1',timestamp:1,wallet:walletA,kind:'transfer-in',amount:2},{id:'2',timestamp:2,wallet:walletA,kind:'event',amount:0}],{wallets:[walletA],limit:1});assert.equal(rows.length,1);assert.equal(rows[0].side,'transfer-in');});
