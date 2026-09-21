import test from "node:test";
import assert from "node:assert/strict";
import { buildAfterbellGalaxySnapshot } from "./afterbell-galaxy.ts";
import { createUniverseMapSnapshot } from "./synthetic-universe.ts";
import { GALAXY_ORIGIN_CHIPS } from "./galaxies.ts";
import { selectAfterbellPair, type AfterbellGalaxyData } from "../universe-data/afterbell-client.ts";

test("Afterbell PLANETS preserve Solana provenance while the snapshot stays in the Afterbell research galaxy",()=>{
  const data:AfterbellGalaxyData={ok:true,coverage:"fresh",source:"DexScreener venue-reported",disclosure:"fixture",planets:[{mint:"MintAfterbell1",symbol:"NVDAx",name:"NVIDIA",cashSymbol:"NVDA",issuer:"xStocks",priceUsd:123.45,change24h:1.2,volume24h:5_000_000,liquidityUsd:2_000_000,source:"DexScreener venue-reported",observedAt:1_789_000_000_000}]};
  const snapshot=buildAfterbellGalaxySnapshot(data);assert.equal(snapshot.galaxyId,"afterbell");assert.equal(snapshot.particles.length,1);assert.equal(snapshot.observedEventCount,0);const planet=snapshot.particles[0];assert.equal(planet.cosmicKind,"planet");assert.equal(planet.originGalaxyId,"solana-core");assert.equal(planet.verificationState,"provider-reported");assert.equal(planet.metadata?.researchGalaxyId,"afterbell");assert.equal(planet.metadata?.mint,"MintAfterbell1");
});

test("Afterbell pair selection rejects other chains and ranks exact-symbol Solana venues by liquidity",()=>{
  const pair=selectAfterbellPair("NVDAx",[{chainId:"base",baseToken:{symbol:"NVDAx",address:"base"},priceUsd:"10",liquidity:{usd:9999999}},{chainId:"solana",baseToken:{symbol:"OTHER",address:"bad"},priceUsd:"10",liquidity:{usd:9999999}},{chainId:"solana",baseToken:{symbol:"NVDAx",address:"low"},priceUsd:"100",liquidity:{usd:100}},{chainId:"solana",baseToken:{symbol:"NVDAx",address:"high"},priceUsd:"101",liquidity:{usd:1000}}]);
  assert.equal(pair?.mint,"high");assert.equal(pair?.priceUsd,101);
});


test("Galaxy Zero exposes Fomo and Afterbell as sibling portals without changing public origin chips",()=>{
  const snapshot=createUniverseMapSnapshot(800,861);
  const targets=[...new Set(snapshot.particles.map(particle=>particle.metadata?.targetGalaxyId).filter(Boolean))].sort();
  assert.deepEqual(targets,["afterbell","fomo"]);
  assert.deepEqual(GALAXY_ORIGIN_CHIPS.map(item=>item.label),["ZERO","FOMO"]);
  const afterbell=snapshot.particles.find(particle=>particle.metadata?.targetGalaxyId==="afterbell"&&particle.metadata?.galaxyRole==="core");
  assert.ok(afterbell,"Galaxy Zero is missing its Afterbell core portal");
  assert.equal(afterbell?.cosmicKind,"galaxy");
  assert.equal(afterbell?.originGalaxyId,"galaxy-zero");
});
