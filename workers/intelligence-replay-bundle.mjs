/* Playable Data Engine — evidence-backed replay bundles from the Intelligence Store.
 * Read-only. Chain identity is resolved before retrieval so EVM subjects can never
 * fall through the Solana history scheduler. No price path or transaction is invented.
 */

import { intelligenceDb } from './intelligence-indexer.mjs';
import { coverageForWallet, recordDemand } from './intelligence-mesh-runtime.mjs';
import { queueHistoryJob, runIntelligenceMeshScheduler } from './intelligence-mesh-scheduler.mjs';
import { hydrateReplayMarketCandles, replayMarketHydrationState } from './intelligence-replay-market-hydration.mjs';
import { canonicalChainAddress,chainQualifiedId,normalizeChainKey,resolveChain } from './intelligence-chain-registry.mjs';

const SOLANA_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_RE=/^0x[a-fA-F0-9]{40}$/;
const MAX_WINDOW_SECONDS=60*60*24*365*15;
const REPLAY_PRE_ROLL_SECONDS=7*24*60*60;
const TARGET_REPLAY_CANDLES=240;
const REPLAY_BUCKETS=Object.freeze([60,300,900,3600,14400,43200,86400]);
const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const nullable=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,n(v)));
const uniq=values=>[...new Set(values.filter(Boolean))].sort();
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

function enabled(env={}){return String(env.PLAYABLE_DATA_ENABLED||'').trim().toLowerCase()==='true';}
async function all(stmt){try{const result=await stmt.all();return result?.results||[];}catch{return[];}}
async function first(stmt){try{return await stmt.first();}catch{return null;}}
function parseList(value){return s(value).split(',').map(item=>item.trim()).filter(Boolean);}
function verificationState(row={}){const commitments=new Set(parseList(row.commitments).map(value=>value.toLowerCase()));if(n(row.verified)>0)return'verified';if(commitments.has('finalized'))return'finalized';if(commitments.has('confirmed'))return'confirmed';return parseList(row.provenance_sources).length||s(row.source)?'observed':'unknown';}

function directExecution(routeRows=[],mint='',quoteMint=''){
  let best=null;
  for(const row of routeRows){const inputMint=s(row.input_mint),outputMint=s(row.output_mint),input=Math.abs(n(row.input_amount)),output=Math.abs(n(row.output_amount));if(!(input>0&&output>0))continue;let candidate=null;if(inputMint===quoteMint&&outputMint===mint)candidate={side:'buy',price:input/output,baseAmount:output,quoteAmount:input};else if(inputMint===mint&&outputMint===quoteMint)candidate={side:'sell',price:output/input,baseAmount:input,quoteAmount:output};if(!candidate||!(candidate.price>0))continue;candidate={...candidate,confidence:clamp(row.confidence,0,1),venue:s(row.venue),pool:s(row.pool),source:s(row.source)};if(!best||candidate.confidence>best.confidence)best=candidate;}
  return best;
}

function normalizedReplayEvent(row,execution){
  const blockTime=Math.max(0,Math.trunc(n(row.block_time))),swapLike=s(row.event_class)==='swap-like',fallbackSide=swapLike?(n(row.token_delta)>0?'buy':n(row.token_delta)<0?'sell':null):null,sources=uniq([s(row.source),...parseList(row.provenance_sources),execution?.source]);
  return Object.freeze({id:s(row.signature)||`${s(row.wallet)}-${blockTime}-${s(row.mint)}`,signature:s(row.signature)||null,wallet:s(row.wallet),token:s(row.mint)||null,timestamp:blockTime*1000,slot:n(row.slot)||null,kind:swapLike?'trade':s(row.event_class)||'event',side:execution?.side||fallbackSide,price:execution?.price??null,tokenDelta:n(row.token_delta),solDelta:n(row.sol_delta),feeLamports:Math.max(0,n(row.fee_lamports)),counterparty:s(row.counterparty)||null,programId:s(row.program_id)||null,confidence:clamp(Math.max(n(row.confidence),n(execution?.confidence)),0,1),verification:verificationState(row),sources,execution:execution?Object.freeze({baseAmount:execution.baseAmount,quoteAmount:execution.quoteAmount,venue:execution.venue||null,pool:execution.pool||null}):null});
}

