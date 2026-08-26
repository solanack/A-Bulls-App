import { manifestDisclosures, validateStoryManifest } from '../js/trickster-story-manifest.mjs';
import { intelligenceDb } from './intelligence-indexer.mjs';

const MAX_BODY_BYTES = 512 * 1024;
const SHARE_TTL_SECONDS = 90 * 24 * 60 * 60;
const SHARE_ID_RE=/^[a-f0-9]{24}$/;
const json = (body,status=200,cache='no-store') => new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':cache,
    'x-content-type-options':'nosniff'
  }
});

function enabled(env={}) {
  return String(env.TRICKSTER_STUDIO_ENABLED||'').trim().toLowerCase()==='true';
}
function shareEnabled(env={}) {
  return enabled(env)&&String(env.TRICKSTER_SHARE_ENABLED||'').trim().toLowerCase()==='true';
}

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

async function persistShareManifest(env,manifest){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const id=await shareIdFor(manifest),disclosures=manifestDisclosures(manifest),expiresAt=Math.floor(Date.now()/1000)+SHARE_TTL_SECONDS;
  await db.prepare(`INSERT OR IGNORE INTO trickster_share_manifests(id,manifest_json,disclosures_json,expires_at) VALUES(?,?,?,?)`).bind(id,JSON.stringify(manifest),JSON.stringify(disclosures),expiresAt).run();
  return Object.freeze({id,expiresAt,disclosures});
}

async function readShareManifest(env,id){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const row=await db.prepare(`SELECT id,manifest_json,disclosures_json,created_at,expires_at FROM trickster_share_manifests WHERE id=? AND expires_at>unixepoch() LIMIT 1`).bind(id).first();
  if(!row?.id)return null;
  let manifest,disclosures;try{manifest=JSON.parse(row.manifest_json);disclosures=JSON.parse(row.disclosures_json||'[]');}catch{throw new Error('stored_manifest_invalid');}
  return Object.freeze({id:String(row.id),manifest:validateStoryManifest(manifest),disclosures:Array.isArray(disclosures)?disclosures:[],createdAt:Number(row.created_at)||0,expiresAt:Number(row.expires_at)||0});
}

export async function handleTricksterRequest(request,env={}) {
  const url=new URL(request.url),validatePath='/api/intelligence/trickster/validate',sharePath='/api/intelligence/trickster/share';
  const shareMatch=url.pathname.match(/^\/api\/intelligence\/trickster\/share\/([a-f0-9]{24})$/);
  if(url.pathname!==validatePath&&url.pathname!==sharePath&&!shareMatch) return null;
  if(!enabled(env)) return json({ok:false,error:'feature_disabled'},404);

  if(shareMatch){
    if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
    if(!shareEnabled(env))return json({ok:false,error:'feature_disabled'},404);
    try{const record=await readShareManifest(env,shareMatch[1]);if(!record)return json({ok:false,error:'share_not_found'},404,'public, max-age=60');return json({ok:true,persisted:true,frozen:true,...record},200,'public, max-age=300, stale-while-revalidate=3600');}
    catch(error){const code=String(error?.message||error),status=code==='intelligence_db_unavailable'?503:500;return json({ok:false,error:code},status);}
  }

  if(request.method!=='POST') return json({ok:false,error:'method_not_allowed'},405);
  try {
    const input=await readBoundedJson(request);
    const manifest=validateStoryManifest(input);
    if(url.pathname===sharePath){
      if(!shareEnabled(env))return json({ok:false,error:'feature_disabled'},404);
      const record=await persistShareManifest(env,manifest);
      return json({ok:true,persisted:true,frozen:true,shareId:record.id,expiresAt:record.expiresAt,manifest,disclosures:record.disclosures});
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

export const __tricksterShareContract=Object.freeze({maxBodyBytes:MAX_BODY_BYTES,ttlSeconds:SHARE_TTL_SECONDS,shareIdPattern:SHARE_ID_RE.source});
