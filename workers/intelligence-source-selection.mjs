/* A Bulls App — provider-neutral evidence source selection.
 * Ranks configured read-only sources from observed health and requested depth.
 * Selection is retrieval strategy, never a claim of blockchain completeness.
 */
const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));

export function sourceDepthClass({from,to,nowSeconds=Math.floor(Date.now()/1000)}={}){
  const start=n(from),end=n(to)??nowSeconds;
  if(start==null)return'unknown';
  const age=Math.max(0,nowSeconds-Math.min(start,end));
  if(age<=7*86400)return'recent';
  if(age<=180*86400)return'historical';
  return'archive';
}

export function scoreEvidenceSource(source={},request={}){
  const state=s(source.state||'unknown').toLowerCase(),kind=s(source.kind||source.sourceKind||'rpc').toLowerCase(),depth=sourceDepthClass(request),latency=n(source.latencyMs),lastOk=n(source.lastOkAt),now=n(request.nowSeconds)??Math.floor(Date.now()/1000);
  let score=state==='ok'?60:state==='degraded'?25:state==='error'?-80:0;
  if(lastOk!=null)score+=clamp(20-Math.floor(Math.max(0,now-lastOk)/3600),0,20);
  if(latency!=null)score+=clamp(20-Math.floor(latency/100),-10,20);
  if(depth==='recent'&&(kind.includes('yellowstone')||kind.includes('stream')))score+=35;
  if(depth==='historical'&&(kind.includes('substream')||kind==='rpc'))score+=25;
  if(depth==='archive'&&(kind.includes('archive')||kind.includes('faithful')))score+=50;
  if(depth==='archive'&&kind==='rpc')score-=10;
  return score;
}

export function rankEvidenceSources(sources=[],request={}){
  return Object.freeze((Array.isArray(sources)?sources:[]).map(source=>Object.freeze({...source,score:scoreEvidenceSource(source,request)})).sort((a,b)=>b.score-a.score||s(a.name).localeCompare(s(b.name))));
}

export function chooseEvidenceSource(sources=[],request={}){
  const ranked=rankEvidenceSources(sources,request),selected=ranked.find(source=>s(source.state).toLowerCase()!=='error')||null;
  return Object.freeze({selected,ranked,depthClass:sourceDepthClass(request),disclosure:'Source selection ranks configured read-only sources using observed health, latency and requested historical depth. Ranking is a retrieval strategy only; it does not prove that a source has complete blockchain coverage.'});
}

export async function loadObservedSourceHealth(db){
  if(!db)return[];
  const result=await db.prepare(`SELECT source AS name,source_kind AS kind,state,last_ok_at AS lastOkAt,last_error_at AS lastErrorAt,latency_ms AS latencyMs,details_json AS detailsJson FROM intelligence_source_health ORDER BY updated_at DESC`).all();
  return (result?.results||[]).map(row=>({name:s(row.name),kind:s(row.kind||'rpc'),state:s(row.state||'unknown'),lastOkAt:n(row.lastOkAt),lastErrorAt:n(row.lastErrorAt),latencyMs:n(row.latencyMs),detailsJson:s(row.detailsJson)}));
}

export function buildRetrievalPlan(sources=[],request={}){
  const choice=chooseEvidenceSource(sources,request),ranked=choice.ranked.filter(x=>s(x.state).toLowerCase()!=='error');
  const primary=choice.selected;
  const fallbacks=ranked.filter(x=>!primary||x.name!==primary.name).slice(0,3);
  return Object.freeze({depthClass:choice.depthClass,primary,fallbacks:Object.freeze(fallbacks),attemptOrder:Object.freeze([primary,...fallbacks].filter(Boolean)),coverageClaim:'unknown-until-measured',disclosure:choice.disclosure});
}


