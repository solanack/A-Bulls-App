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
import { handleFieldCompatibilityRequest } from './intelligence-field-compat.mjs';

export async function handleIntelligenceFetch(request, env = {}, ctx = null) {
  if(ctx)env.__EXECUTION_CTX=ctx;
  const field = await handleFieldCompatibilityRequest(request, env);
  if (field) return field;
  const heliusUniverse = await handleHeliusUniverseWebhook(request, env);
  if (heliusUniverse) return heliusUniverse;
  const pump = await handlePumpTop10Request(request, env);
  if (pump) return pump;
  const retrievalTasks = await handleExternalRetrievalTaskRequest(request, env);
  if (retrievalTasks) return retrievalTasks;
  const meshIngest = await handleIntelligenceMeshIngestRequest(request, env);
  if (meshIngest) return meshIngest;
  const adapterIngest = await handleIntelligenceAdapterRequest(request, env);
  if (adapterIngest) return adapterIngest;
  const universe = await handleUniverseRequest(request, env);
  if (universe) return universe;
  const walletTokens = await handleWalletTokenIndexRequest(request, env);
  if (walletTokens) return walletTokens;
  const eventContext = await handleEventMarketContextRequest(request, env);
  if (eventContext) return eventContext;
  const marketReplay = await handleMarketReplayRequest(request, env);
  if (marketReplay) return marketReplay;
  const marketBackfillPlan = await handleMarketBackfillPlanRequest(request, env);
  if (marketBackfillPlan) return marketBackfillPlan;
  const marketBackfillRequest = await handleMarketBackfillRequest(request, env);
  if (marketBackfillRequest) return marketBackfillRequest;
  const indexJobStatus = await handleIndexJobStatusRequest(request, env);
  if (indexJobStatus) return indexJobStatus;
  const replay = await handleReplayBundleRequest(request, env);
  if (replay) return replay;
  const trickster = await handleTricksterRequest(request, env);
  if (trickster) return trickster;
  return handleIntelligenceVNext(request, env);
}

export async function handleIntelligenceScheduled(env = {}) {
  const configured=Number(env.INTELLIGENCE_SCHEDULER_BATCH_SIZE||3);
  const limit=Math.max(1,Math.min(5,Number.isFinite(configured)?Math.trunc(configured):3));
  const mesh = await runIntelligenceMeshScheduler(env, { limit });
  const maintenance=[];
  if (String(env.ECOSYSTEM_UNIVERSES_ENABLED || '').toLowerCase() === 'true') maintenance.push(runUniverseScheduledMaintenance(env));
  if (String(env.UNIVERSE_ENABLED || '').toLowerCase() === 'true') maintenance.push(pruneUniverseObservations(env));
  if (String(env.TRICKSTER_SHARE_ENABLED || '').toLowerCase() === 'true') maintenance.push(pruneTricksterShareManifests(env));
  if (String(env.PUMP_INDEX_ENABLED || '').toLowerCase() === 'true') maintenance.push(maintainPumpIndex(env));
  if(maintenance.length){
    const settled=await Promise.allSettled(maintenance);
    for(const [index,result] of settled.entries()){
      if(result.status==='rejected'){
        console.error('[scheduled-maintenance-error]',index,String(result.reason?.stack||result.reason?.message||result.reason));
      }
    }
  }
  return mesh;
}

