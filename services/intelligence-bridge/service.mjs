import { buildBridgeExecutors, bridgeSourceKinds } from './bootstrap.mjs';
import { runBridgeLoop, normalizeBridgeConfig } from './runner.mjs';

export function createBridgeService({env=process.env,transports={},fetchImpl=fetch,signal,intervalMs=5000}={}){
  const executors=buildBridgeExecutors({env,transports});
  const sourceKinds=bridgeSourceKinds(executors);
  if(!sourceKinds.length)throw new Error('no_historical_bridge_executors_enabled');
  const config=normalizeBridgeConfig({
    apiBase:env.INTELLIGENCE_API_BASE,
    token:env.INTELLIGENCE_MESH_INGEST_TOKEN,
    sourceKinds,
    limit:env.INTELLIGENCE_BRIDGE_CLAIM_LIMIT||1,
    leaseSeconds:env.INTELLIGENCE_BRIDGE_LEASE_SECONDS||120
  });
  return Object.freeze({
    config,
    executors,
    readiness:Object.freeze({ready:true,sourceKinds,readOnly:true,providerTransportsInjected:true}),
    start:()=>runBridgeLoop({config,executors,fetchImpl,signal,intervalMs})
  });
}
