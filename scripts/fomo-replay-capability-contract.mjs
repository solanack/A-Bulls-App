const s=value=>String(value??"").trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;

export function replayCapabilityState({
  replayEvidence=false,
  chartEvidence=false,
  missingWallet=false,
  unknownChain=false,
  providerTxReferences=0,
  observedTransactions=0,
  decodedExecutions=0,
  resolvedVenues=0,
  resolvedPools=0,
}={}){
  const txRefs=Math.max(0,Math.trunc(n(providerTxReferences)));
  const observed=Math.max(0,Math.trunc(n(observedTransactions)));
  const decoded=Math.max(0,Math.trunc(n(decodedExecutions)));
  const venues=Math.max(0,Math.trunc(n(resolvedVenues)));
  const pools=Math.max(0,Math.trunc(n(resolvedPools)));
  const transactionCoverage=observed>0?"observed-fact":txRefs>0?"provider-reported":"unavailable";
  const cutExportReadiness=replayEvidence&&!missingWallet&&!unknownChain
    ?"data-ready-client-capability-gated"
    :"unavailable";
  const missingCapabilities=[];
  if(!replayEvidence)missingCapabilities.push("replay-evidence");
  if(observed===0)missingCapabilities.push("independently-verified-transaction");
  if(decoded===0)missingCapabilities.push("decoded-execution");
  if(venues===0)missingCapabilities.push("venue");
  if(pools===0)missingCapabilities.push("pool");
  if(!chartEvidence)missingCapabilities.push("historical-chart");
  if(missingWallet)missingCapabilities.push("public-wallet");
  if(unknownChain)missingCapabilities.push("chain-identity");
  return Object.freeze({
    providerTxReferences:txRefs,
    observedTransactions:observed,
    decodedExecutions:decoded,
    resolvedVenues:venues,
    resolvedPools:pools,
    transactionCoverage,
    venueCoverage:venues>0?"observed-fact":"unavailable",
    poolCoverage:pools>0?"observed-fact":"unavailable",
    cutExportReadiness,
    missingCapabilities:Object.freeze([...new Set(missingCapabilities)]),
  });
}

export function capabilitySummary(rows=[]){
  const list=Array.isArray(rows)?rows:[];
  return Object.freeze({
    providerTxReferencePairs:list.filter(row=>n(row?.providerTxReferences)>0).length,
    observedTransactionPairs:list.filter(row=>n(row?.observedTransactions)>0).length,
    decodedExecutionPairs:list.filter(row=>n(row?.decodedExecutions)>0).length,
    venueResolvedPairs:list.filter(row=>n(row?.resolvedVenues)>0).length,
    poolResolvedPairs:list.filter(row=>n(row?.resolvedPools)>0).length,
    cutDataReadyPairs:list.filter(row=>s(row?.cutExportReadiness)==="data-ready-client-capability-gated").length,
  });
}
