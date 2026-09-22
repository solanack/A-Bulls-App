import test from "node:test";
import assert from "node:assert/strict";
import { capabilitySummary, replayCapabilityState } from "./fomo-replay-capability-contract.mjs";

test("capability state distinguishes provider transaction references from observed chain facts",()=>{
  const provider=replayCapabilityState({replayEvidence:true,providerTxReferences:2});
  assert.equal(provider.transactionCoverage,"provider-reported");
  assert.ok(provider.missingCapabilities.includes("independently-verified-transaction"));

  const observed=replayCapabilityState({
    replayEvidence:true,
    chartEvidence:true,
    providerTxReferences:1,
    observedTransactions:1,
    decodedExecutions:1,
    resolvedVenues:1,
    resolvedPools:1,
  });
  assert.equal(observed.transactionCoverage,"observed-fact");
  assert.equal(observed.missingCapabilities.length,0);
});

test("Cut data readiness is independent from client codec support and fails closed on missing subject identity",()=>{
  assert.equal(replayCapabilityState({replayEvidence:true}).cutExportReadiness,"data-ready-client-capability-gated");
  assert.equal(replayCapabilityState({replayEvidence:true,missingWallet:true}).cutExportReadiness,"unavailable");
  assert.equal(replayCapabilityState({replayEvidence:true,unknownChain:true}).cutExportReadiness,"unavailable");
  assert.equal(replayCapabilityState({replayEvidence:false}).cutExportReadiness,"unavailable");
});

test("capability summary counts pair-level production coverage",()=>{
  const rows=[
    replayCapabilityState({replayEvidence:true,providerTxReferences:1,observedTransactions:1,decodedExecutions:1,resolvedVenues:1,resolvedPools:1}),
    replayCapabilityState({replayEvidence:true,providerTxReferences:1}),
    replayCapabilityState({replayEvidence:false,missingWallet:true}),
  ];
  assert.deepEqual(capabilitySummary(rows),{
    providerTxReferencePairs:2,
    observedTransactionPairs:1,
    decodedExecutionPairs:1,
    venueResolvedPairs:1,
    poolResolvedPairs:1,
    cutDataReadyPairs:2,
  });
});
