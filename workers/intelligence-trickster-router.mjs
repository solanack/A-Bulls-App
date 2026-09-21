import { cutSharePath, manifestDisclosures, validateStoryManifest } from '../js/trickster-story-manifest.mjs';
import { intelligenceDb } from './intelligence-indexer.mjs';

const MAX_BODY_BYTES = 512 * 1024;
const SHARE_TTL_SECONDS = 90 * 24 * 60 * 60;
const SHARE_ID_RE=/^[a-f0-9]{24}$/;
const ACTIVITY_KINDS=new Set(['view','share']);
const TRENDING_DEFAULT_DAYS=7;
const TRENDING_MAX_DAYS=30;
const TRENDING_MAX_ITEMS=24;
const json = (body,status=200,cache='no-store') => new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':cache,
    'x-content-type-options':'nosniff'
  }
});

function enabled(env={}) { return String(env.TRICKSTER_STUDIO_ENABLED||'').trim().toLowerCase()==='true'; }
function shareEnabled(env={}) { return enabled(env)&&String(env.TRICKSTER_SHARE_ENABLED||'').trim().toLowerCase()==='true'; }

async function readBoundedJson(request) {
  const declared=Number(request.headers.get('content-length')||0);
  if(Number.isFinite(declared)&&declared>MAX_BODY_BYTES) throw new RangeError('manifest_too_large');
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES) throw new RangeError('manifest_too_large');
  try { return JSON.parse(raw); }
  catch { throw new SyntaxError('invalid_json'); }
}

async function shareIdFor(manifest){
  const bytes=new TextEncoder().encode(JSON.stringify(manifest));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('').slice(0,24);
}

async function indexFrozenCut(db,id,manifest,nowMs=Date.now()){
  const subjectId=String(manifest?.subject?.id||''),parts=subjectId.split(':'),wallet=parts.length>1?parts[0]||null:null,mint=parts.length>1?parts.slice(1).join(':')||null:null,coverage=String(manifest?.coverage?.statement||'Frozen receipt-bound Cut.'),title=`Frozen Cut · ${mint?mint.slice(0,8):id.slice(0,8)}`,summary='Receipt-bound Trickster Cut with immutable VERIFY manifest. User-created interpretation remains separate from observed/calculated claims.',payload={shareId:id,verifyPath:cutSharePath(id),manifestId:String(manifest?.id||''),aspectRatio:String(manifest?.output?.aspectRatio||'')};
  await db.prepare(`INSERT INTO research_index_objects(id,kind,mint,wallet,galaxy_id,title,summary,source_kind,source_ref,observed_ts,coverage,visibility,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,source_ref=excluded.source_ref,coverage=excluded.coverage,payload_json=excluded.payload_json,updated_at=excluded.updated_at`).bind(`cut:${id}`,'cut',mint,wallet,null,title,summary,'user-claim',cutSharePath(id),nowMs,coverage,'public',JSON.stringify(payload),nowMs,nowMs).run();
}

async function recordCutActivity(env,id,kind){
  if(!SHARE_ID_RE.test(id)||!ACTIVITY_KINDS.has(kind))return Object.freeze({ok:false,error:'invalid_activity'});
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const exists=await db.prepare(`SELECT id FROM trickster_share_manifests WHERE id=? AND expires_at>unixepoch() LIMIT 1`).bind(id).first();
  if(!exists?.id)return Object.freeze({ok:false,error:'share_not_found'});
  await db.prepare(`INSERT INTO trickster_cut_activity(cut_id,event_kind,occurred_at) VALUES(?,?,unixepoch())`).bind(id,kind).run();
  return Object.freeze({ok:true,shareId:id,kind});
}

