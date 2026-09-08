/* Integration hooks for the next Worker release.
 * Compose these from the existing production worker without changing unrelated routes.
 */
import { handleIntelligenceVNext } from './intelligence-router-vnext.mjs';
import { runIntelligenceMeshScheduler } from './intelligence-mesh-scheduler.mjs';
import { handleIntelligenceMeshIngestRequest } from './intelligence-mesh-ingest.mjs';
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
import { handlePumpTop10Request, maintainPumpIndex } from './intelligence-pump-top10.mjs';
import { runUniverseScheduledMaintenance } from './intelligence-universe-scheduler.mjs';
import { handleFieldV0Request } from './intelligence-field-v0.mjs';
import { handleFieldCompatibilityRequest } from './intelligence-field-compat.mjs';
import { handleSocialFiRequest } from './socialfi-router.mjs';
import { handlePonsGalaxyRequest, maintainPonsIndex } from './intelligence-pons-galaxy.mjs';
import { handleThesisRequest, resolveDueTheses } from './intelligence-theses.mjs';
import { handleTokenSystemRequest } from './intelligence-token-system.mjs';
import { handleTraderObservatoryRequest } from './intelligence-trader-observatory.mjs';
import { handleFomoGalaxyRequest } from './intelligence-fomo-galaxy.mjs';
import { handlePonsFamilyRequest } from './intelligence-ponsfamily-ranking.mjs';
import { handleFomoLiveRequest, refreshFomoLive } from './intelligence-fomo-live.mjs';
import { handlePonsFamilyLiveRequest, refreshPonsFamilyLive } from './intelligence-ponsfamily-live.mjs';

export async function handleIntelligenceFetch(request,env={},ctx=null){
  if(ctx)env.__EXECUTION_CTX=ctx;
  for(const handler of [handleFomoLiveRequest,handlePonsFamilyLiveRequest,handleFomoGalaxyRequest,handlePonsFamilyRequest,handlePonsGalaxyRequest,handleTokenSystemRequest,handleTraderObservatoryRequest,handleThesisRequest,handleSocialFiRequest,handleFieldV0Request,handleFieldCompatibilityRequest,handleHeliusUniverseWebhook,handlePumpTop10Request,handleExternalRetrievalTaskRequest,handleIntelligenceMeshIngestRequest,handleIntelligenceAdapterRequest,handleUniverseRequest,handleWalletTokenIndexRequest,handleEventMarketContextRequest,handleMarketReplayRequest,handleMarketBackfillPlanRequest,handleMarketBackfillRequest,handleIndexJobStatusRequest,handleReplayBundleRequest,handleTricksterRequest]){
    const response=await handler(request,env);if(response)return response;
  }
  return handleIntelligenceVNext(request,env);
}

export async function handleIntelligenceScheduled(env={}){
  const configured=Number(env.INTELLIGENCE_SCHEDULER_BATCH_SIZE||3),limit=Math.max(1,Math.min(5,Number.isFinite(configured)?Math.trunc(configured):3));
  const mesh=await runIntelligenceMeshScheduler(env,{limit}),maintenance=[];
  if(String(env.ECOSYSTEM_UNIVERSES_ENABLED||'').toLowerCase()==='true')maintenance.push(runUniverseScheduledMaintenance(env));
  if(String(env.UNIVERSE_ENABLED||'').toLowerCase()==='true')maintenance.push(pruneUniverseObservations(env));
  if(String(env.TRICKSTER_SHARE_ENABLED||'').toLowerCase()==='true')maintenance.push(pruneTricksterShareManifests(env));
  if(String(env.PUMP_INDEX_ENABLED||'').toLowerCase()==='true')maintenance.push(maintainPumpIndex(env));
  maintenance.push(resolveDueTheses(env));
  maintenance.push(refreshFomoLive(env));
  maintenance.push((async()=>{try{await maintainPonsIndex(env);}catch(error){console.error('[pons-index]',String(error?.message||error));}return refreshPonsFamilyLive(env);})());
  if(maintenance.length){const settled=await Promise.allSettled(maintenance);for(const [index,result] of settled.entries())if(result.status==='rejected')console.error('[scheduled-maintenance-error]',index,String(result.reason?.stack||result.reason?.message||result.reason));}
  return mesh;
}
