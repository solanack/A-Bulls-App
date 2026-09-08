import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractThesisMetrics,
  handleThesisRequest,
  normalizeThesisTimestampMs,
  resolutionDecision,
} from './intelligence-theses.mjs';

const MINT='So11111111111111111111111111111111111111112';

test('thesis publish rejects a record without at least one indexed citation', async () => {
  const env={
    INTELLIGENCE_DB:{prepare(){throw new Error('should not query citations');}},
    SOCIAL_AUTH:{fetch:async()=>Response.json({subject:'account-1'})},
  };
  const request=new Request('https://worker.test/api/intelligence/theses',{
    method:'POST',
    headers:{authorization:'Bearer session','content-type':'application/json'},
    body:JSON.stringify({
      targetKind:'star',targetId:MINT,galaxyId:'solana-core',claim:'Observed activity may persist.',body:'A bounded claim for replay review.',
      fromTs:1_786_000_000_000,toTs:1_786_000_060_000,citations:[],
    }),
  });
  const response=await handleThesisRequest(request,env);
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'citation_required');
});

test('thesis timestamps require milliseconds and never silently normalize seconds', () => {
  assert.equal(normalizeThesisTimestampMs(1_786_000_000),null);
  assert.equal(normalizeThesisTimestampMs(1_786_000_000_000),1_786_000_000_000);
});

test('missing cached market metrics remain null rather than becoming zero', () => {
  assert.deepEqual(extractThesisMetrics({market:{marketCapUsd:null,liquidityUsd:null},holders:{top10Pct:null}}),{
    marketCap:null,liquidity:null,topHolderPct:null,
  });
});

test('24h resolution decision no-ops while cached snapshots are missing inside the grace window', () => {
  const createdAt=1_786_000_000_000;
  const decision=resolutionDecision({createdAt,nowMs:createdAt+24*60*60*1000+15*60*1000,resolveSnapshot:null});
  assert.equal(decision.action,'wait');
  assert.equal(decision.reason,'snapshot_missing');
});