async function trendingCuts(env,{days=TRENDING_DEFAULT_DAYS,limit=12}={}){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const boundedDays=Math.max(1,Math.min(TRENDING_MAX_DAYS,Math.trunc(Number(days)||TRENDING_DEFAULT_DAYS))),cap=Math.max(1,Math.min(TRENDING_MAX_ITEMS,Math.trunc(Number(limit)||12))),since=Math.floor(Date.now()/1000)-boundedDays*86400;
  const result=await db.prepare(`SELECT m.id,m.manifest_json,m.created_at,m.expires_at,SUM(CASE WHEN a.event_kind='view' THEN 1 ELSE 0 END) view_count,SUM(CASE WHEN a.event_kind='share' THEN 1 ELSE 0 END) share_count,MAX(a.occurred_at) last_activity_at FROM trickster_share_manifests m JOIN trickster_cut_activity a ON a.cut_id=m.id AND a.occurred_at>=? WHERE m.expires_at>unixepoch() GROUP BY m.id,m.manifest_json,m.created_at,m.expires_at ORDER BY share_count DESC,view_count DESC,last_activity_at DESC,m.created_at DESC LIMIT ?`).bind(since,cap).all();
  const items=[];
  for(const row of result?.results||[]){try{const manifest=validateStoryManifest(JSON.parse(row.manifest_json));items.push(Object.freeze({shareId:String(row.id),viewCount:Math.max(0,Number(row.view_count)||0),shareCount:Math.max(0,Number(row.share_count)||0),createdAt:Number(row.created_at)||0,lastActivityAt:Number(row.last_activity_at)||0,expiresAt:Number(row.expires_at)||0,verifyUrl:cutSharePath(String(row.id)),manifest}));}catch{/* invalid stored manifests stay excluded */}}
  return Object.freeze({ok:true,coverage:items.length?'fresh':'empty',windowDays:boundedDays,items,disclosure:items.length?'Trending Cuts are frozen manifests ordered by real anonymous share actions, then view opens, within the retained time window. Counts are not unique people and do not imply quality, skill, or recommendation.':'No frozen Cuts have retained view/share activity in this window. Nothing was promoted as trending.'});
}

async function persistShareManifest(env,manifest){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const id=await shareIdFor(manifest),disclosures=manifestDisclosures(manifest),expiresAt=Math.floor(Date.now()/1000)+SHARE_TTL_SECONDS;
  await db.prepare(`INSERT OR IGNORE INTO trickster_share_manifests(id,manifest_json,disclosures_json,expires_at) VALUES(?,?,?,?)`).bind(id,JSON.stringify(manifest),JSON.stringify(disclosures),expiresAt).run();
  await indexFrozenCut(db,id,manifest);
  return Object.freeze({id,expiresAt,disclosures});
}

async function readShareManifest(env,id){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const row=await db.prepare(`SELECT id,manifest_json,disclosures_json,created_at,expires_at FROM trickster_share_manifests WHERE id=? AND expires_at>unixepoch() LIMIT 1`).bind(id).first();
  if(!row?.id)return null;
  let manifest,disclosures;try{manifest=JSON.parse(row.manifest_json);disclosures=JSON.parse(row.disclosures_json||'[]');}catch{throw new Error('stored_manifest_invalid');}
  return Object.freeze({id:String(row.id),manifest:validateStoryManifest(manifest),disclosures:Array.isArray(disclosures)?disclosures:[],createdAt:Number(row.created_at)||0,expiresAt:Number(row.expires_at)||0});
}

export async function pruneTricksterShareManifests(env={}){
  if(!shareEnabled(env))return Object.freeze({enabled:false,deleted:0});
  const db=intelligenceDb(env);if(!db)return Object.freeze({enabled:true,deleted:0,unavailable:true});
  const result=await db.prepare(`DELETE FROM trickster_share_manifests WHERE expires_at<=unixepoch()`).run();
  return Object.freeze({enabled:true,deleted:Math.max(0,Number(result?.meta?.changes)||0)});
}

