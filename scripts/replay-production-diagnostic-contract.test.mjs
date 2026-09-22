import test from "node:test";
import assert from "node:assert/strict";
import {
  __replayProductionDiagnosticContract,
  buildReplayDiagnosticRequest,
  normalizeDiagnosticChain,
  terminalReplayDiagnosticFailure,
} from "./replay-production-diagnostic-contract.mjs";

const EVM_WALLET="0x1111111111111111111111111111111111111111";
const EVM_TOKEN="0x2222222222222222222222222222222222222222";
const SOL_WALLET="9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU";
const SOL_TOKEN="5761e8gCMZFBHLU4RuFsfkWab96oJEtEr3uoF9A4pump";

test("production Replay diagnostic preserves the chain for EVM and Robinhood subjects",()=>{
  const built=buildReplayDiagnosticRequest({wallet:EVM_WALLET,mint:EVM_TOKEN,chain:"robinhood",fromTs:1_790_000_000_000,toTs:1_790_003_600_000});
  assert.equal(built.chain,"robinhood");
  assert.equal(built.request.chain,"robinhood");
  assert.equal("quoteMint" in built.request,false);
});

test("production Replay diagnostic sends SOL quote only for Solana",()=>{
  const built=buildReplayDiagnosticRequest({wallet:SOL_WALLET,mint:SOL_TOKEN,chain:"solana",fromTs:1_790_000_000_000,toTs:1_790_003_600_000});
  assert.equal(built.request.chain,"solana");
  assert.equal(built.request.quoteMint,"So11111111111111111111111111111111111111112");
});

test("production Replay diagnostic fails before request when an EVM chain is missing",()=>{
  assert.throws(()=>buildReplayDiagnosticRequest({wallet:EVM_WALLET,mint:EVM_TOKEN,fromTs:1_790_000_000_000,toTs:1_790_003_600_000}),/diagnostic_chain_missing_for_evm_subject/);
});

test("production Replay diagnostic normalizes provider chain aliases",()=>{
  assert.equal(normalizeDiagnosticChain("4663"),"robinhood");
  assert.equal(normalizeDiagnosticChain("BNB Chain"),"bsc");
  assert.equal(normalizeDiagnosticChain("ETH"),"ethereum");
});

test("terminal client contract failures fail closed while transient responses remain retryable",()=>{
  assert.equal(terminalReplayDiagnosticFailure({http:400,ok:false}),true);
  assert.equal(terminalReplayDiagnosticFailure({http:429,ok:false}),false);
  assert.equal(terminalReplayDiagnosticFailure({http:503,ok:false}),false);
  assert.equal(__replayProductionDiagnosticContract.chainQualifiedRequests,true);
});
