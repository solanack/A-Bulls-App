import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchWithDeployPropagationRetry } from "./check-live.mjs";

test("post-deploy asset verification retries transient propagation 404s",async()=>{
  const statuses=[404,404,200],seen=[],sleeps=[];
  const response=await fetchWithDeployPropagationRetry({
    url:"https://abullsapp.com/assets/runtime.js",
    fetchImpl:async()=>{const status=statuses.shift()??200;seen.push(status);return new Response("x",{status,headers:{"content-type":status===200?"application/javascript":"text/plain"}});},
    sleep:async ms=>{sleeps.push(ms);},
    attempts:8,
    delayMs:10,
  });
  assert.equal(response.status,200);
  assert.deepEqual(seen,[404,404,200]);
  assert.deepEqual(sleeps,[10,20]);
});

test("post-deploy asset verification does not hide permanent client errors",async()=>{
  let calls=0;
  const response=await fetchWithDeployPropagationRetry({
    url:"https://abullsapp.com/assets/runtime.js",
    fetchImpl:async()=>{calls+=1;return new Response("bad",{status:400});},
    sleep:async()=>{throw new Error("should not sleep");},
  });
  assert.equal(response.status,400);
  assert.equal(calls,1);
});

test("production Fomo audit has hard trade-evidence release gates and explicit unavailable reasons",()=>{
  const source=readFileSync(new URL("./audit-fomo-replay-coverage.mjs",import.meta.url),"utf8");
  assert.match(source,/replayMode/);
  assert.match(source,/unavailableReason/);
  assert.match(source,/chartUnavailableReason/);
  assert.match(source,/tradePairsWithoutReplay>0/);
  assert.match(source,/tradePairsUnknownChain>0/);
  assert.match(source,/tradePairsMissingWallet>0/);
});
