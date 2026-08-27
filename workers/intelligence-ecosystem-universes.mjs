import { intelligenceDb } from './intelligence-indexer.mjs';

const ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s = value => String(value ?? '').trim();
const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const clamp01 = value => Math.max(0, Math.min(1, n(value)));
const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b)=>a-b);
  const mid = Math.floor(sorted.length/2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
};
const mean = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
const std = values => {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum,value)=>sum+(value-m)**2,0)/values.length);
};
const parse = value => {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(String(value || '{}')); } catch { return {}; }
};
const uniq = values => [...new Set(values.filter(Boolean))];

export async function listUniverses(env = {}) {
  const db = intelligenceDb(env);
  if (!db) return [];
  const result = await db.prepare(`
    SELECT u.universe_id,u.label,u.ecosystem_kind,u.source,u.description,u.active,
           u.selector_version,u.refresh_seconds,u.updated_at,
           COALESCE(m.member_count,0) AS active_member_count
    FROM intelligence_universes u
    LEFT JOIN (
      SELECT universe_id,COUNT(*) AS member_count
      FROM intelligence_universe_membership
      WHERE active=1
      GROUP BY universe_id
    ) m ON m.universe_id=u.universe_id
    WHERE u.active=1
    ORDER BY CASE u.universe_id WHEN 'z500-top10' THEN 0 WHEN 'solana' THEN 1 ELSE 2 END,u.label
  `).all();
  return (result?.results || []).map(row => ({
    universeId:s(row.universe_id),label:s(row.label),ecosystemKind:s(row.ecosystem_kind),
    source:s(row.source),description:s(row.description),selectorVersion:s(row.selector_version),
    refreshSeconds:n(row.refresh_seconds),activeMemberCount:n(row.active_member_count),updatedAt:n(row.updated_at)
  }));
}

export async function universeMembers(env = {}, universeId = '', { activeOnly = true, limit = 1000 } = {}) {
  const db = intelligenceDb(env);
  if (!db) return [];
  const cap = Math.max(1,Math.min(5000,Math.trunc(n(limit)||1000)));
  const result = activeOnly
    ? await db.prepare(`SELECT * FROM intelligence_universe_membership WHERE universe_id=? AND active=1 ORDER BY rank IS NULL,rank,last_seen_at DESC LIMIT ?`).bind(s(universeId),cap).all()
    : await db.prepare(`SELECT * FROM intelligence_universe_membership WHERE universe_id=? ORDER BY active DESC,rank IS NULL,rank,last_seen_at DESC LIMIT ?`).bind(s(universeId),cap).all();
  return (result?.results || []).map(row => ({
    universeId:s(row.universe_id),entityKind:s(row.entity_kind),entityId:s(row.entity_id),
    rank:row.rank==null?null:n(row.rank),active:n(row.active)===1,qualifyingCycles:n(row.qualifying_cycles),
    firstEnteredAt:n(row.first_entered_at),lastEnteredAt:n(row.last_entered_at),lastSeenAt:n(row.last_seen_at),
    lastExitedAt:row.last_exited_at==null?null:n(row.last_exited_at),entryCount:n(row.entry_count),
    sourceSnapshotId:s(row.source_snapshot_id)||null,metadata:parse(row.metadata_json)
  }));
}

