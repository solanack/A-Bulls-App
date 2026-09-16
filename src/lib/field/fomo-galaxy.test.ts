import assert from "node:assert/strict";
import test from "node:test";
import { fomoStarLabel } from "./fomo-star-label.ts";

const trader={rank:1,handle:"Unipcs",displayName:"Unipcs",reportedPnlUsd:16_518_210.66};

test("Fomo trader star labels put rank and provider-reported PnL first",()=>{
  assert.match(fomoStarLabel(trader),/^#1 \+\$17M/);
  assert.match(fomoStarLabel({...trader,reportedPnlUsd:null}),/^#1 PNL N\/A/);
  assert.match(fomoStarLabel({...trader,reportedPnlUsd:-1250.5}),/^#1 -\$1\.3K/);
});
