/* Integration hooks for the next Worker release.
 * Compose these from the existing production worker without changing unrelated routes.
 */

import { handleIntelligenceVNext } from './intelligence-router-vnext.mjs';
import { runIntelligenceMeshScheduler } from './intelligence-mesh-scheduler.mjs';

export async function handleIntelligenceFetch(request, env = {}) {
  return handleIntelligenceVNext(request, env);
}

export async function handleIntelligenceScheduled(env = {}) {
  return runIntelligenceMeshScheduler(env, { limit: 2 });
}
