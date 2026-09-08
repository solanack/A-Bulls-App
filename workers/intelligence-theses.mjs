import { intelligenceDb } from './intelligence-indexer.mjs';

const MINT_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TARGET_KINDS=new Set(['star','planet']);
const CITATION_KINDS=new Set(['tx','candle','holder_snapshot','replay_event']);
const MAX_CITATIONS=20;
const CLAIM_MAX=180;
const BODY_MAX=4000;
const PUBLISH_CACHE_MAX_AGE_MS=15*60*1000;
const RESOLUTION_EARLY_TOLERANCE_MS=15*60*1000;
const RESOLUTION_GRACE_MS=2*60*60*1000;
const DAY_MS=24*60*60*1000;

const s=value=>String(value??'').trim();
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const nullableNumber=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const parseJson=value=>{try{return typeof value==='object'&&value?value:JSON.parse(String(value||'null'));}catch{return null;}};

export function normalizeThesisTimestampMs(value){
  const number=Number(value);
  if(!Number.isInteger(number)||number<1_000_000_000_000||number>9_999_999_999_999)return null;
  return number;
}

export function extractThesisMetrics(payload={}){
  const root=payload&&typeof payload==='object'?payload:{};
  const market=root.market&&typeof root.market==='object'?root.market:root;
  const holders=root.holders&&typeof root.holders==='object'?root.holders:{};
  return Object.freeze({
    marketCap:nullableNumber(market.marketCapUsd),
    liquidity:nullableNumber(market.liquidityUsd),
    topHolderPct:nullableNumber(holders.top10Pct),
  });
}

function mergeMetrics(rows=[]){
  let marketCap=null,liquidity=null,topHolderPct=null,observedAt=null;
  for(const row of rows){
    const payload=parseJson(row.payload_json);
    if(!payload)continue;
    const metrics=extractThesisMetrics(payload);
    if(marketCap==null&&metrics.marketCap!=null)marketCap=metrics.marketCap;
    if(liquidity==null&&metrics.liquidity!=null)liquidity=metrics.liquidity;
    if(topHolderPct==null&&metrics.topHolderPct!=null)topHolderPct=metrics.topHolderPct;
    const at=Number(row.generated_at)*1000;
    if(Number.isFinite(at))observedAt=observedAt==null?at:Math.max(observedAt,at);
  }
  if(observedAt==null)return null;
  return Object.freeze({marketCap,liquidity,topHolderPct,observedAt});
}

async function cachedSnapshot(db,mint,{minObservedMs=0,maxObservedMs=Date.now()+60_000}={}){
  if(!db)return null;
  const keys=[`field:resolve:v2:${mint}`,`field:market:v1:${mint}`];
  try{
    const result=await db.prepare(`SELECT cache_key,payload_json,generated_at FROM bull_intelligence_cache WHERE cache_key IN (?,?) ORDER BY generated_at DESC`).bind(...keys).all();
    const rows=(result?.results||[]).filter(row=>{
      const at=Number(row.generated_at)*1000;
      return Number.isFinite(at)&&at>=minObservedMs&&at<=maxObservedMs;
    });
    return mergeMetrics(rows);
  }catch{return null;}
}

async function principal(request,env={}){
  const verifier=env.SOCIAL_AUTH;
  if(!verifier||typeof verifier.fetch!=='function')return null;
  const authorization=request.headers.get('authorization');
  if(!authorization)return null;
  try{
    const response=await verifier.fetch('https://a-bulls-app.internal/api/social-auth/verify',{
      method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify({audience:'a-bulls-social'}),
    });
    if(!response.ok)return null;
    const body=await response.json();
    const id=s(body?.subject||body?.userId);
    return id?{id}:null;
  }catch{return null;}
}

async function readBody(request){
  const declared=Number(request.headers.get('content-length')||0);
  if(Number.isFinite(declared)&&declared>32_768)throw new Error('request_body_too_large');
  const text=await request.text();
  if(new TextEncoder().encode(text).byteLength>32_768)throw new Error('request_body_too_large');
  try{return JSON.parse(text||'{}');}catch{throw new Error('invalid_json');}
}