export async function syncUniverseMembership(env = {}, universeId = '', candidates = [], options = {}) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('Intelligence database binding is unavailable.');
  const id = s(universeId);
  if (!id) throw new TypeError('universe id is required');
  const now = Math.max(0,Math.trunc(n(options.now)||Date.now()/1000));
  const snapshotId = s(options.snapshotId) || `${id}:${now}`;
  const reason = s(options.reason) || 'selector-refresh';
  const normalized = [];
  const seen = new Set();
  for (const raw of candidates.slice(0,5000)) {
    const entityKind = s(raw?.entityKind || 'token');
    const entityId = s(raw?.entityId || raw?.mint || raw?.address);
    if (!entityId || seen.has(`${entityKind}:${entityId}`)) continue;
    seen.add(`${entityKind}:${entityId}`);
    normalized.push({
      entityKind,entityId,rank:raw?.rank==null?null:Math.max(1,Math.trunc(n(raw.rank))),
      qualifyingCycles:Math.max(1,Math.trunc(n(raw?.qualifyingCycles)||1)),metadata:raw?.metadata&&typeof raw.metadata==='object'?raw.metadata:{}
    });
  }
  const prior = await universeMembers(env,id,{activeOnly:true,limit:5000});
  const priorMap = new Map(prior.map(item=>[`${item.entityKind}:${item.entityId}`,item]));
  const nextMap = new Map(normalized.map(item=>[`${item.entityKind}:${item.entityId}`,item]));
  const entered = normalized.filter(item=>!priorMap.has(`${item.entityKind}:${item.entityId}`));
  const exited = prior.filter(item=>!nextMap.has(`${item.entityKind}:${item.entityId}`));
  const retained = normalized.filter(item=>priorMap.has(`${item.entityKind}:${item.entityId}`));

  for (const item of normalized) {
    const key = `${item.entityKind}:${item.entityId}`;
    const old = priorMap.get(key);
    await db.prepare(`
      INSERT INTO intelligence_universe_membership
        (universe_id,entity_kind,entity_id,rank,active,qualifying_cycles,first_entered_at,last_entered_at,last_seen_at,last_exited_at,entry_count,source_snapshot_id,metadata_json)
      VALUES (?,?,?,?,1,?,?,?,?,NULL,1,?,?)
      ON CONFLICT(universe_id,entity_kind,entity_id) DO UPDATE SET
        rank=excluded.rank,active=1,qualifying_cycles=excluded.qualifying_cycles,
        last_entered_at=CASE WHEN intelligence_universe_membership.active=0 THEN excluded.last_entered_at ELSE intelligence_universe_membership.last_entered_at END,
        last_seen_at=excluded.last_seen_at,last_exited_at=NULL,
        entry_count=CASE WHEN intelligence_universe_membership.active=0 THEN intelligence_universe_membership.entry_count+1 ELSE intelligence_universe_membership.entry_count END,
        source_snapshot_id=excluded.source_snapshot_id,metadata_json=excluded.metadata_json
    `).bind(id,item.entityKind,item.entityId,item.rank,item.qualifyingCycles,
      old?.firstEnteredAt||now,old?.active?old.lastEnteredAt||now:now,now,snapshotId,JSON.stringify(item.metadata)).run();
  }

  for (const item of exited) {
    await db.prepare(`UPDATE intelligence_universe_membership SET active=0,last_exited_at=?,last_seen_at=?,source_snapshot_id=? WHERE universe_id=? AND entity_kind=? AND entity_id=? AND active=1`)
      .bind(now,now,snapshotId,id,item.entityKind,item.entityId).run();
  }

  const event = async (item,eventKind) => db.prepare(`
    INSERT INTO intelligence_universe_membership_events
      (universe_id,entity_kind,entity_id,event_kind,rank,observed_at,source_snapshot_id,reason,metadata_json)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).bind(id,item.entityKind,item.entityId,eventKind,item.rank??null,now,snapshotId,reason,JSON.stringify(item.metadata||{})).run();
  for (const item of entered) await event(item,'entered');
  for (const item of exited) await event(item,'exited');
  for (const item of retained) {
    const old = priorMap.get(`${item.entityKind}:${item.entityId}`);
    if ((old?.rank??null)!==(item.rank??null)) await event(item,'rank-changed');
  }
  await db.prepare('UPDATE intelligence_universes SET updated_at=? WHERE universe_id=?').bind(now,id).run();
  return { universeId:id,snapshotId,active:normalized.length,entered,exited,retained:retained.length };
}

export async function linkObservationToUniverses(env = {}, observation = {}) {
  const db = intelligenceDb(env);
  if (!db) return 0;
  const eventId=s(observation.eventId||observation.event_id),entityKind=s(observation.entityKind||observation.entity_kind),entityId=s(observation.entityId||observation.entity_id);
  const observedAt=Math.max(0,Math.trunc(n(observation.observedAt||observation.observed_at)));
  if(!eventId||!entityId)return 0;
  const evidence=parse(observation.evidence||observation.evidence_json);
  const ids=uniq([
    entityId,
    ...((Array.isArray(evidence.tokens)?evidence.tokens:[]).map(item=>s(item?.mint||item?.id||item))),
    ...((Array.isArray(evidence.relations)?evidence.relations:[]).flatMap(item=>[s(item?.sourceId),s(item?.targetId)]))
  ]);
  if(!ids.length)return 0;
  const marks=ids.map(()=>'?').join(',');
  const result=await db.prepare(`SELECT DISTINCT universe_id FROM intelligence_universe_membership WHERE active=1 AND entity_id IN (${marks})`).bind(...ids).all();
  const universes=uniq((result?.results||[]).map(row=>s(row.universe_id)));
  if(!universes.includes('solana'))universes.push('solana');
  let written=0;
  for(const universeId of universes){
    await db.prepare(`INSERT OR IGNORE INTO intelligence_universe_observation_links(universe_id,event_id,entity_kind,entity_id,observed_at) VALUES(?,?,?,?,?)`)
      .bind(universeId,eventId,entityKind||'transaction',entityId,observedAt).run();
    written++;
  }
  return written;
}

function extractWallet(row,evidence){
  const direct=[evidence.wallet,evidence.owner,evidence.trader,evidence.feePayer,evidence.payer].map(s).find(value=>ADDRESS_RE.test(value));
  if(direct)return direct;
  if(s(row.entity_kind)==='wallet'&&ADDRESS_RE.test(s(row.entity_id)))return s(row.entity_id);
  const relations=Array.isArray(evidence.relations)?evidence.relations:[];
  for(const relation of relations){for(const value of [relation?.sourceId,relation?.targetId]){if(ADDRESS_RE.test(s(value)))return s(value);}}
  return '';
}
function extractTokenIds(evidence){
  const tokens=Array.isArray(evidence.tokens)?evidence.tokens:[];
  return uniq(tokens.map(item=>s(item?.mint||item?.id||item)).filter(ADDRESS_RE.test.bind(ADDRESS_RE)));
}
function actionFor(row,evidence){
  const text=`${s(row.category)} ${s(evidence.action)} ${s(evidence.type)} ${s(evidence.side)}`.toLowerCase();
  if(text.includes('buy'))return'buy';if(text.includes('sell'))return'sell';if(text.includes('transfer'))return'transfer';return'other';
}
function roundish(value){
  const x=Math.abs(n(value));if(!x)return false;
  const scaled=[1,10,100,1000,1e6].some(scale=>Math.abs(x/scale-Math.round(x/scale))<1e-9);
  return scaled;
}

export function deriveWalletBehaviorFeatures(rows = [], { universeId='solana', windowStart=0, windowEnd=0 } = {}) {
  const byWallet=new Map();
  for(const row of rows){
    const evidence=parse(row.evidence_json??row.evidence);
    const wallet=extractWallet(row,evidence);if(!wallet)continue;
    if(!byWallet.has(wallet))byWallet.set(wallet,[]);
    byWallet.get(wallet).push({row,evidence,time:n(row.observed_at??row.observedAt),action:actionFor(row,evidence),tokens:extractTokenIds(evidence),size:n(evidence.amountSol??evidence.amount??evidence.value??row.magnitude_band??row.magnitudeBand)});
  }
  const features=[];
  for(const [wallet,events] of byWallet){
    events.sort((a,b)=>a.time-b.time);
    const times=events.map(event=>event.time).filter(Boolean),spacings=times.slice(1).map((time,index)=>Math.max(0,time-times[index])).filter(value=>value>0);
    const med=median(spacings),spacingMean=mean(spacings),cv=spacingMean>0?std(spacings)/spacingMean:null;
    const sizes=events.map(event=>Math.abs(event.size)).filter(value=>value>0);
    const rounded=sizes.filter(roundish).length;
    const sizeBuckets=new Map();for(const value of sizes){const key=value?Number(value.toPrecision(3)):0;sizeBuckets.set(key,(sizeBuckets.get(key)||0)+1);}
    const repeated=sizes.length?Math.max(0,...sizeBuckets.values())/sizes.length:0;
    const burst=spacings.length?spacings.filter(value=>value<=15).length/spacings.length:0;
    const hours=times.map(time=>new Date(time*1000).getUTCHours()),hourCounts=new Map();for(const hour of hours)hourCounts.set(hour,(hourCounts.get(hour)||0)+1);
    const tod=hours.length?Math.max(0,...hourCounts.values())/hours.length:0;
    const tokenSets=events.map(event=>new Set(event.tokens)),allTokens=uniq(events.flatMap(event=>event.tokens));
    const reused=allTokens.length>1?allTokens.filter(token=>tokenSets.filter(set=>set.has(token)).length>1).length/allTokens.length:0;
    const activeMinutes=uniq(times.map(time=>Math.floor(time/60))).length;
    features.push({
      universeId,wallet,windowStart,windowEnd,transactionCount:events.length,tokenCount:allTokens.length,
      buyCount:events.filter(event=>event.action==='buy').length,sellCount:events.filter(event=>event.action==='sell').length,
      transferCount:events.filter(event=>event.action==='transfer').length,activeMinutes,medianSpacingSeconds:med,spacingCv:cv,
      repeatedSizeRatio:clamp01(repeated),roundSizeRatio:sizes.length?clamp01(rounded/sizes.length):0,burstRatio:clamp01(burst),
      timeOfDayConcentration:clamp01(tod),crossTokenReuseRatio:clamp01(reused),evidenceCount:events.length
    });
  }
  return features;
}

export function hypothesesForFeatures(feature = {}) {
  const hypotheses=[];
  const sample=n(feature.transactionCount);
  if(sample<8)return hypotheses;
  const push=(kind,confidence,statement,evidence,falsifiers=[])=>hypotheses.push({kind,confidence:clamp01(confidence),statement,evidence,falsifiers});
  if(feature.spacingCv!=null&&feature.spacingCv<0.35&&sample>=12)push('timing-regularity',0.45+(0.35-feature.spacingCv),
    'Observed trade timing is unusually regular in this window; this is consistent with scheduled or rule-based execution, but does not establish automation.',
    {medianSpacingSeconds:feature.medianSpacingSeconds,spacingCv:feature.spacingCv,sample},['Regular manual routines','Exchange or aggregator batching','Too little history across multiple windows']);
  if(feature.repeatedSizeRatio>=0.45&&sample>=10)push('repeated-sizing',0.35+feature.repeatedSizeRatio*0.45,
    'A repeated transaction-size pattern appears in the observed sample; one possible explanation is fixed-size execution logic.',
    {repeatedSizeRatio:feature.repeatedSizeRatio,roundSizeRatio:feature.roundSizeRatio,sample},['UI preset amounts','Shared routing constraints','Coin denomination effects']);
  if(feature.burstRatio>=0.5&&sample>=12)push('burst-execution',0.3+feature.burstRatio*0.45,
    'Transactions cluster into short bursts more often than this sample would suggest from evenly spaced activity; this may reflect event-triggered execution.',
    {burstRatio:feature.burstRatio,medianSpacingSeconds:feature.medianSpacingSeconds,sample},['Manual reaction to news','Network batching','Single-session sampling bias']);
  if(feature.timeOfDayConcentration>=0.5&&sample>=16)push('time-window-concentration',0.25+feature.timeOfDayConcentration*0.4,
    'Activity is concentrated into a narrow recurring UTC-hour band in the observed window; this is compatible with time-gated execution or a human schedule.',
    {timeOfDayConcentration:feature.timeOfDayConcentration,sample},['Human timezone routine','Market-session effects','Short observation window']);
  if(feature.crossTokenReuseRatio>=0.45&&feature.tokenCount>=3&&sample>=15)push('cross-token-template',0.3+feature.crossTokenReuseRatio*0.4,
    'Similar participation recurs across multiple tokens in this universe; this is consistent with a reusable trading template rather than a single-token strategy.',
    {crossTokenReuseRatio:feature.crossTokenReuseRatio,tokenCount:feature.tokenCount,sample},['Broad manual portfolio strategy','Aggregator routing','Airdrop or distribution activity']);
  return hypotheses;
}

export async function analyzeUniversePatterns(env = {}, universeId = 'solana', { windowSeconds=86400, now=Math.floor(Date.now()/1000), limit=15000 } = {}) {
  const db=intelligenceDb(env);if(!db)throw new Error('Intelligence database binding is unavailable.');
  const id=s(universeId)||'solana',window=Math.max(300,Math.min(30*86400,Math.trunc(n(windowSeconds)||86400))),from=now-window,cap=Math.max(100,Math.min(20000,Math.trunc(n(limit)||15000));
  const result=id==='solana'
    ? await db.prepare(`SELECT event_id,entity_kind,entity_id,category,observed_at,magnitude_band,evidence_json FROM intelligence_live_observations WHERE observed_at BETWEEN ? AND ? ORDER BY observed_at DESC LIMIT ?`).bind(from,now,cap).all()
    : await db.prepare(`SELECT o.event_id,o.entity_kind,o.entity_id,o.category,o.observed_at,o.magnitude_band,o.evidence_json FROM intelligence_live_observations o JOIN intelligence_universe_observation_links l ON l.event_id=o.event_id AND l.universe_id=? WHERE o.observed_at BETWEEN ? AND ? ORDER BY o.observed_at DESC LIMIT ?`).bind(id,from,now,cap).all();
  const rows=result?.results||[],features=deriveWalletBehaviorFeatures(rows,{universeId:id,windowStart:from,windowEnd:now});
  const candidates=[];
  for(const feature of features){
    for(const hypothesis of hypothesesForFeatures(feature)){
      candidates.push({universeId:id,subjectKind:'wallet',subjectId:feature.wallet,...hypothesis,sampleSize:feature.transactionCount});
    }
  }
  candidates.sort((a,b)=>b.confidence-a.confidence||b.sampleSize-a.sampleSize);
  return {
    universeId:id,windowStart:from,windowEnd:now,observationsAnalyzed:rows.length,walletsAnalyzed:features.length,
    methodology:'descriptive behavioral pattern mining from bounded public-chain observations; hypotheses are not proof of bots, ownership, intent, coordination, or future performance',
    features:features.sort((a,b)=>b.transactionCount-a.transactionCount).slice(0,250),hypotheses:candidates.slice(0,250)
  };
}
