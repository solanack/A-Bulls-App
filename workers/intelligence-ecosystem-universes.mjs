import { intelligenceDb } from './intelligence-indexer.mjs';

const ADDRESS_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=v=>Math.max(0,Math.min(1,n(v)));
const parse=v=>{if(v&&typeof v==='object')return v;try{return JSON.parse(String(v||'{}'));}catch{return{};}};
const uniq=values=>[...new Set(values.filter(Boolean))];
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const median=values=>{if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const std=values=>{if(values.length<2)return 0;const m=mean(values);return Math.sqrt(values.reduce((sum,v)=>sum+(v-m)**2,0)/values.length);};

export async function listUniverses(env={}){
  const db=intelligenceDb(env);if(!db)return[];
  const r=await db.prepare(`SELECT u.*,COALESCE(m.c,0) active_member_count FROM intelligence_universes u LEFT JOIN (SELECT universe_id,COUNT(*) c FROM intelligence_universe_membership WHERE active=1 GROUP BY universe_id)m ON m.universe_id=u.universe_id WHERE u.active=1 ORDER BY CASE u.universe_id WHEN 'z500-top10' THEN 0 WHEN 'solana' THEN 1 ELSE 2 END,u.label`).all();
  return(r?.results||[]).map(row=>({universeId:s(row.universe_id),label:s(row.label),ecosystemKind:s(row.ecosystem_kind),source:s(row.source),description:s(row.description),selectorVersion:s(row.selector_version),refreshSeconds:n(row.refresh_seconds),activeMemberCount:n(row.active_member_count),updatedAt:n(row.updated_at)}));
}

export async function universeMembers(env={},universeId='',{activeOnly=true,limit=1000}={}){
  const db=intelligenceDb(env);if(!db)return[];const cap=Math.max(1,Math.min(5000,Math.trunc(n(limit)||1000)));
  const sql=activeOnly?`SELECT * FROM intelligence_universe_membership WHERE universe_id=? AND active=1 ORDER BY rank IS NULL,rank,last_seen_at DESC LIMIT ?`:`SELECT * FROM intelligence_universe_membership WHERE universe_id=? ORDER BY active DESC,rank IS NULL,rank,last_seen_at DESC LIMIT ?`;
  const r=await db.prepare(sql).bind(s(universeId),cap).all();
  return(r?.results||[]).map(row=>({universeId:s(row.universe_id),entityKind:s(row.entity_kind),entityId:s(row.entity_id),rank:row.rank==null?null:n(row.rank),active:n(row.active)===1,qualifyingCycles:n(row.qualifying_cycles),firstEnteredAt:n(row.first_entered_at),lastEnteredAt:n(row.last_entered_at),lastSeenAt:n(row.last_seen_at),lastExitedAt:row.last_exited_at==null?null:n(row.last_exited_at),entryCount:n(row.entry_count),metadata:parse(row.metadata_json)}));
}

export async function syncUniverseMembership(env={},universeId='',candidates=[],options={}){
  const db=intelligenceDb(env);if(!db)throw new Error('Intelligence database binding is unavailable.');
  const id=s(universeId);if(!id)throw new TypeError('universe id is required');
  const now=Math.max(0,Math.trunc(n(options.now)||Date.now()/1000)),snapshotId=s(options.snapshotId)||`${id}:${now}`,reason=s(options.reason)||'selector-refresh';
  const next=[];const keys=new Set();
  for(const raw of candidates.slice(0,5000)){const entityKind=s(raw?.entityKind||'token'),entityId=s(raw?.entityId||raw?.mint||raw?.address);const key=`${entityKind}:${entityId}`;if(!entityId||keys.has(key))continue;keys.add(key);next.push({entityKind,entityId,rank:raw?.rank==null?null:Math.max(1,Math.trunc(n(raw.rank))),qualifyingCycles:Math.max(1,Math.trunc(n(raw?.qualifyingCycles)||1)),metadata:raw?.metadata&&typeof raw.metadata==='object'?raw.metadata:{}});}
  const prior=await universeMembers(env,id,{activeOnly:true,limit:5000}),priorMap=new Map(prior.map(x=>[`${x.entityKind}:${x.entityId}`,x])),nextMap=new Map(next.map(x=>[`${x.entityKind}:${x.entityId}`,x]));
  const entered=next.filter(x=>!priorMap.has(`${x.entityKind}:${x.entityId}`)),exited=prior.filter(x=>!nextMap.has(`${x.entityKind}:${x.entityId}`)),retained=next.filter(x=>priorMap.has(`${x.entityKind}:${x.entityId}`));
  for(const item of next){const old=priorMap.get(`${item.entityKind}:${item.entityId}`);await db.prepare(`INSERT INTO intelligence_universe_membership(universe_id,entity_kind,entity_id,rank,active,qualifying_cycles,first_entered_at,last_entered_at,last_seen_at,last_exited_at,entry_count,source_snapshot_id,metadata_json) VALUES(?,?,?,?,1,?,?,?,?,NULL,1,?,?) ON CONFLICT(universe_id,entity_kind,entity_id) DO UPDATE SET rank=excluded.rank,active=1,qualifying_cycles=excluded.qualifying_cycles,last_entered_at=CASE WHEN intelligence_universe_membership.active=0 THEN excluded.last_entered_at ELSE intelligence_universe_membership.last_entered_at END,last_seen_at=excluded.last_seen_at,last_exited_at=NULL,entry_count=CASE WHEN intelligence_universe_membership.active=0 THEN intelligence_universe_membership.entry_count+1 ELSE intelligence_universe_membership.entry_count END,source_snapshot_id=excluded.source_snapshot_id,metadata_json=excluded.metadata_json`).bind(id,item.entityKind,item.entityId,item.rank,item.qualifyingCycles,old?.firstEnteredAt||now,old?.active?(old.lastEnteredAt||now):now,now,snapshotId,JSON.stringify(item.metadata)).run();}
  for(const item of exited)await db.prepare(`UPDATE intelligence_universe_membership SET active=0,last_exited_at=?,last_seen_at=?,source_snapshot_id=? WHERE universe_id=? AND entity_kind=? AND entity_id=? AND active=1`).bind(now,now,snapshotId,id,item.entityKind,item.entityId).run();
  const log=async(item,eventKind)=>db.prepare(`INSERT INTO intelligence_universe_membership_events(universe_id,entity_kind,entity_id,event_kind,rank,observed_at,source_snapshot_id,reason,metadata_json) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id,item.entityKind,item.entityId,eventKind,item.rank??null,now,snapshotId,reason,JSON.stringify(item.metadata||{})).run();
  for(const item of entered)await log(item,'entered');for(const item of exited)await log(item,'exited');for(const item of retained){const old=priorMap.get(`${item.entityKind}:${item.entityId}`);if((old?.rank??null)!==(item.rank??null))await log(item,'rank-changed');}
  await db.prepare('UPDATE intelligence_universes SET updated_at=? WHERE universe_id=?').bind(now,id).run();
  return{universeId:id,snapshotId,active:next.length,entered,exited,retained:retained.length};
}

function walletFrom(row,e){for(const value of[e.wallet,e.owner,e.trader,e.feePayer,e.payer])if(ADDRESS_RE.test(s(value)))return s(value);if(s(row.entity_kind)==='wallet'&&ADDRESS_RE.test(s(row.entity_id)))return s(row.entity_id);for(const rel of(Array.isArray(e.relations)?e.relations:[]))for(const value of[rel?.sourceId,rel?.targetId])if(ADDRESS_RE.test(s(value)))return s(value);return'';}
function action(row,e){const text=`${s(row.category)} ${s(e.action)} ${s(e.type)} ${s(e.side)}`.toLowerCase();return text.includes('buy')?'buy':text.includes('sell')?'sell':text.includes('transfer')?'transfer':'other';}
function tokenIds(e){return uniq((Array.isArray(e.tokens)?e.tokens:[]).map(x=>s(x?.mint||x?.id||x)).filter(x=>ADDRESS_RE.test(x)));}
function roundish(value){const x=Math.abs(n(value));if(!x)return false;return[1,10,100,1000,1e6].some(scale=>Math.abs(x/scale-Math.round(x/scale))<1e-9);}

export function deriveWalletBehaviorFeatures(rows=[],scope={}){
  const groups=new Map();
  for(const row of rows){const e=parse(row.evidence_json??row.evidence),wallet=walletFrom(row,e);if(!wallet)continue;if(!groups.has(wallet))groups.set(wallet,[]);groups.get(wallet).push({time:n(row.observed_at??row.observedAt),kind:action(row,e),tokens:tokenIds(e),size:Math.abs(n(e.amountSol??e.amount??e.value??row.magnitude_band??row.magnitudeBand))});}
  const out=[];
  for(const[wallet,events]of groups){events.sort((a,b)=>a.time-b.time);const times=events.map(x=>x.time).filter(Boolean),spacings=times.slice(1).map((t,i)=>t-times[i]).filter(x=>x>0),sizes=events.map(x=>x.size).filter(x=>x>0),m=mean(spacings),cv=m>0?std(spacings)/m:null,buckets=new Map();for(const value of sizes){const key=Number(value.toPrecision(3));buckets.set(key,(buckets.get(key)||0)+1);}const hours=new Map();for(const t of times){const h=new Date(t*1000).getUTCHours();hours.set(h,(hours.get(h)||0)+1);}const allTokens=uniq(events.flatMap(x=>x.tokens));out.push({universeId:s(scope.universeId)||'solana',wallet,windowStart:n(scope.windowStart),windowEnd:n(scope.windowEnd),transactionCount:events.length,tokenCount:allTokens.length,buyCount:events.filter(x=>x.kind==='buy').length,sellCount:events.filter(x=>x.kind==='sell').length,transferCount:events.filter(x=>x.kind==='transfer').length,activeMinutes:uniq(times.map(t=>Math.floor(t/60))).length,medianSpacingSeconds:median(spacings),spacingCv:cv,repeatedSizeRatio:sizes.length?clamp(Math.max(0,...buckets.values())/sizes.length):0,roundSizeRatio:sizes.length?clamp(sizes.filter(roundish).length/sizes.length):0,burstRatio:spacings.length?clamp(spacings.filter(x=>x<=15).length/spacings.length):0,timeOfDayConcentration:times.length?clamp(Math.max(0,...hours.values())/times.length):0,crossTokenBreadth:allTokens.length,evidenceCount:events.length});}
  return out;
}

export function hypothesesForFeatures(f={}){
  const sample=n(f.transactionCount),out=[];if(sample<8)return out;const push=(kind,confidence,statement,evidence,falsifiers)=>out.push({kind,confidence:clamp(confidence),statement,evidence,falsifiers});
  if(f.spacingCv!=null&&f.spacingCv<0.35&&sample>=12)push('timing-regularity',0.45+(0.35-f.spacingCv),'Observed timing is unusually regular in this window; this is consistent with scheduled or rule-based execution, but does not establish automation.',{spacingCv:f.spacingCv,medianSpacingSeconds:f.medianSpacingSeconds,sample},['Regular manual routine','Aggregator batching','Insufficient multi-window history']);
  if(f.repeatedSizeRatio>=0.45&&sample>=10)push('repeated-sizing',0.35+f.repeatedSizeRatio*0.45,'Repeated transaction sizing appears in the observed sample; fixed-size execution logic is one possible explanation.',{repeatedSizeRatio:f.repeatedSizeRatio,roundSizeRatio:f.roundSizeRatio,sample},['UI preset amounts','Routing constraints','Denomination effects']);
  if(f.burstRatio>=0.5&&sample>=12)push('burst-execution',0.3+f.burstRatio*0.45,'Transactions cluster into short bursts; event-triggered execution is one possible explanation.',{burstRatio:f.burstRatio,medianSpacingSeconds:f.medianSpacingSeconds,sample},['Manual reaction to events','Network batching','Single-session bias']);
  if(f.timeOfDayConcentration>=0.5&&sample>=16)push('time-window-concentration',0.25+f.timeOfDayConcentration*0.4,'Activity is concentrated into a narrow UTC-hour band; this is compatible with time-gated execution or a recurring human schedule.',{timeOfDayConcentration:f.timeOfDayConcentration,sample},['Human timezone routine','Market-session effects','Short window']);
  if(f.tokenCount>=3&&sample>=15&&f.repeatedSizeRatio>=0.3)push('cross-token-template',0.35+Math.min(0.35,f.tokenCount/20),'Similar sizing behavior appears across several tokens in this universe; a reusable strategy template is one possible explanation.',{tokenCount:f.tokenCount,repeatedSizeRatio:f.repeatedSizeRatio,sample},['Manual portfolio rules','Common UI presets','Shared routing behavior']);
  return out;
}

export async function analyzeUniversePatterns(env={},universeId='solana',{windowSeconds=86400,now=Math.floor(Date.now()/1000),limit=15000}={}){
  const db=intelligenceDb(env);if(!db)throw new Error('Intelligence database binding is unavailable.');const id=s(universeId)||'solana',window=Math.max(300,Math.min(30*86400,Math.trunc(n(windowSeconds)||86400))),from=now-window,cap=Math.max(100,Math.min(20000,Math.trunc(n(limit)||15000)));
  const r=id==='solana'?await db.prepare(`SELECT event_id,entity_kind,entity_id,category,observed_at,magnitude_band,evidence_json FROM intelligence_live_observations WHERE observed_at BETWEEN ? AND ? ORDER BY observed_at DESC LIMIT ?`).bind(from,now,cap).all():await db.prepare(`SELECT o.event_id,o.entity_kind,o.entity_id,o.category,o.observed_at,o.magnitude_band,o.evidence_json FROM intelligence_live_observations o JOIN intelligence_universe_observation_links l ON l.event_id=o.event_id AND l.universe_id=? WHERE o.observed_at BETWEEN ? AND ? ORDER BY o.observed_at DESC LIMIT ?`).bind(id,from,now,cap).all();
  const rows=r?.results||[],features=deriveWalletBehaviorFeatures(rows,{universeId:id,windowStart:from,windowEnd:now}),hypotheses=[];for(const f of features)for(const h of hypothesesForFeatures(f))hypotheses.push({universeId:id,subjectKind:'wallet',subjectId:f.wallet,sampleSize:f.transactionCount,...h});hypotheses.sort((a,b)=>b.confidence-a.confidence||b.sampleSize-a.sampleSize);
  return{universeId:id,windowStart:from,windowEnd:now,observationsAnalyzed:rows.length,walletsAnalyzed:features.length,methodology:'Descriptive pattern mining from bounded public-chain observations. Hypotheses are not proof of bots, ownership, intent, coordination, causation, or future performance.',features:features.sort((a,b)=>b.transactionCount-a.transactionCount).slice(0,250),hypotheses:hypotheses.slice(0,250)};
}