export async function handleTricksterRequest(request,env={}) {
  const url=new URL(request.url),validatePath='/api/intelligence/trickster/validate',sharePath='/api/intelligence/trickster/share',activityPath='/api/intelligence/trickster/activity',trendingPath='/api/intelligence/trickster/trending';
  const shareMatch=url.pathname.match(/^\/api\/intelligence\/trickster\/share\/([a-f0-9]{24})$/);
  if(url.pathname!==validatePath&&url.pathname!==sharePath&&url.pathname!==activityPath&&url.pathname!==trendingPath&&!shareMatch) return null;
  if(!enabled(env)) return json({ok:false,error:'feature_disabled'},404);
  if(url.pathname===trendingPath){
    if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
    if(!shareEnabled(env))return json({ok:false,error:'feature_disabled'},404);
    try{const result=await trendingCuts(env,{days:url.searchParams.get('days'),limit:url.searchParams.get('limit')});return json(result,200,'public, max-age=60, stale-while-revalidate=180');}
    catch(error){const code=String(error?.message||error),status=code==='intelligence_db_unavailable'?503:500;return json({ok:false,error:code},status);}
  }
  if(url.pathname===activityPath){
    if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
    if(!shareEnabled(env))return json({ok:false,error:'feature_disabled'},404);
    try{const input=await readBoundedJson(request),id=String(input?.shareId||'').trim(),kind=String(input?.kind||'').trim().toLowerCase(),result=await recordCutActivity(env,id,kind);if(!result.ok)return json(result,result.error==='share_not_found'?404:400);return json(result,200);}
    catch(error){const code=String(error?.message||error),status=code==='intelligence_db_unavailable'?503:400;return json({ok:false,error:code},status);}
  }
  if(shareMatch){
    if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
    if(!shareEnabled(env))return json({ok:false,error:'feature_disabled'},404);
    try{const record=await readShareManifest(env,shareMatch[1]);if(!record)return json({ok:false,error:'share_not_found'},404,'public, max-age=60');const page=cutSharePath(record.id);return json({ok:true,persisted:true,frozen:true,...record,shareUrl:page,verifyUrl:page},200,'public, max-age=300, stale-while-revalidate=3600');}
    catch(error){const code=String(error?.message||error),status=code==='intelligence_db_unavailable'?503:500;return json({ok:false,error:code},status);}
  }
  if(request.method!=='POST') return json({ok:false,error:'method_not_allowed'},405);
  try {
    const input=await readBoundedJson(request);
    const manifest=validateStoryManifest(input);
    if(url.pathname===sharePath){
      if(!shareEnabled(env))return json({ok:false,error:'feature_disabled'},404);
      const record=await persistShareManifest(env,manifest);
      const page=cutSharePath(record.id);
      return json({ok:true,persisted:true,frozen:true,shareId:record.id,shareUrl:page,verifyUrl:page,expiresAt:record.expiresAt,manifest,disclosures:record.disclosures});
    }
    return json({ok:true,persisted:false,publishable:true,manifest,disclosures:manifestDisclosures(manifest)});
  } catch(error) {
    const code=error instanceof RangeError&&error.message==='manifest_too_large'
      ? 'manifest_too_large'
      : error instanceof SyntaxError&&error.message==='invalid_json'
        ? 'invalid_json'
        : String(error?.message||error)==='intelligence_db_unavailable'
          ? 'intelligence_db_unavailable'
          : 'invalid_manifest';
    const status=code==='manifest_too_large'?413:code==='intelligence_db_unavailable'?503:400;
    return json({ok:false,error:code,message:code==='invalid_manifest'?String(error?.message||error):undefined},status);
  }
}

export const __tricksterShareContract=Object.freeze({maxBodyBytes:MAX_BODY_BYTES,ttlSeconds:SHARE_TTL_SECONDS,shareIdPattern:SHARE_ID_RE.source,shareQueryParam:'cut',activityKinds:Object.freeze([...ACTIVITY_KINDS]),trendingDefaultDays:TRENDING_DEFAULT_DAYS,trendingMaxDays:TRENDING_MAX_DAYS});