async function first(db,sql,bindings=[]){
  try{return await db.prepare(sql).bind(...bindings).first();}catch{return null;}
}

function closeEnough(a,b){
  const left=nullableNumber(a),right=nullableNumber(b);
  if(left==null||right==null)return false;
  const scale=Math.max(1,Math.abs(left),Math.abs(right));
  return Math.abs(left-right)<=scale*1e-9;
}

function parseCandleRef(ref){
  const match=/^candle:(\d{13}):(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)$/i.exec(s(ref));
  if(!match)return null;
  const observedTs=normalizeThesisTimestampMs(Number(match[1]));
  const close=nullableNumber(match[2]);
  return observedTs!=null&&close!=null?{observedTs,close}:null;
}

async function validateCitation(db,targetId,citation,fromTs,toTs){
  const kind=s(citation?.kind);
  const ref=s(citation?.ref);
  const observedTs=normalizeThesisTimestampMs(citation?.observedTs);
  if(!CITATION_KINDS.has(kind)||!ref||observedTs==null||observedTs<fromTs||observedTs>toTs)return null;
  const label=s(citation?.label).slice(0,160);
  if(kind==='tx'||kind==='replay_event'){
    let row=await first(db,'SELECT signature,block_time FROM bull_wallet_events WHERE signature=? AND mint=? LIMIT 1',[ref,targetId]);
    if(!row)row=await first(db,'SELECT signature,block_time FROM pump_trades WHERE signature=? AND mint=? LIMIT 1',[ref,targetId]);
    const indexedTs=Number(row?.block_time)*1000;
    if(!row||!Number.isFinite(indexedTs)||Math.abs(indexedTs-observedTs)>1000)return null;
    return Object.freeze({kind,ref,observedTs,label:label||'Indexed transaction'});
  }
  if(kind==='candle'){
    const parsed=parseCandleRef(ref);
    if(!parsed||parsed.observedTs!==observedTs)return null;
    const bucketStart=Math.trunc(observedTs/1000);
    let row=await first(db,'SELECT close FROM intelligence_price_candles WHERE mint=? AND bucket_start=? AND close IS NOT NULL LIMIT 1',[targetId,bucketStart]);
    if(!row)row=await first(db,'SELECT close FROM pump_candles WHERE mint=? AND bucket_start=? AND close IS NOT NULL LIMIT 1',[targetId,bucketStart]);
    if(!row||!closeEnough(row.close,parsed.close))return null;
    return Object.freeze({kind,ref,observedTs,label:label||'Indexed candle close'});
  }
  if(kind==='holder_snapshot'){
    const prefix=`field:resolve:v2:${targetId}:`;
    if(!ref.startsWith(prefix))return null;
    const refTs=normalizeThesisTimestampMs(Number(ref.slice(prefix.length)));
    if(refTs!==observedTs)return null;
    const row=await first(db,'SELECT payload_json,generated_at FROM bull_intelligence_cache WHERE cache_key=? LIMIT 1',[`field:resolve:v2:${targetId}`]);
    const generatedTs=Number(row?.generated_at)*1000;
    const metrics=extractThesisMetrics(parseJson(row?.payload_json)||{});
    if(!row||generatedTs!==observedTs||metrics.topHolderPct==null)return null;
    return Object.freeze({kind,ref,observedTs,label:label||'Indexed holder concentration snapshot'});
  }
  return null;
}

async function validateCitations(db,targetId,citations,fromTs,toTs){
  if(!Array.isArray(citations)||citations.length<1||citations.length>MAX_CITATIONS)return null;
  const validated=[];
  for(const citation of citations){
    const value=await validateCitation(db,targetId,citation,fromTs,toTs);
    if(!value)return null;
    validated.push(value);
  }
  return validated;
}

