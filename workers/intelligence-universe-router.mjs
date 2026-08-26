import { universeSnapshot } from './intelligence-universe-runtime.mjs';

const json = (body,status=200,cache='no-store') => new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':cache,
    'x-content-type-options':'nosniff'
  }
});

export async function handleUniverseRequest(request,env={}) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/intelligence/universe-snapshot') return null;
  if (request.method !== 'GET') return json({ok:false,error:'method_not_allowed'},405);
  if (String(env.UNIVERSE_ENABLED||'').toLowerCase() !== 'true') {
    return json({ok:false,error:'feature_disabled'},404);
  }
  const windowSeconds = Number(url.searchParams.get('window')||60);
  const limit = Number(url.searchParams.get('limit')||2500);
  const snapshot = await universeSnapshot(env,{windowSeconds,limit});
  return json({
    ok:true,
    readOnly:true,
    completeChainRepresentation:false,
    snapshot
  },200,'public, max-age=2, stale-while-revalidate=4');
}
