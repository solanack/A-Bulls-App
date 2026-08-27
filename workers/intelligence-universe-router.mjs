import { universeSnapshot } from './intelligence-universe-runtime.mjs';
import { ecosystemUniverseSnapshot } from './intelligence-ecosystem-universe-snapshot.mjs';
import { listUniverses, universeMembers } from './intelligence-ecosystem-universes.mjs';
import { analyzeDurableUniversePatterns } from './intelligence-pattern-lab-durable.mjs';
import { durableUniverseEvidence, universeMembershipTimeline } from './intelligence-universe-durable-linker.mjs';
import { universeSchedulerHealth } from './intelligence-universe-scheduler.mjs';

const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;

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
    const members=await universeMembers(env,universeId,{activeOnly:url.searchParams.get('history')!=='1',limit:n(url.searchParams.get('limit'))||1000});
    return json({ok:true,readOnly:true,universeId,members},200,'public, max-age=15, stale-while-revalidate=30');
  }

  if(path==='/api/intelligence/universe-membership-history'){
    const universeId=s(url.searchParams.get('universe'))||'z500-top10';
    const events=await universeMembershipTimeline(env,universeId,{limit:n(url.searchParams.get('limit'))||250});
    return json({ok:true,readOnly:true,universeId,events},200,'public, max-age=15, stale-while-revalidate=60');
  }

  if(path==='/api/intelligence/universe-evidence'){
    const universeId=s(url.searchParams.get('universe'))||'solana',to=Math.max(0,Math.trunc(n(url.searchParams.get('to'))||Date.now()/1000)),from=Math.max(0,Math.trunc(n(url.searchParams.get('from'))||to-86400));
    const events=await durableUniverseEvidence(env,universeId,{from,to,limit:n(url.searchParams.get('limit'))||1000,wallet:s(url.searchParams.get('wallet')),mint:s(url.searchParams.get('mint'))});
    return json({ok:true,readOnly:true,universeId,from:from*1000,to:to*1000,events,coverage:{complete:false,statement:'Evidence is limited to canonical events actually indexed by A Bulls App while this universe membership was active.'}},200,'public, max-age=5, stale-while-revalidate=15');
  }

  if(path==='/api/intelligence/universe-patterns'){
    if(String(env.UNIVERSE_PATTERN_LAB_ENABLED||'').toLowerCase()!=='true')return json({ok:false,error:'feature_disabled'},404);
    const universeId=s(url.searchParams.get('universe'))||'solana';
    const analysis=await analyzeDurableUniversePatterns(env,universeId,{windowSeconds:n(url.searchParams.get('window'))||86400,limit:n(url.searchParams.get('limit'))||20000});
    return json({ok:true,readOnly:true,theoryOnly:true,analysis,disclosure:'Pattern hypotheses describe observable execution behavior. They do not prove automation, identity, intent, coordination, causation, or future performance.'},200,'public, max-age=30, stale-while-revalidate=120');
  }

  if(path==='/api/intelligence/universe-health'){
    return json({ok:true,readOnly:true,health:await universeSchedulerHealth(env)},200,'no-store');
  }

  if(path!=='/api/intelligence/universe-snapshot')return null;
  const windowSeconds=n(url.searchParams.get('window'))||60,limit=n(url.searchParams.get('limit'))||2500,universeId=s(url.searchParams.get('universe'))||'solana';
  const snapshot=universeId==='solana'&&url.searchParams.has('universe')===false
    ? await universeSnapshot(env,{windowSeconds,limit})
    : await ecosystemUniverseSnapshot(env,universeId,{windowSeconds,limit});
  return json({ok:true,readOnly:true,completeChainRepresentation:false,universeId,snapshot},200,'public, max-age=2, stale-while-revalidate=4');
}