function normalizedChainReplayEvent(row){
  let evidence={};try{evidence=JSON.parse(s(row.evidence_json)||'{}');}catch{}
  const blockTime=Math.max(0,Math.trunc(n(row.block_time))),sourceKind=s(row.source_kind)||'unknown';
  return Object.freeze({id:s(row.event_id)||`${s(row.chain_key)}:${s(row.wallet_address)}:${blockTime}`,signature:s(row.tx_id)||null,wallet:s(row.wallet_address)||null,token:s(row.asset_address)||null,timestamp:blockTime*1000,slot:nullable(row.block_height),kind:s(row.event_class)||'event',side:s(row.side)||null,price:nullable(row.price_usd),tokenDelta:nullable(row.amount),solDelta:null,feeLamports:null,counterparty:s(evidence?.to)||null,programId:null,confidence:clamp(row.confidence,0,1),verification:sourceKind==='observed-fact'?'observed':'provider-reported',sourceKind,sources:Object.freeze(uniq([s(row.source)])),evidence:Object.freeze(evidence)});
}

function normalizeCandle(row){return Object.freeze({timestamp:Math.max(0,Math.trunc(n(row.bucket_start)))*1000,bucketSeconds:Math.max(60,Math.trunc(n(row.bucket_seconds)||60)),open:n(row.open),high:n(row.high),low:n(row.low),close:n(row.close),volumeBase:n(row.volume_base),volumeQuote:n(row.volume_quote),swapCount:Math.max(0,Math.trunc(n(row.swap_count))),walletCount:Math.max(0,Math.trunc(n(row.wallet_count))),confidence:clamp(row.confidence,0,1),derivedFromBucketSeconds:nullable(row.derived_from_bucket_seconds),sources:(()=>{try{return JSON.parse(row.source_set_json||'[]')}catch{return[]}})()});}

export function aggregateReplayCandleRows(rows=[],targetBucketSeconds=60){
  const target=Math.max(60,Math.trunc(n(targetBucketSeconds)||60)),groups=new Map();
  for(const row of (Array.isArray(rows)?rows:[]).slice().sort((a,b)=>n(a.bucket_start)-n(b.bucket_start))){
    const start=Math.max(0,Math.trunc(n(row.bucket_start))),sourceBucket=Math.max(60,Math.trunc(n(row.bucket_seconds)||60)),open=nullable(row.open),high=nullable(row.high),low=nullable(row.low),close=nullable(row.close);if([open,high,low,close].some(value=>value==null))continue;
    const bucketStart=Math.floor(start/target)*target,key=String(bucketStart);let group=groups.get(key);let sources=[];try{sources=JSON.parse(row.source_set_json||'[]')}catch{}
    if(!group){group={bucket_start:bucketStart,bucket_seconds:target,open,high,low,close,volume_base:n(row.volume_base),volume_quote:n(row.volume_quote),swap_count:Math.max(0,Math.trunc(n(row.swap_count))),wallet_count:Math.max(0,Math.trunc(n(row.wallet_count))),confidence:clamp(row.confidence,0,1),derived_from_bucket_seconds:sourceBucket,sources:new Set(sources)};groups.set(key,group);continue;}
    group.high=Math.max(group.high,high);group.low=Math.min(group.low,low);group.close=close;group.volume_base+=n(row.volume_base);group.volume_quote+=n(row.volume_quote);group.swap_count+=Math.max(0,Math.trunc(n(row.swap_count)));group.wallet_count=Math.max(group.wallet_count,Math.max(0,Math.trunc(n(row.wallet_count))));group.confidence=Math.min(group.confidence,clamp(row.confidence,0,1));group.derived_from_bucket_seconds=Math.min(group.derived_from_bucket_seconds,sourceBucket);for(const source of sources)group.sources.add(source);
  }
  return [...groups.values()].sort((a,b)=>a.bucket_start-b.bucket_start).map(group=>({...group,source_set_json:JSON.stringify([...group.sources].filter(Boolean).sort()),sources:undefined}));
}

