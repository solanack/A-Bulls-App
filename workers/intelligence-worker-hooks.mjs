/* Integration hooks for the next Worker release.
 * Compose these from the existing production worker without changing unrelated routes.
 */

import { handleIntelligenceVNext } from './intelligence-router-vnext.mjs';
import { runIntelligenceMeshScheduler } from './intelligence-mesh-scheduler.mjs';
import { handleUniverseRequest } from './intelligence-universe-router.mjs';
import { handleTricksterRequest } from './intelligence-trickster-router.mjs';
import { pruneUniverseObservations } from './intelligence-universe-runtime.mjs';

export async function handleIntelligenceFetch(request, env = {}) {
  const universe = await handleUniverseRequest(request, env);
  if (universe) return universe;
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
