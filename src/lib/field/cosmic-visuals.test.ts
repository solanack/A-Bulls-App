import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COSMIC_VISUALS, cosmicWorldSize, renderCosmicKind } from "./cosmic-visuals.ts";
import type { FieldParticle } from "./types.ts";
function particle(cosmicKind:FieldParticle["cosmicKind"],magnitudeBand=.5,metadata:FieldParticle["metadata"]={}):FieldParticle{return{id:`${cosmicKind}-1`,kind:cosmicKind,cosmicKind,originGalaxyId:"solana-core",verificationState:"observed",observedAt:1_700_000_000_000,category:"swap",magnitudeBand,position:[0,0,0],source:"test",metadata};}
describe("cosmic visual language",()=>{
  it("reserves dust for decorative wallpaper so ghosts remain evidence-bearing traces",()=>{const wallpaper=particle("planet",1,{skyRole:"wallpaper"});assert.equal(renderCosmicKind(wallpaper),"dust");assert.match(COSMIC_VISUALS.dust.meaning,/not market evidence/i);assert.match(COSMIC_VISUALS.ghost.meaning,/historical trace/i);});
  it("makes galaxy cores larger than token planets, wallet stars and dust",()=>{const core=particle("galaxy",1,{galaxyRole:"core",targetGalaxyId:"pump-fun"}),planet=particle("planet",1,{skyRole:"live",liquidityUsd:1_000_000}),star=particle("star",1,{skyRole:"live",observedSharePct:20}),dust=particle("dust",1,{skyRole:"wallpaper"});assert.ok(cosmicWorldSize(core)>cosmicWorldSize(planet));assert.ok(cosmicWorldSize(planet)>cosmicWorldSize(star));assert.ok(cosmicWorldSize(star)>cosmicWorldSize(dust)*2);});
  it("sizes token planets from observed market depth and wallet stars from observed relationship weight",()=>{assert.ok(cosmicWorldSize(particle("planet",.25,{liquidityUsd:10_000_000}))>cosmicWorldSize(particle("planet",.25,{liquidityUsd:null})));assert.ok(cosmicWorldSize(particle("star",.25,{observedSharePct:30}))>cosmicWorldSize(particle("star",.25,{observedSharePct:null})));});
  it("uses observed liquidity to size asteroid belts without turning null into zero",()=>{assert.ok(cosmicWorldSize(particle("asteroid-belt",.25,{liquidityUsd:10_000_000}))>cosmicWorldSize(particle("asteroid-belt",.25,{liquidityUsd:null})));});
  it("keeps all real object classes visually above decorative dust",()=>{const dustMax=COSMIC_VISUALS.dust.maxWorldSize;for(const[kind,profile]of Object.entries(COSMIC_VISUALS)){if(kind==="dust")continue;assert.ok(profile.minWorldSize>dustMax,`${kind} must remain larger than dust`);}});
});