async function loadSolanaReplayCandleRows(db,mint,quoteMint,bucketSeconds,from,to){
  const exact=await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(mint,quoteMint,bucketSeconds,from,to));if(exact.length||bucketSeconds<=60)return exact;
  const available=await all(db.prepare(`SELECT DISTINCT bucket_seconds FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds<? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_seconds DESC LIMIT 20`).bind(mint,quoteMint,bucketSeconds,from,to)),sourceBucket=available.map(row=>Math.trunc(n(row.bucket_seconds))).find(value=>value>=60&&bucketSeconds%value===0);if(!sourceBucket)return[];
  const fine=await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(mint,quoteMint,sourceBucket,from,to));return aggregateReplayCandleRows(fine,bucketSeconds);
}

async function loadChainReplayCandleRows(db,chain,mint,quoteMint,bucketSeconds,from,to){
  const exact=await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles_v2 WHERE chain_key=? AND asset_address=? AND quote_asset_address=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(chain,mint,quoteMint,bucketSeconds,from,to));if(exact.length||bucketSeconds<=60)return exact;
  const available=await all(db.prepare(`SELECT DISTINCT bucket_seconds FROM intelligence_price_candles_v2 WHERE chain_key=? AND asset_address=? AND quote_asset_address=? AND bucket_seconds<? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_seconds DESC LIMIT 20`).bind(chain,mint,quoteMint,bucketSeconds,from,to)),sourceBucket=available.map(row=>Math.trunc(n(row.bucket_seconds))).find(value=>value>=60&&bucketSeconds%value===0);if(!sourceBucket)return[];
  const fine=await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles_v2 WHERE chain_key=? AND asset_address=? AND quote_asset_address=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(chain,mint,quoteMint,sourceBucket,from,to));return aggregateReplayCandleRows(fine,bucketSeconds);
}

export function adaptiveReplayBucketSeconds(from,to,requested=0){
  const span=Math.max(0,Math.trunc(n(to))-Math.trunc(n(from))),asked=Math.max(0,Math.trunc(n(requested))),requestedFloor=asked?(REPLAY_BUCKETS.find(value=>value>=asked)??86400):60;
  const eligible=REPLAY_BUCKETS.filter(value=>value>=requestedFloor);if(!span)return requestedFloor;
  return eligible.reduce((best,value)=>Math.abs(span/value-TARGET_REPLAY_CANDLES)<Math.abs(span/best-TARGET_REPLAY_CANDLES)?value:best,eligible[0]??86400);
}

async function inferChain(db,input,walletRaw,mintRaw){
  const explicit=s(input.chain??input.chainKey??input.network);if(explicit)return normalizeChainKey(explicit);
  if(SOLANA_RE.test(walletRaw)&&SOLANA_RE.test(mintRaw))return'solana';
  if(!EVM_RE.test(walletRaw)||!EVM_RE.test(mintRaw))throw new TypeError('invalid_chain_subject');
  const wallet=walletRaw.toLowerCase(),mint=mintRaw.toLowerCase(),candidates=new Map();
  const eventRows=await all(db.prepare(`SELECT chain_key,COUNT(*) hits FROM intelligence_chain_events_v2 WHERE wallet_address=? AND asset_address=? GROUP BY chain_key ORDER BY hits DESC LIMIT 8`).bind(wallet,mint));
  for(const row of eventRows)candidates.set(normalizeChainKey(row.chain_key),(candidates.get(normalizeChainKey(row.chain_key))||0)+Math.max(1,n(row.hits)));
  const positionRows=await all(db.prepare(`SELECT p.chain chain_key,COUNT(*) hits FROM fomo_trader_positions p JOIN fomo_traders t ON t.handle=p.handle WHERE t.evm_wallet=? AND p.token_address=? GROUP BY p.chain LIMIT 8`).bind(wallet,mint));
  for(const row of positionRows)candidates.set(normalizeChainKey(row.chain_key),(candidates.get(normalizeChainKey(row.chain_key))||0)+Math.max(1,n(row.hits)));
  const ranked=[...candidates.entries()].filter(([chain])=>chain&&chain!=='solana').sort((a,b)=>b[1]-a[1]);
  if(ranked.length===1||ranked.length>1&&ranked[0][1]>ranked[1][1])return ranked[0][0];
  throw new TypeError(ranked.length?'chain_required_for_ambiguous_evm_subject':'chain_required_for_evm_subject');
}

