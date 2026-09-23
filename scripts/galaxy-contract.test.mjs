import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from 'three';
import { GALAXIES, GALAXY_ORIGIN_CHIPS, COSMOLOGY_RULES, canonicalUniverseId, cosmicKindForEntity, getGalaxy, isPopulatedGalaxy, preserveLaunchOrigin, GALAXY_CONTENT } from "../src/lib/field/galaxies.ts";
import { createGalaxySnapshot, GALAXY_ZERO_CAMERA_DISTANCE, GALAXY_ZERO_CENTERS } from "../src/lib/field/synthetic-universe.ts";

test('all galaxy cores project inside portrait and desktop viewports',()=>{for(const [width,height] of [[320,900],[390,844],[412,915],[1280,800]]){const camera=new PerspectiveCamera(55,width/height,.1,700),distance=GALAXY_ZERO_CAMERA_DISTANCE;camera.position.set(Math.sin(.4)*Math.cos(.18)*distance,Math.sin(.18)*distance,Math.cos(.4)*Math.cos(.18)*distance);camera.lookAt(0,0,0);camera.updateMatrixWorld();for(const position of GALAXY_ZERO_CENTERS){const projected=new Vector3(...position).project(camera);assert.ok(Math.abs(projected.x)<.9&&Math.abs(projected.y)<.9&&projected.z<1,`${width}x${height}: ${position} must be visible`);}}});

test("Galaxy Zero exposes Fomo and Afterbell as research galaxies while launch-origin chips stay provenance-compatible",()=>{const zero=getGalaxy("galaxy-zero");assert.equal(zero.status,"populated");assert.equal(zero.seed,861);assert.equal(isPopulatedGalaxy("galaxy-zero"),true);assert.equal(isPopulatedGalaxy("fomo"),true);assert.equal(isPopulatedGalaxy("afterbell"),true);assert.equal(isPopulatedGalaxy("solana-core"),false);assert.equal(isPopulatedGalaxy("pump-fun"),false);assert.equal(isPopulatedGalaxy("pons"),false);assert.equal(getGalaxy("fomo").ecosystem,"Trader research galaxy");assert.equal(getGalaxy("afterbell").ecosystem,"Tokenized equities research galaxy");assert.equal(getGalaxy("pump-fun").status,"staging");assert.equal(getGalaxy("pons").status,"staging");assert.equal(GALAXIES.length,3);assert.deepEqual(GALAXY_ORIGIN_CHIPS,[{id:"galaxy-zero",label:"ZERO"},{id:"fomo",label:"FOMO"},{id:"afterbell",label:"AFTERBELL"}]);assert.deepEqual(GALAXY_CONTENT.pons.excludes,["nft"]);const map=createGalaxySnapshot(zero,900);assert.equal(map.observedEventCount,0);assert.deepEqual(new Set(map.particles.flatMap(p=>typeof p.metadata?.targetGalaxyId==="string"?[p.metadata.targetGalaxyId]:[])),new Set(["fomo","afterbell"]));assert.equal(map.particles.some(p=>["wallet","transaction","token","nft","program"].includes(p.kind)),false);assert.ok(GALAXY_ZERO_CAMERA_DISTANCE>=190);assert.equal(GALAXY_ZERO_CENTERS.length,2);assert.ok(GALAXY_ZERO_CENTERS.every(([x,y])=>Math.abs(x)<=30&&Math.abs(y)<=25));});

test("entities map to the approved planet-token / star-wallet taxonomy",()=>{assert.equal(cosmicKindForEntity("token"),"planet");assert.equal(cosmicKindForEntity("wallet"),"star");assert.equal(cosmicKindForEntity("nft"),"moon");assert.equal(cosmicKindForEntity("transaction"),"comet");assert.equal(cosmicKindForEntity("cluster"),"asteroid-belt");assert.equal(cosmicKindForEntity("program"),"galaxy");assert.equal(cosmicKindForEntity("migration"),"wormhole");assert.equal(Object.keys(COSMOLOGY_RULES).length,11);assert.match(COSMOLOGY_RULES.planet.onChainMeaning,/Token/);assert.match(COSMOLOGY_RULES.star.onChainMeaning,/wallet/i);});

test("launch origin can be set once but never rewritten",()=>{assert.equal(preserveLaunchOrigin(undefined,"solana-core"),"solana-core");assert.equal(preserveLaunchOrigin("solana-core","solana-core"),"solana-core");assert.throws(()=>preserveLaunchOrigin("solana-core","pump-fun"),/Launch origin is immutable/);});

test("wallet star identity remains stable while token planet identity preserves launch origin",()=>{assert.equal(canonicalUniverseId("star","WalletABC","solana-core"),canonicalUniverseId("star","WalletABC","pump-fun"));assert.notEqual(canonicalUniverseId("planet","MintABC","solana-core"),canonicalUniverseId("planet","MintABC","pump-fun"));assert.notEqual(canonicalUniverseId("planet","MintABC","pump-fun"),canonicalUniverseId("planet","MintABC","pons"));});

test("volume sky knobs stay 5m-only, cap 120, Helius membership 10",async()=>{const sky=await import("../src/lib/field/volume-sky.ts");assert.equal(sky.SKY_CAP,120);assert.equal(sky.HELIUS_MEMBERSHIP_LIMIT,10);assert.equal(sky.LIQ_FLOOR_USD,10_000);assert.equal(sky.MAX_M5_VOL_TO_LIQ,8);});

test("Field visual polish stays inside the known-good WebGL renderer",()=>{
  const field=readFileSync(new URL("../src/lib/field/particle-field.ts",import.meta.url),"utf8");
  assert.match(field,/layered spiral body/);
  assert.match(field,/targetGalaxy === "fomo"/);
  assert.match(field,/targetGalaxy === "afterbell"/);
  assert.match(field,/#flightUntil/);
  assert.match(field,/cinematicFlight/);
  assert.match(field,/this\.cameraState = \{ yaw: 0\.4, pitch: 0\.18, distance: snapshot\.galaxyId === "galaxy-zero" \? GALAXY_ZERO_CAMERA_DISTANCE : 125, target: \[0, 0, 0\] \};/);
  assert.doesNotMatch(field,/if \(galaxyChanged\) \{[^}]*#placeCamera\(\)/s);
  assert.match(field,/new THREE\.WebGLRenderer/);
  assert.doesNotMatch(field,/WebGPURenderer|CanvasRenderer|field2d|renderer2d|fallback2d/i);
  assert.match(field,/new THREE\.CanvasTexture\(canvas\)/);
  assert.match(field,/context\.measureText\(text\)/,"live labels reserve only their measured width instead of a fixed portrait-clipping box");
  assert.match(field,/Math\.min\(400, Math\.max\(132,/,"live label widths stay bounded for short and long identities");
});
