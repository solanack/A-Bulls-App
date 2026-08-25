import { handleBullIntelligenceRequest } from './bull-intelligence-extension.mjs';
import { handleBullMeshIngestRequest } from './bull-mesh-ingest.mjs';

export async function handleBullIntelligenceRouter(request, env = {}) {
  const internal = await handleBullMeshIngestRequest(request, env);
  if (internal) return internal;
  return handleBullIntelligenceRequest(request, env);
}