async function latestMatchedRoundAnchor(db,wallet,mint,to){
  const toMs=Math.trunc(n(to))*1000;
  const row=await first(db.prepare(`SELECT id,status,entry_ts,exit_ts FROM matched_trade_rounds WHERE wallet=? AND mint=? AND entry_ts IS NOT NULL AND entry_ts>0 AND entry_ts<=? AND status IN ('closed','open') ORDER BY CASE WHEN status='open' AND (exit_ts IS NULL OR exit_ts>=?) THEN 0 ELSE 1 END, COALESCE(exit_ts,entry_ts) DESC, entry_ts DESC LIMIT 1`).bind(wallet,mint,toMs,toMs));
  const from=Math.trunc(n(row?.entry_ts)/1000);if(!(from>0))return null;
  const exit=Math.trunc(n(row?.exit_ts)/1000);
  return Object.freeze({from,to:exit>=from?exit:null,source:'matched-round-observed',sourceKind:'observed',ref:s(row?.id)||null});
}

async function latestFomoTradeAnchor(db,chain,wallet,mint,to){
  const rows=chain==='solana'
    ?await all(db.prepare(`SELECT x.trade_id,x.chain,x.status,x.created_at,x.closed_at FROM fomo_trader_trades x JOIN fomo_traders t ON t.handle=x.handle WHERE t.solana_wallet=? AND x.token_address=? AND x.created_at IS NOT NULL AND x.created_at>0 AND x.created_at<=? ORDER BY x.created_at DESC LIMIT 50`).bind(wallet,mint,to))
    :await all(db.prepare(`SELECT x.trade_id,x.chain,x.status,x.created_at,x.closed_at FROM fomo_trader_trades x JOIN fomo_traders t ON t.handle=x.handle WHERE LOWER(t.evm_wallet)=? AND LOWER(x.token_address)=? AND x.created_at IS NOT NULL AND x.created_at>0 AND x.created_at<=? ORDER BY x.created_at DESC LIMIT 50`).bind(wallet.toLowerCase(),mint.toLowerCase(),to));
  const candidates=rows.filter(row=>normalizeChainKey(row.chain)===chain).map(row=>{const from=Math.trunc(n(row.created_at)),closed=Math.trunc(n(row.closed_at)),open=s(row.status).toLowerCase()==='open'||!(closed>0),endpoint=closed>0?closed:to,distance=Math.abs(to-endpoint);return{row,from,closed,open,distance};}).filter(item=>item.from>0);
  if(!candidates.length)return null;
  candidates.sort((a,b)=>Number(b.open)-Number(a.open)||a.distance-b.distance||b.from-a.from);
  const chosen=candidates[0];
  return Object.freeze({from:chosen.from,to:chosen.closed>=chosen.from?chosen.closed:null,source:'fomo-provider-reported-entry',sourceKind:'provider-reported',ref:s(chosen.row.trade_id)||null});
}

async function earliestIndexedReplayTime(db,chain,wallets,mint){
  let earliest=null;
  for(const wallet of wallets){
    const row=chain==='solana'
      ?await first(db.prepare(`SELECT MIN(block_time) first_time FROM bull_wallet_events WHERE wallet=? AND mint=?`).bind(wallet,mint))
      :await first(db.prepare(`SELECT MIN(block_time) first_time FROM intelligence_chain_events_v2 WHERE chain_key=? AND wallet_address=? AND asset_address=?`).bind(chain,wallet,mint));
    const value=Math.trunc(n(row?.first_time));if(value>0&&(earliest==null||value<earliest))earliest=value;
  }
  return earliest;
}

async function resolveReplayAnchor(db,chain,wallets,mint,to){
  for(const wallet of wallets){
    if(chain==='solana'){
      const round=await latestMatchedRoundAnchor(db,wallet,mint,to);if(round)return round;
    }
    const fomo=await latestFomoTradeAnchor(db,chain,wallet,mint,to);if(fomo)return fomo;
  }
  const indexed=await earliestIndexedReplayTime(db,chain,wallets,mint);
  return indexed?Object.freeze({from:indexed,to:null,source:'indexed-evidence',sourceKind:'observed',ref:null}):null;
}