function mapResolution(row){
  if(!row||row.resolved_at==null)return null;
  return Object.freeze({
    id:s(row.id),window:'24h',
    atPublishMarketCap:nullableNumber(row.at_publish_market_cap),atResolveMarketCap:nullableNumber(row.at_resolve_market_cap),
    atPublishLiquidity:nullableNumber(row.at_publish_liquidity),atResolveLiquidity:nullableNumber(row.at_resolve_liquidity),
    atPublishTopHolderPct:nullableNumber(row.at_publish_top_holder_pct),atResolveTopHolderPct:nullableNumber(row.at_resolve_top_holder_pct),
    evidenceQuality:s(row.evidence_quality)||'unavailable',resolvedAt:normalizeThesisTimestampMs(row.resolved_at),
  });
}

async function listForTarget(db,targetKind,targetId,limit){
  const result=await db.prepare(`SELECT id,target_kind,target_id,galaxy_id,claim,body,replay_window_id,from_ts,to_ts,status,created_at,updated_at FROM theses WHERE target_kind=? AND target_id=? AND status IN ('open','resolved') ORDER BY created_at DESC,id DESC LIMIT ?`).bind(targetKind,targetId,limit).all();
  const items=[];
  for(const row of result?.results||[]){
    const [citationsResult,resolution]=await Promise.all([
      db.prepare('SELECT id,kind,ref,observed_ts,label FROM thesis_citations WHERE thesis_id=? ORDER BY observed_ts ASC,id ASC').bind(row.id).all(),
      db.prepare("SELECT id,window,at_publish_market_cap,at_resolve_market_cap,at_publish_liquidity,at_resolve_liquidity,at_publish_top_holder_pct,at_resolve_top_holder_pct,evidence_quality,resolved_at FROM thesis_resolutions WHERE thesis_id=? AND window='24h' LIMIT 1").bind(row.id).first(),
    ]);
    items.push(Object.freeze({
      id:s(row.id),targetKind:s(row.target_kind),targetId:s(row.target_id),galaxyId:s(row.galaxy_id),claim:s(row.claim),body:s(row.body),replayWindowId:s(row.replay_window_id)||null,
      fromTs:normalizeThesisTimestampMs(row.from_ts),toTs:normalizeThesisTimestampMs(row.to_ts),status:s(row.status),createdAt:normalizeThesisTimestampMs(row.created_at),updatedAt:normalizeThesisTimestampMs(row.updated_at),
      citations:Object.freeze((citationsResult?.results||[]).map(item=>Object.freeze({id:s(item.id),kind:s(item.kind),ref:s(item.ref),observedTs:normalizeThesisTimestampMs(item.observed_ts),label:s(item.label)}))),
      resolution:mapResolution(resolution),
    }));
  }
  return items;
}

async function listTheses(request,env={}){
  const db=intelligenceDb(env);
  if(!db)return json({ok:false,coverage:'degraded',items:[],error:'database_unavailable',disclosure:'The Intelligence D1 binding is unavailable. No live fallback was attempted.'},503);
  const url=new URL(request.url);
  const targetKind=s(url.searchParams.get('targetKind'));
  const targetId=s(url.searchParams.get('targetId'));
  const limit=Math.max(1,Math.min(50,Math.trunc(Number(url.searchParams.get('limit'))||20)));
  if(!TARGET_KINDS.has(targetKind)||!targetId||targetId.length>160)return json({ok:false,coverage:'empty',items:[],error:'invalid_target',disclosure:'A valid universe target is required.'},400);
  try{
    const items=await listForTarget(db,targetKind,targetId,limit);
    return json({ok:true,coverage:items.length?'fresh':'empty',targetKind,targetId,items,disclosure:items.length?'Cited claims are user speech attached to indexed evidence. They are not market facts or recommendations.':'No published cited claims are on record for this target.'},200,'public, max-age=5, stale-while-revalidate=15');
  }catch{
    return json({ok:false,coverage:'degraded',items:[],error:'thesis_store_unavailable',disclosure:'The thesis store could not be read. No live fallback was attempted.'},503);
  }
}

