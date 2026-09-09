import { intelligenceDb } from './intelligence-indexer.mjs';

const KINDS=new Set(['planet','star','trade','matched_round','research_thread','replay','evidence','cut','thesis','resolution','ghost','sequence','comparison']);
const s=value=>String(value??'').trim();
const json=(body,status=200,cache='public, max-age=10, stale-while-revalidate=30')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const parse=value=>{try{return JSON.parse(String(value||'{}'));}catch{return{};}};
const ms=value=>{const n=Number(value);return Number.isInteger(n)&&n>=1_000_000_000_000?n:null;};

export function mapResearchIndexRow(row={}){return Object.freeze({id:s(row.id),kind:s(row.kind),mint:s(row.mint)||null,wallet:s(row.wallet)||null,galaxyId:s(row.galaxy_id)||null,title:s(row.title),summary:s(row.summary)||null,sourceKind:s(row.source_kind),sourceRef:s(row.source_ref)||null,observedTs:ms(row.observed_ts),coverage:s(row.coverage)||null,visibility:s(row.visibility)||'public',payload:Object.freeze(parse(row.payload_json)),createdAt:ms(row.created_at),updatedAt:ms(row.updated_at)});}

async function listIndex(request,env={}){
  const db=intelligenceDb(env);if(!db)return json({ok:false,coverage:'degraded',items:[],error:'database_unavailable',disclosure:'The Intelligence D1 binding is unavailable. No live fallback was attempted.'},503,'no-store');
  const url=new URL(request.url),kind=s(url.searchParams.get('kind')),mint=s(url.searchParams.get('mint')),wallet=s(url.searchParams.get('wallet')),query=s(url.searchParams.get('q')).slice(0,120),limit=Math.max(1,Math.min(100,Math.trunc(Number(url.searchParams.get('limit'))||30)));
  if(kind&&!KINDS.has(kind))return json({ok:false,coverage:'empty',items:[],error:'invalid_kind'},400,'no-store');
  const where=["visibility='public'"],bindings=[];
  if(kind){where.push('kind=?');bindings.push(kind);}if(mint){where.push('mint=?');bindings.push(mint);}if(wallet){where.push('wallet=?');bindings.push(wallet);}if(query){where.push('(title LIKE ? OR summary LIKE ? OR mint LIKE ? OR wallet LIKE ?)');const q=`%${query.replaceAll('%','')}%`;bindings.push(q,q,q,q);}
  try{const result=await db.prepare(`SELECT id,kind,mint,wallet,galaxy_id,title,summary,source_kind,source_ref,observed_ts,coverage,visibility,payload_json,created_at,updated_at FROM research_index_objects WHERE ${where.join(' AND ')} ORDER BY COALESCE(observed_ts,updated_at) DESC,id DESC LIMIT ?`).bind(...bindings,limit).all();const items=(result?.results||[]).map(mapResearchIndexRow);return json({ok:true,coverage:items.length?'fresh':'empty',items,disclosure:items.length?'Indexed research objects only. Provider-reported context and derived calculations retain their source labels.':'No retained public research objects match this query.'});}catch{return json({ok:false,coverage:'degraded',items:[],error:'research_index_unavailable',disclosure:'The research Index could not be read. No provider fallback was attempted.'},503,'no-store');}
}

async function coverage(env={}){
  const db=intelligenceDb(env);if(!db)return json({ok:false,coverage:'degraded',sources:[],error:'database_unavailable'},503,'no-store');
  try{const result=await db.prepare('SELECT source,last_observed_slot,last_verified_slot,gap_from_slot,gap_to_slot,status,detail,updated_at FROM index_coverage_checkpoints ORDER BY source ASC').all();return json({ok:true,coverage:'fresh',sources:result?.results||[],disclosure:'Verified-through slots are shown only when an indexing process has independently written verification evidence.'});}catch{return json({ok:false,coverage:'degraded',sources:[],error:'coverage_store_unavailable'},503,'no-store');}
}

export async function handleResearchIndexRequest(request,env={}){
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/api/intelligence/research/index')return listIndex(request,env);
  if(request.method==='GET'&&url.pathname==='/api/intelligence/research/coverage')return coverage(env);
  return null;
}