async function resolveWindow(db,chain,wallets,mint,input){
  const now=Math.floor(Date.now()/1000),rawTo=input.to??input.endTime,rawFrom=input.from??input.startTime,requestedTo=Math.max(0,Math.trunc(n(rawTo??now))),explicitFrom=rawFrom!=null&&rawFrom!=='';
  if(explicitFrom){const requestedFrom=Math.max(0,Math.trunc(n(rawFrom))),low=Math.min(requestedFrom,requestedTo),high=Math.max(requestedFrom,requestedTo);if(high-low>MAX_WINDOW_SECONDS)throw new RangeError('replay_window_too_large');return Object.freeze({from:low,to:high,bucketSeconds:adaptiveReplayBucketSeconds(low,high,input.bucketSeconds),startResolved:true,startSource:'explicit',startSourceKind:'user-selected',startRef:null,entryTime:null,preRollSeconds:0});}
  const anchor=await resolveReplayAnchor(db,chain,wallets,mint,requestedTo);
  if(!anchor){return Object.freeze({from:requestedTo,to:requestedTo,bucketSeconds:60,startResolved:false,startSource:'unavailable',startSourceKind:'unavailable',startRef:null,entryTime:null,preRollSeconds:0});}
  const entry=Math.max(0,Math.trunc(n(anchor.from))),resolvedTo=rawTo!=null&&rawTo!==''?requestedTo:Math.max(entry,Math.trunc(n(anchor.to)||requestedTo)),contextFrom=Math.max(0,entry-REPLAY_PRE_ROLL_SECONDS),low=Math.min(contextFrom,resolvedTo),high=Math.max(contextFrom,resolvedTo);if(high-low>MAX_WINDOW_SECONDS)throw new RangeError('replay_window_too_large');
  return Object.freeze({from:low,to:high,bucketSeconds:adaptiveReplayBucketSeconds(low,high,input.bucketSeconds),startResolved:true,startSource:anchor.source,startSourceKind:anchor.sourceKind,startRef:anchor.ref,entryTime:entry*1000,preRollSeconds:Math.max(0,entry-low)});
}

