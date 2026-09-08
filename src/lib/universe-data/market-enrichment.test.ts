import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFieldMarkets } from './market-enrichment.ts';
import { composeVolumeSky, countLivePlanets } from '../field/volume-sky.ts';
import type { UniverseSnapshot } from '../field/types.ts';

test('indexed token plus actual five-minute market fields becomes a live planet without inventing membership',()=>{
  const now=Date.now(), mint='A'.repeat(32);
  const snapshot:UniverseSnapshot={galaxyId:'solana-core',windowStart:now-300000,windowEnd:now,observedEventCount:1,samplingPolicy:'indexed',coverageStatement:'indexed',sources:['index'],particles:[{id:mint,kind:'token',cosmicKind:'planet',originGalaxyId:'solana-core',verificationState:'observed',category:'swap',magnitudeBand:0.1,position:[1,2,3],observedAt:now}]};
  const market={symbol:'A',name:'Token',priceUsd:1,marketCapUsd:600000,fdvUsd:900000,observedAt:now,liquidityUsd:20000,volumeUsd:{m5:1200},transactions:{m5:{buys:12,sells:8}},pairCreatedAt:now-86400000};
  const enriched=applyFieldMarkets(snapshot,{[mint]:market});
  const sky=composeVolumeSky({prototype:snapshot,live:enriched,now});
  assert.equal(countLivePlanets(sky),1);
  assert.equal(enriched.particles.length,1);
  assert.equal(enriched.particles[0].cosmicKind,'planet');
  assert.equal(enriched.particles[0].metadata?.fdvUsd,900000);
  assert.deepEqual(enriched.particles[0].position,[1,2,3]);
});
