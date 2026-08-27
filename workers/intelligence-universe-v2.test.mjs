import test from 'node:test';
import assert from 'node:assert/strict';
import { __z500UniverseContract } from './intelligence-z500-universe.mjs';
import { __heliusUniverseWatchlistContract } from './intelligence-helius-universe-watchlist.mjs';
import { __heliusUniverseIngestContract } from './intelligence-helius-universe-ingest.mjs';
import { __universeSchedulerContract } from './intelligence-universe-scheduler.mjs';
import { __durableUniverseLinkContract } from './intelligence-universe-durable-linker.mjs';
import { deriveWalletBehaviorFeatures, hypothesesForFeatures } from './intelligence-ecosystem-universes.mjs';

const WALLET='11111111111111111111111111111111';
const TOKEN_A='So11111111111111111111111111111111111111112';
const TOKEN_B='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

test('Z500 selector is bounded, leased, and two-cycle confirmed',()=>{
  assert.equal(__z500UniverseContract.universeId,'z500-top10');
  assert.equal(__z500UniverseContract.topLimit,10);
  assert.equal(__z500UniverseContract.refreshSeconds,900);
  assert.equal(__z500UniverseContract.confirmationCycles,2);
  assert.equal(__z500UniverseContract.failClosed,true);
});

test('Helius rotation adds before retire and is bounded',()=>{
  assert.equal(__heliusUniverseWatchlistContract.provider,'helius');
  assert.equal(__heliusUniverseWatchlistContract.unionBeforeRetire,true);
  assert.equal(__heliusUniverseWatchlistContract.failClosed,true);
  assert.ok(__heliusUniverseWatchlistContract.defaultDailyUpdateCap<=48);
});

test('Helius ingest remains bounded to active universe mints',()=>{
  assert.equal(__heliusUniverseIngestContract.maxBatch,100);
  assert.equal(__heliusUniverseIngestContract.filtersAgainstActiveUniverseMints,true);
  assert.equal(__heliusUniverseIngestContract.legacyPumpIngestAlias,true);
});

test('Universe scheduler keeps fast cron work behind subsystem leases',()=>{
  assert.equal(__universeSchedulerContract.z500LeaseSeconds,900);
  assert.equal(__universeSchedulerContract.watchlistReconcilesAfterSelector,true);
});

test('Durable links preserve historical universe context',()=>{
  assert.equal(__durableUniverseLinkContract.canonicalTable,'bull_wallet_events');
  assert.equal(__durableUniverseLinkContract.membershipAtIngest,true);
  assert.equal(__durableUniverseLinkContract.preservesExitedUniverseHistory,true);
});

test('Pattern features can surface regular execution as a hypothesis, not a fact',()=>{
  const rows=[];
  for(let i=0;i<16;i++)rows.push({entity_kind:'wallet',entity_id:WALLET,category:'swap',observed_at:1_700_000_000+i*60,magnitude_band:.2,evidence_json:JSON.stringify({wallet:WALLET,side:i%2?'sell':'buy',amount:10,tokens:[i%3===0?TOKEN_B:TOKEN_A]})});
  const features=deriveWalletBehaviorFeatures(rows,{universeId:'z500-top10',windowStart:1_700_000_000,windowEnd:1_700_001_000});
  assert.equal(features.length,1);
  const hypotheses=hypothesesForFeatures(features[0]);
  assert.ok(hypotheses.some(item=>item.kind==='timing-regularity'));
  assert.ok(hypotheses.every(item=>/possible|consistent|compatible|appears|observed/i.test(item.statement)));
});
