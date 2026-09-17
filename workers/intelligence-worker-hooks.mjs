/* Integration hooks for the next Worker release. */
import { handleIntelligenceVNext } from './intelligence-router-vnext.mjs';
import { runIntelligenceMeshScheduler } from './intelligence-mesh-scheduler.mjs';
import { handleIntelligenceMeshIngestRequest } from './intelligence-mesh-ingest.mjs';
import { handleFullChainStreamRequest } from './intelligence-full-chain-stream.mjs';
import { handleHeliusUniverseWebhook } from './intelligence-helius-universe-ingest.mjs';
import { handleIntelligenceAdapterRequest } from './intelligence-adapter-router.mjs';
import { handleExternalRetrievalTaskRequest } from './intelligence-retrieval-tasks.mjs';
import { handleUniverseRequest } from './intelligence-universe-router.mjs';
import { handleTricksterRequest, pruneTricksterShareManifests } from './intelligence-trickster-router.mjs';
import { handleReplayBundleRequest } from './intelligence-replay-bundle.mjs';
import { handleMarketReplayRequest } from './intelligence-market-replay.mjs';
import { handleMarketBackfillPlanRequest } from './intelligence-market-backfill-router.mjs';
import { handleMarketBackfillRequest } from './intelligence-market-backfill-request.mjs';
import { handleIndexJobStatusRequest } from './intelligence-index-job-status.mjs';
import { handleWalletTokenIndexRequest } from './intelligence-wallet-token-index.mjs';
import { handleEventMarketContextRequest } from './intelligence-event-context.mjs';
import { pruneUniverseObservations } from './intelligence-universe-runtime.mjs';
import { runUniverseScheduledMaintenance } from './intelligence-universe-scheduler.mjs';
import { handleFieldV0Request } from './intelligence-field-v0.mjs';
import { handleFieldCompatibilityRequest } from './intelligence-field-compat.mjs';
import { handleSocialFiRequest } from './socialfi-router.mjs';
import { handleThesisRequest, resolveDueTheses } from './intelligence-theses.mjs';
import { handleTokenSystemRequest } from './intelligence-token-system.mjs';
import { handleTraderObservatoryRequest } from './intelligence-trader-observatory.mjs';
import { refreshFomoLive } from './intelligence-fomo-live.mjs';
import { handleFomoMergedRequest } from './intelligence-fomo-merged.mjs';
import { handleFomoResultsRequest } from './intelligence-fomo-results.mjs';
import { handleResearchIndexRequest } from './intelligence-research-index.mjs';
import { handleGhostSimilarityRequest } from './intelligence-ghost-similarity.mjs';
import { handleBehaviorFingerprintRequest } from './intelligence-behavior-fingerprint.mjs';
import { handleResearchRelationshipsRequest } from './intelligence-research-relationships.mjs';
import { materializeResearchIndex } from './intelligence-research-materializer.mjs';
import { handleMultichainEvidenceRequest, materializeFomoMultichainEvidence } from './intelligence-multichain-evidence.mjs';
import { handleProviderSecretDiagnosticsRequest } from './intelligence-provider-secrets.mjs';
import { handleProviderBudgetDiagnosticsRequest, refreshHeliusUsageSnapshot } from './intelligence-provider-budget.mjs';

function handleRetiredPonsGalaxyRequest(request){
  const url=new URL(request.url);
  if(url.pathname!=='/api/intelligence/pons/galaxy')return null;
  if(request.method!=='GET')return new Response(JSON.stringify({ok:false,error:'method_not_allowed'}),{status:405,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  return new Response(JSON.stringify({ok:true,retired:true,data:{launches:[]},disclosure:'PonsFamily is retired as a public galaxy. Historical provenance remains available through retained evidence and research objects.'}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

async function refreshFomoAndMultichain(env={}){
  let fomo=null;
  try{fomo=await refreshFomoLive(env);}catch(error){console.error('[fomo-refresh-error]',String(error?.stack||error?.message||error));}
  const multichain=await materializeFomoMultichainEvidence(env);
  return Object.freeze({fomo,multichain});
}

export async function handleIntelligenceFetch(request,env={},ctx=null){if(ctx)env.__EXECUTION_CTX=ctx;for(const handler of [handleProviderSecretDiagnosticsRequest,handleProviderBudgetDiagnosticsRequest,handleFullChainStreamRequest,handleMultichainEvidenceRequest,handleGhostSimilarityRequest,handleBehaviorFingerprintRequest,handleResearchRelationshipsRequest,handleResearchIndexRequest,handleFomoResultsRequest,handleFomoMergedRequest,handleRetiredPonsGalaxyRequest,handleTokenSystemRequest,handleTraderObservatoryRequest,handleThesisRequest,handleSocialFiRequest,handleFieldV0Request,handleFieldCompatibilityRequest,handleHeliusUniverseWebhook,handleExternalRetrievalTaskRequest,handleIntelligenceMeshIngestRequest,handleIntelligenceAdapterRequest,handleUniverseRequest,handleWalletTokenIndexRequest,handleEventMarketContextRequest,handleMarketReplayRequest,handleMarketBackfillPlanRequest,handleMarketBackfillRequest,handleIndexJobStatusRequest,handleReplayBundleRequest,handleTricksterRequest]){const response=await handler(request,env);if(response)return response;}return handleIntelligenceVNext(request,env);}
export async function handleIntelligenceScheduled(env={}){const configured=Number(env.INTELLIGENCE_SCHEDULER_BATCH_SIZE||3),limit=Math.max(1,Math.min(5,Number.isFinite(configured)?Math.trunc(configured):3));const mesh=await runIntelligenceMeshScheduler(env,{limit}),maintenance=[];if(String(env.ECOSYSTEM_UNIVERSES_ENABLED||'').toLowerCase()==='true')maintenance.push(runUniverseScheduledMaintenance(env));if(String(env.UNIVERSE_ENABLED||'').toLowerCase()==='true')maintenance.push(pruneUniverseObservations(env));if(String(env.TRICKSTER_SHARE_ENABLED||'').toLowerCase()==='true')maintenance.push(pruneTricksterShareManifests(env));maintenance.push(resolveDueTheses(env));maintenance.push(refreshFomoAndMultichain(env));maintenance.push(refreshHeliusUsageSnapshot(env));maintenance.push(materializeResearchIndex(env));if(maintenance.length){const settled=await Promise.allSettled(maintenance);for(const [index,result] of settled.entries())if(result.status==='rejected')console.error('[scheduled-maintenance-error]',index,String(result.reason?.stack||result.reason?.message||result.reason));}return mesh;}
