import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { __replayBundleContract, adaptiveReplayBucketSeconds } from "../workers/intelligence-replay-bundle.mjs";

test("Replay keeps seven-day pre-entry context with bounded candle density",()=>{
  assert.equal(__replayBundleContract.sevenDayPreEntryContext,true);
  assert.equal(__replayBundleContract.targetReplayCandles,240);
  assert.equal(adaptiveReplayBucketSeconds(0,7*86400,60),3600);
});

test("Replay UI preserves chain and ties cinematic cues to observed events",()=>{
  const source=readFileSync("src/components/replay-workspace.tsx","utf8");
  assert.match(source,/chainKey=text\(subject\.chain\)/);
  assert.match(source,/PRE-ENTRY MARKET CONTEXT/);
  assert.match(source,/createOscillator/);
  assert.match(source,/currentEvent\.side/);
  assert.match(source,/AUTO \${cinematicRate}/);
});