async function buildSolanaReplayBundle(env,db,subject,window,input){
  const {wallets,mint,quoteMint}=subject,{from,to,bucketSeconds}=window,limit=Math.max(1,Math.min(1000,Math.trunc(n(input.limit)||500))),events=[],coverages=[],sourceSet=new Set();
  for(const wallet of wallets){
    const rows=await all(db.prepare(`SELECT e.signature,e.slot,e.block_time,e.wallet,e.counterparty,e.program_id,e.mint,e.event_class,e.sol_delta,e.token_delta,e.fee_lamports,e.source,e.confidence,MAX(COALESCE(p.verified,0)) verified,GROUP_CONCAT(DISTINCT p.source) provenance_sources,GROUP_CONCAT(DISTINCT p.commitment) commitments FROM bull_wallet_events e LEFT JOIN intelligence_event_provenance p ON p.signature=e.signature AND p.wallet=e.wallet WHERE e.wallet=? AND e.mint=? AND e.block_time BETWEEN ? AND ? GROUP BY e.signature,e.slot,e.block_time,e.wallet,e.counterparty,e.program_id,e.mint,e.event_class,e.sol_delta,e.token_delta,e.fee_lamports,e.source,e.confidence ORDER BY e.block_time ASC,e.slot ASC,e.signature ASC LIMIT ?`).bind(wallet,mint,from,to,limit));
    const signatures=rows.map(row=>s(row.signature)).filter(Boolean),routes=signatures.length?await all(db.prepare(`SELECT signature,wallet,hop_index,venue,pool,input_mint,output_mint,input_amount,output_amount,block_time,source,confidence FROM intelligence_trade_routes WHERE wallet=? AND block_time BETWEEN ? AND ? AND (input_mint=? OR output_mint=?) ORDER BY block_time ASC,signature ASC,hop_index ASC LIMIT ?`).bind(wallet,from,to,mint,mint,Math.min(4000,limit*4))):[],bySignature=new Map();
    for(const route of routes){const key=s(route.signature);if(!bySignature.has(key))bySignature.set(key,[]);bySignature.get(key).push(route);}for(const row of rows){const execution=quoteMint?directExecution(bySignature.get(s(row.signature))||[],mint,quoteMint):null,event=normalizedReplayEvent(row,execution);event.sources.forEach(source=>sourceSet.add(source));events.push(event);}coverages.push(await coverageForWallet(env,wallet));
  }
  events.sort((a,b)=>a.timestamp-b.timestamp||(a.slot||0)-(b.slot||0)||String(a.signature||'').localeCompare(String(b.signature||'')));
  const candleRows=window.startResolved&&quoteMint?await loadSolanaReplayCandleRows(db,mint,quoteMint,bucketSeconds,from,to):[],candles=candleRows.map(normalizeCandle);candles.flatMap(candle=>candle.sources||[]).forEach(source=>sourceSet.add(source));
  const verificationCounts={observed:0,confirmed:0,finalized:0,verified:0,unknown:0};for(const event of events)verificationCounts[event.verification]=(verificationCounts[event.verification]||0)+1;const complete=coverages.length>0&&coverages.every(item=>n(item?.complete_to_genesis)>0),coverageStatement=!window.startResolved?'Replay is locating the first retained entry for this wallet and token; no arbitrary lookback window is shown.':complete?'Indexed wallet histories report complete-to-genesis coverage; this Replay begins at the resolved trade entry and stays bounded to the selected token.':'Replay uses currently indexed Solana evidence while the Intelligence Mesh continues bounded history hydration.';
  return Object.freeze({schemaVersion:'replay-bundle-v2',generatedAt:Date.now(),subject:Object.freeze({kind:wallets.length===2?'wallet-comparison':'wallet-token',chain:'solana',assetId:chainQualifiedId('solana',mint),wallets:Object.freeze(wallets),mint,quoteMint:quoteMint||null}),window:Object.freeze({...window,startTime:from*1000,endTime:to*1000}),eventCount:events.length,events:Object.freeze(events),candles:Object.freeze(candles),coverage:Object.freeze({wallets:Object.freeze(coverages),complete,statement:coverageStatement}),verification:Object.freeze(verificationCounts),sources:Object.freeze([...sourceSet].sort()),caveats:Object.freeze(['Public-chain observations only; wallet relationships do not prove identity or common ownership.',window.startResolved?`Replay entry resolved from ${window.startSource}; retained market context begins up to seven days earlier when coverage exists.`:'Replay entry is unresolved; no synthetic lookback window was substituted.',quoteMint?'Execution price is shown only when indexed route evidence directly supports the selected base/quote pair.':'No quote mint was supplied, so execution prices are not inferred.',candles.length?'Candles are indexed market observations with their own confidence/source metadata.':'No indexed OHLC series is available for this selection yet; no price series was invented.','What-if overlays are historical counterfactuals, not predictions or claims of achievable execution.'])});
}