function pendingQuality(metrics){
  return metrics&&[metrics.marketCap,metrics.liquidity,metrics.topHolderPct].some(value=>value!=null)?'partial':'unavailable';
}

async function publishThesis(request,env={}){
  const actor=await principal(request,env);
  if(!actor)return json({ok:false,error:'account_required'},401);
  const db=intelligenceDb(env);
  if(!db)return json({ok:false,error:'database_unavailable',coverage:'degraded'},503);
  let body;
  try{body=await readBody(request);}catch(error){const code=s(error?.message||error);return json({ok:false,error:code},code==='request_body_too_large'?413:400);}
  const targetKind=s(body.targetKind),targetId=s(body.targetId),galaxyId=s(body.galaxyId);
  const claim=s(body.claim),thesisBody=s(body.body),replayWindowId=s(body.replayWindowId)||null;
  const fromTs=normalizeThesisTimestampMs(body.fromTs),toTs=normalizeThesisTimestampMs(body.toTs);
  if(targetKind!=='star'||!MINT_RE.test(targetId))return json({ok:false,error:'invalid_star_target'},400);
  if(!galaxyId||galaxyId.length>80)return json({ok:false,error:'invalid_galaxy'},400);
  if(!claim||claim.length>CLAIM_MAX)return json({ok:false,error:'claim_must_be_1_to_180_characters'},400);
  if(!thesisBody||thesisBody.length>BODY_MAX)return json({ok:false,error:'body_must_be_1_to_4000_characters'},400);
  if(fromTs==null||toTs==null||toTs<fromTs||toTs-fromTs>5*365*DAY_MS)return json({ok:false,error:'invalid_replay_window_ms'},400);
  const citations=await validateCitations(db,targetId,body.citations,fromTs,toTs);
  if(!citations)return json({ok:false,error:Array.isArray(body.citations)&&body.citations.length?'citation_not_indexed':'citation_required'},400);
  const now=Date.now();
  const publishSnapshot=await cachedSnapshot(db,targetId,{minObservedMs:now-PUBLISH_CACHE_MAX_AGE_MS,maxObservedMs:now+60_000});
  const id=crypto.randomUUID(),resolutionId=crypto.randomUUID();
  const statements=[
    db.prepare("INSERT INTO theses (id,author_account_id,target_kind,target_id,galaxy_id,claim,body,replay_window_id,from_ts,to_ts,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'open',?,?)").bind(id,actor.id,targetKind,targetId,galaxyId,claim,thesisBody,replayWindowId,fromTs,toTs,now,now),
    ...citations.map(citation=>db.prepare('INSERT INTO thesis_citations (id,thesis_id,kind,ref,observed_ts,label) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,citation.kind,citation.ref,citation.observedTs,citation.label)),
    db.prepare("INSERT INTO thesis_resolutions (id,thesis_id,window,at_publish_market_cap,at_publish_liquidity,at_publish_top_holder_pct,evidence_quality,resolved_at) VALUES (?,?,'24h',?,?,?, ?,NULL)").bind(resolutionId,id,publishSnapshot?.marketCap??null,publishSnapshot?.liquidity??null,publishSnapshot?.topHolderPct??null,pendingQuality(publishSnapshot)),
  ];
  try{await db.batch(statements);}catch{return json({ok:false,error:'thesis_write_failed'},500);}
  return json({ok:true,id,status:'open',targetKind:'star',targetId,citations,createdAt:now},201);
}

export function resolutionDecision({createdAt,nowMs=Date.now(),resolveSnapshot=null}={}){
  const publishTs=normalizeThesisTimestampMs(createdAt);
  if(publishTs==null)return Object.freeze({action:'skip',reason:'invalid_created_at'});
  const target=publishTs+DAY_MS;
  if(nowMs<target)return Object.freeze({action:'wait',reason:'not_due'});
  if(resolveSnapshot)return Object.freeze({action:'resolve',reason:'snapshot_available'});
  if(nowMs<target+RESOLUTION_GRACE_MS)return Object.freeze({action:'wait',reason:'snapshot_missing'});
  return Object.freeze({action:'resolve',reason:'snapshot_unavailable'});
}

function evidenceQuality(row,snapshot){
  if(!snapshot)return'unavailable';
  const pairs=[
    [nullableNumber(row.at_publish_market_cap),snapshot.marketCap],
    [nullableNumber(row.at_publish_liquidity),snapshot.liquidity],
    [nullableNumber(row.at_publish_top_holder_pct),snapshot.topHolderPct],
  ];
  const comparable=pairs.filter(([before,after])=>before!=null&&after!=null).length;
  return comparable===3?'observed':comparable>0?'partial':'unavailable';
}

export async function resolveDueTheses(env={},nowMs=Date.now()){
  const db=intelligenceDb(env);
  if(!db)return Object.freeze({ok:false,state:'database-unavailable',checked:0,resolved:0});
  let rows;
  try{
    const result=await db.prepare(`SELECT t.id,t.target_id,t.created_at,r.id AS resolution_id,r.at_publish_market_cap,r.at_publish_liquidity,r.at_publish_top_holder_pct FROM theses t JOIN thesis_resolutions r ON r.thesis_id=t.id AND r.window='24h' WHERE t.status='open' AND t.created_at<=? ORDER BY t.created_at ASC LIMIT 25`).bind(nowMs-DAY_MS).all();
    rows=result?.results||[];
  }catch{return Object.freeze({ok:false,state:'schema-unavailable',checked:0,resolved:0});}
  let resolved=0;
  for(const row of rows){
    const createdAt=normalizeThesisTimestampMs(row.created_at);
    if(createdAt==null)continue;
    const target=createdAt+DAY_MS;
    const snapshot=await cachedSnapshot(db,s(row.target_id),{minObservedMs:target-RESOLUTION_EARLY_TOLERANCE_MS,maxObservedMs:Math.min(nowMs+60_000,target+RESOLUTION_GRACE_MS)});
    const decision=resolutionDecision({createdAt,nowMs,resolveSnapshot:snapshot});
    if(decision.action!=='resolve')continue;
    const quality=evidenceQuality(row,snapshot);
    const atResolveMarketCap=snapshot?.marketCap??null,atResolveLiquidity=snapshot?.liquidity??null,atResolveTopHolderPct=snapshot?.topHolderPct??null;
    try{
      await db.batch([
        db.prepare("UPDATE thesis_resolutions SET at_resolve_market_cap=?,at_resolve_liquidity=?,at_resolve_top_holder_pct=?,evidence_quality=?,resolved_at=? WHERE id=?").bind(atResolveMarketCap,atResolveLiquidity,atResolveTopHolderPct,quality,nowMs,row.resolution_id),
        db.prepare("UPDATE theses SET status='resolved',updated_at=? WHERE id=?").bind(nowMs,row.id),
      ]);
      resolved++;
    }catch(error){console.error('[thesis-resolution]',s(error?.message||error));}
  }
  return Object.freeze({ok:true,state:'complete',checked:rows.length,resolved});
}

export async function handleThesisRequest(request,env={}){
  const url=new URL(request.url);
  if(url.pathname!=='/api/intelligence/theses')return null;
  if(request.method==='GET')return listTheses(request,env);
  if(request.method==='POST')return publishThesis(request,env);
  return json({ok:false,error:'method_not_allowed'},405);
}

export const __thesisContract=Object.freeze({
  firstSlice:true,readOnlyMarketEvidence:true,walletConnectionEnabled:false,chainExecutionEnabled:false,
  publishRequiresAccount:true,publishRequiresIndexedCitation:true,timestamps:'milliseconds',resolutionWindow:'24h',resolutionSource:'bull_intelligence_cache-only',
});
