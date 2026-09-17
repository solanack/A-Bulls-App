import test from "node:test";
import assert from "node:assert/strict";
import { buildWalletSystemSnapshot } from "./wallet-system.ts";
import type { WalletActivityIndex } from "@/lib/universe-data/wallet-system-client";

const wallet="7".repeat(32);
const mint="8".repeat(32);

test("wallet system centers the queried wallet STAR and renders observed token PLANETS",()=>{
  const index:WalletActivityIndex={schemaVersion:"wallet-token-index-v2",wallet,addressKind:"solana",tokenCount:1,tokens:[{chainKey:"solana",mint,eventCount:9,tradeCount:4,firstEvent:100,lastEvent:500,observedTokenFlow:42,maxConfidence:.9}],disclosure:"test evidence"};
  const snapshot=buildWalletSystemSnapshot(index,"galaxy-zero");
  assert.equal(snapshot.particles[0]?.cosmicKind,"star");
  assert.equal(snapshot.particles[0]?.metadata?.wallet,wallet);
  const planet=snapshot.particles.find(item=>item.cosmicKind==="planet");
  assert.equal(planet?.metadata?.mint,mint);
  assert.equal(planet?.metadata?.wallet,wallet);
  assert.equal(planet?.metadata?.tradeCount,4);
  assert.equal(planet?.metadata?.chainKey,"solana");
});

test("wallet system keeps EVM provider provenance distinct",()=>{
  const evmWallet=`0x${"1".repeat(40)}`,evmMint=`0x${"2".repeat(40)}`,index:WalletActivityIndex={schemaVersion:"wallet-token-index-v2",wallet:evmWallet,addressKind:"evm",tokenCount:1,tokens:[{chainKey:"base",mint:evmMint,eventCount:3,tradeCount:2,firstEvent:100,lastEvent:500,observedTokenFlow:5,maxConfidence:.7,sourceKinds:["provider-reported"]}],disclosure:"provider evidence"};
  const snapshot=buildWalletSystemSnapshot(index,"galaxy-zero");
  const planet=snapshot.particles.find(item=>item.cosmicKind==="planet");
  assert.equal(planet?.verificationState,"provider-reported");
  assert.equal(planet?.metadata?.chainKey,"base");
});