async function buildChainReplayBundle(db,subject,window,input){
  const {chain,wallets,mint,quoteMint}=subject,{from,to,bucketSeconds}=window,limit=Math.max(1,Math.min(1000,Math.trunc(n(input.limit)||500))),events=[],sourceSet=new Set();
  for(const wallet of wallets){const rows=await all(db.prepare(`SELECT event_id,chain_key,tx_id,wallet_address,asset_address,quote_asset_address,block_height,block_time,event_class,side,amount,price_usd,source,source_kind,confidence,evidence_json FROM intelligence_chain_events_v2 WHERE chain_key=? AND wallet_address=? AND asset_address=? AND block_time BETWEEN ? AND ? ORDER BY block_time ASC,COALESCE(block_height,0) ASC,event_id ASC LIMIT ?`).bind(chain,wallet,mint,from,to,limit));for(const row of rows){const event=normalizedChainReplayEvent(row);event.sources.forEach(source=>sourceSet.add(source));events.push(event);}}
  events.sort((a,b)=>a.timestamp-b.timestamp||(a.slot||0)-(b.slot||0)||String(a.id||'').localeCompare(String(b.id||'')));
  let effectiveQuote=quoteMint;if(window.startResolved&&!effectiveQuote){const pair=await first(db.prepare(`SELECT quote_asset_address,COUNT(*) count FROM intelligence_price_candles_v2 WHERE chain_key=? AND asset_address=? AND bucket_start BETWEEN ? AND ? GROUP BY quote_asset_address ORDER BY count DESC LIMIT 1`).bind(chain,mint,from,to));effectiveQuote=s(pair?.quote_asset_address)||null;}
  const candleRows=window.startResolved&&effectiveQuote?await loadChainReplayCandleRows(db,chain,mint,effectiveQuote,bucketSeconds,from,to):[],candles=candleRows.map(normalizeCandle);candles.flatMap(candle=>candle.sources||[]).forEach(source=>sourceSet.add(source));
  const observed=events.filter(event=>event.sourceKind==='observed-fact').length,providerReported=events.filter(event=>event.sourceKind==='provider-reported').length,verification={observed,confirmed:0,finalized:0,verified:observed,unknown:providerReported},statement=!window.startResolved?`The first retained ${chain} entry is not resolved yet; no arbitrary lookback was substituted.`:observed?`${observed} independently observed ${chain} transaction facts are retained in this Replay; provider-reported trade events stay separately labeled.`:providerReported?`${providerReported} provider-reported ${chain} trade events are retained. Independent transaction receipts are not yet attached to every event.`:`No retained ${chain} trade evidence is indexed for this wallet/asset window yet.`;
  return Object.freeze({schemaVersion:'replay-bundle-v2',generatedAt:Date.now(),subject:Object.freeze({kind:wallets.length===2?'wallet-comparison':'wallet-token',chain,assetId:chainQualifiedId(chain,mint),wallets:Object.freeze(wallets),mint,quoteMint:effectiveQuote}),window:Object.freeze({...window,startTime:from*1000,endTime:to*1000}),eventCount:events.length,events:Object.freeze(events),candles:Object.freeze(candles),coverage:Object.freeze({wallets:Object.freeze(wallets.map(wallet=>Object.freeze({wallet,chain,status:'chain-qualified-retained-evidence'}))),complete:false,statement}),verification:Object.freeze(verification),sources:Object.freeze([...sourceSet].sort()),caveats:Object.freeze(['Provider-reported Fomo activity and independently observed chain receipts remain different evidence classes.','EVM Replay never enters the Solana history scheduler.',window.startResolved?`Replay entry resolved from ${window.startSource}; retained market context begins up to seven days earlier when coverage exists.`:'Replay entry is unresolved; no synthetic lookback window was substituted.',candles.length?'Candles are source-labeled market observations for this chain-qualified asset.':'No exact indexed OHLC pair is currently retained for this asset/window; no chart path was invented.'])});
}

export async function buildReplayBundle(env={},input={}){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const rawWallets=uniq((Array.isArray(input.wallets)?input.wallets:[input.wallet,input.compareWallet]).map(s)).slice(0,2),mintRaw=s(input.mint||input.token);if(!rawWallets.length||!mintRaw)throw new TypeError('replay_subject_required');
  const chain=await inferChain(db,input,rawWallets[0],mintRaw),definition=resolveChain(chain,{address:mintRaw});if(!definition)throw new TypeError('unsupported_chain');
  const wallets=rawWallets.map(wallet=>canonicalChainAddress(chain,wallet));if(wallets.some(wallet=>!wallet))throw new TypeError('invalid_public_wallet');
  const mint=canonicalChainAddress(chain,mintRaw);if(!mint)throw new TypeError('invalid_token_mint');
  const rawQuote=s(input.quoteMint||input.quote_mint),canonicalQuote=rawQuote?canonicalChainAddress(chain,rawQuote):null,quoteMint=rawQuote&&!canonicalQuote&&chain!=='solana'&&SOLANA_RE.test(rawQuote)?null:canonicalQuote;if(rawQuote&&!quoteMint&&!(chain!=='solana'&&SOLANA_RE.test(rawQuote)))throw new TypeError('invalid_quote_mint');
  const window=await resolveWindow(db,chain,wallets,mint,input),subject={chain,wallets,mint,quoteMint};
  return chain==='solana'?buildSolanaReplayBundle(env,db,subject,window,input):buildChainReplayBundle(db,subject,window,input);
}

