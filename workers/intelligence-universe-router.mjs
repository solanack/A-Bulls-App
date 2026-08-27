import { universeSnapshot } from './intelligence-universe-runtime.mjs';
import { ecosystemUniverseSnapshot } from './intelligence-ecosystem-universe-snapshot.mjs';
import { analyzeUniversePatterns, listUniverses, universeMembers } from './intelligence-ecosystem-universes.mjs';

const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const s=value=>String(value??'').trim();

export async function handleUniverseRequest(request,env={}){
  const url=new URL(request.url),path=url.pathname;
  if(!path.startsWith('/api/intelligence/universe'))return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  if(String(env.UNIVERSE_ENABLED||'').toLowerCase()!=='true')return json({ok:false,error:'feature_disabled'},404);

  if(path==='/api/intelligence/universes'){
    return json({ok:true,readOnly:true,universes:await listUniverses(env)},200,'public, max-age=30, stale-while-revalidate=120');
  }

  if(path==='/api/intelligence/universe-members'){
    const universeId=s(url.searchParams.get('universe'))||'solana';
    const members=await universeMembers(env,universeId,{activeOnly:url.searchParams.get('history')!=='1',limit:Number(url.searchParams.get('limit')||1000)});
    return json({ok:true,readOnly:true,universeId,members},200,'public, max-age=15, stale-while-revalidate=30');
  }

  if(path==='/api/intelligence/universe-patterns'){
    if(String(env.UNIVERSE_PATTERN_LAB_ENABLED||'').toLowerCase()!=='true')return json({ok:false,error:'feature_disabled'},404);
    const universeId=s(url.searchParams.get('universe'))||'solana';
    const analysis=await analyzeUniversePatterns(env,universeId,{windowSeconds:Number(url.searchParams.get('window')||86400),limit:Number(url.searchParams.get('limit')||15000)});
    return json({ok:true,readOnly:true,theoryOnly:true,analysis},200,'public, max-age=30, stale-while-revalidate=120');
  }

  if(path!=='/api/intelligence/universe-snapshot')return null;
  const windowSeconds=Number(url.searchParams.get('window')||60),limit=Number(url.searchParams.get('limit')||2500),universeId=s(url.searchParams.get('universe'))||'solana';
  const snapshot=universeId==='solana'&&url.searchParams.has('universe')===false
    ? await universeSnapshot(env,{windowSeconds,limit})
    : await ecosystemUniverseSnapshot(env,universeId,{windowSeconds,limit});
  return json({ok:true,readOnly:true,completeChainRepresentation:false,universeId,snapshot},200,'public, max-age=2, stale-while-revalidate=4');
}
