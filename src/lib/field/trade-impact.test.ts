import assert from "node:assert/strict";
import test from "node:test";
import { latestReplayTradeImpact } from "./trade-impact.ts";

test("Replay impact follows the latest visible buy or sell but never a future receipt",()=>{
  const events=[
    {id:"a",side:"buy",timestamp:1000,price:1.2},
    {id:"noise",side:"transfer",timestamp:1500},
    {id:"b",side:"sell",timestamp:2000,price:1.5},
    {id:"future",side:"buy",timestamp:3000,price:2},
  ];
  assert.deepEqual(latestReplayTradeImpact(events,1600),{id:"a",side:"buy",timestamp:1000,price:1.2});
  assert.deepEqual(latestReplayTradeImpact(events,2500),{id:"b",side:"sell",timestamp:2000,price:1.5});
});

test("Replay impact keeps unknown execution price unknown",()=>{
  assert.deepEqual(latestReplayTradeImpact([{signature:"sig",side:"BUY",timestamp:1000,price:null}],1000),{id:"sig",side:"buy",timestamp:1000,price:null});
  assert.equal(latestReplayTradeImpact([{side:"sell",timestamp:2000}],1000),null);
});