export async function handleReplayBundleRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/intelligence/replay-bundle')return null;if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);let input;try{input=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}const started=Date.now();
  try{
    const bundle=await buildReplayBundle(env,input||{}),chain=bundle.subject.chain||'solana',indexingJobs=[];
    if(chain==='solana'&&!bundle.coverage.complete){for(const wallet of bundle.subject.wallets){const job=await queueHistoryJob(env,wallet,{pageSize:25,requestedFrom:bundle.window.startResolved?bundle.window.from:null,requestedTo:bundle.window.to});indexingJobs.push(Object.freeze({wallet,...job}));}}
    const pendingJobs=indexingJobs.filter(job=>['queued','running','waiting-external'].includes(s(job.state))),windowComplete=bundle.coverage.complete||(indexingJobs.length>0&&pendingJobs.length===0&&indexingJobs.every(job=>s(job.state)==='complete'));
    const indexing=chain==='solana'?Object.freeze({requested:pendingJobs.length>0,state:bundle.coverage.complete?'not-required':pendingJobs.length?'queued-or-running':windowComplete?'window-ready':'not-required',windowComplete,jobs:Object.freeze(indexingJobs),disclosure:!bundle.window.startResolved&&pendingJobs.length?'Locating the first observed entry by extending Solana wallet history; no arbitrary 30-day window is being used.':pendingJobs.length?'Missing or partial Solana wallet coverage was queued automatically for this exact Replay window.':windowComplete&&!bundle.coverage.complete?'The selected Replay window has completed bounded Solana history hydration.':'No additional Solana wallet-history job was required for this request.'}):Object.freeze({requested:false,state:'chain-qualified',windowComplete:bundle.window.startResolved,jobs:Object.freeze([]),disclosure:`${chain} Replay reads only the ${chain} evidence spine and Fomo provider-reported trade timing when available. It is not routed through Solana RPC or the Solana history scheduler.`});
    const marketHydration=bundle.window.startResolved?await replayMarketHydrationState(env,{chain,mint:bundle.subject.mint,quoteMint:bundle.subject.quoteMint,from:bundle.window.from,to:bundle.window.to,bucketSeconds:bundle.window.bucketSeconds,candleCount:bundle.candles.length}):Object.freeze({provider:'none',needed:false,requested:false,pending:false,state:'waiting-entry',disclosure:'Market hydration waits until the actual trade entry is resolved; no arbitrary chart start is used.'}),responseBundle=Object.freeze({...bundle,indexing,marketHydration}),requestedJobIds=pendingJobs.map(job=>Math.trunc(n(job.jobId))).filter(id=>id>0);
    if(chain==='solana'&&requestedJobIds.length&&env.__EXECUTION_CTX?.waitUntil)env.__EXECUTION_CTX.waitUntil(runIntelligenceMeshScheduler(env,{limit:Math.min(2,requestedJobIds.length),jobIds:requestedJobIds}).catch(()=>null));
    if(bundle.window.startResolved&&marketHydration.requested&&env.__EXECUTION_CTX?.waitUntil)env.__EXECUTION_CTX.waitUntil(hydrateReplayMarketCandles(env,{chain,mint:bundle.subject.mint,quoteMint:bundle.subject.quoteMint,from:bundle.window.from,to:bundle.window.to,bucketSeconds:bundle.window.bucketSeconds}).catch(()=>null));
    await recordDemand(env,'replay-bundle',`${chain}:${bundle.subject.kind}`,bundle.subject.assetId||bundle.subject.mint,Date.now()-started);return json({ok:true,bundle:responseBundle});
  }catch(error){const code=String(error?.message||error),status=code==='intelligence_db_unavailable'?503:400;return json({ok:false,error:code},status);}
}

export const __replayBundleContract=Object.freeze({chainQualified:true,solanaHistorySchedulerOnlyForSolana:true,adaptiveHistoricalWindow:true,sevenDayPreEntryContext:true,targetReplayCandles:TARGET_REPLAY_CANDLES,noArbitraryLookback:true,maxWindowYears:15,noSyntheticData:true});
