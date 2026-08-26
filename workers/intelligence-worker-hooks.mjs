/* Integration hooks for the next Worker release.
 * Compose these from the existing production worker without changing unrelated routes.
 */

import { handleIntelligenceVNext } from './intelligence-router-vnext.mjs';
import { runIntelligenceMeshScheduler } from './intelligence-mesh-scheduler.mjs';
import { handleUniverseRequest } from './intelligence-universe-router.mjs';
import { handleTricksterRequest } from './intelligence-trickster-router.mjs';
import { handleReplayBundleRequest } from './intelligence-replay-bundle.mjs';
import { handleMarketReplayRequest } from './intelligence-market-replay.mjs';
import { handleMarketBackfillPlanRequest } from './intelligence-market-backfill-router.mjs';
import { handleMarketBackfillRequest } from './intelligence-market-backfill-request.mjs';
import { handleIndexJobStatusRequest } from './intelligence-index-job-status.mjs';
import { handleWalletTokenIndexRequest } from './intelligence-wallet-token-index.mjs';
import { handleEventMarketContextRequest } from './intelligence-event-context.mjs';
import { pruneUniverseObservations } from './intelligence-universe-runtime.mjs';

export async function handleIntelligenceFetch(request, env = {}) {
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
  const mesh = await runIntelligenceMeshScheduler(env, { limit: 2 });
  if (String(env.UNIVERSE_ENABLED || '').toLowerCase() === 'true') {
    await pruneUniverseObservations(env);
  }
  return mesh;
}
