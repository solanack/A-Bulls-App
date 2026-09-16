import assert from "node:assert/strict";
import test from "node:test";
import { buildFomoGalaxySnapshot, fomoStarLabel } from "./fomo-galaxy.ts";

const trader={rank:1,handle:"Unipcs",displayName:"Unipcs",reportedPnlUsd:16_518_210.66,reportedVolumeUsd:123,reportedTradeCount:42,followerCount:100,solanaWallet:"5AhfPStn66hRYoNNDfJHSDgCH7fBbwMQZUECRrhTo62F",evmWallet:null,avatarUrl:null,topTokens:[],capturedAt:1_780_000_000_000,source:"fomoapi.io" as const};

test("Fomo trader star labels put rank and provider-reported PnL first",()=>{
  assert.match(fomoStarLabel(trader),/^#1 \+\$17M/);
  assert.match(fomoStarLabel({...trader,reportedPnlUsd:null}),/^#1 PNL N\/A/);
});

test("Fomo trader snapshot preserves display identity while exposing PnL beside the star",()=>{
  const snapshot=buildFomoGalaxySnapshot({ok:true,coverage:"fresh",items:[trader],capturedAt:trader.capturedAt,disclosure:"provider reported"});
  assert.equal(snapshot.particles.length,1);
  assert.equal(snapshot.particles[0].metadata?.displayName,"Unipcs");
  assert.equal(snapshot.particles[0].metadata?.reportedPnlUsd,16_518_210.66);
  assert.match(String(snapshot.particles[0].metadata?.name),/^#1 \+\$17M/);
});
