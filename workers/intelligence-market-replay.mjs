/* Token Market Replay — bounded, indexed activity for a token across observed wallets.
 * Read-only. Intelligence Store only. Price evidence is opt-in by exact quote mint + bucket.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { recordDemand } from './intelligence-mesh-runtime.mjs';

const ADDRESS_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const nullableNumber=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,n(v)));
const uniq=values=>[...new Set(values.map(s).filter(Boolean))].sort();
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const enabled=env=>String(env?.PLAYABLE_DATA_ENABLED||'').toLowerCase()==='true';
async function all(stmt){try{return(await stmt.all())?.results||[];}catch{return[];}}
async function first(stmt){try{return await stmt.first();}catch{return null;}}
function parseList(value){return s(value).split(',').map(x=>x.trim()).filter(Boolean);}

export function normalizeMarketReplayEvent(row={}){
  const swapLike=s(row.event_class)==='swap-like';
  const delta=nullableNumber(row.token_delta);
  const side=swapLike?(delta===null?'trade':delta>0?'buy':delta<0?'sell':'trade'):s(row.event_class)||'event';
  const commitments=new Set(parseList(row.commitments).map(value=>value.toLowerCase()));
  const verification=n(row.verified)>0?'verified':commitments.has('finalized')?'finalized':commitments.has('confirmed')?'confirmed':s(row.source)||parseList(row.provenance_sources).length?'observed':'unknown';
  const blockTime=nullableNumber(row.block_time),slot=nullableNumber(row.slot),solDelta=nullableNumber(row.sol_delta),fee=nullableNumber(row.fee_lamports);
  return Object.freeze({
    id:s(row.signature)||`${s(row.wallet)}-${blockTime??'unknown'}`,
    signature:s(row.signature)||null,
    wallet:s(row.wallet)||null,
    counterparty:s(row.counterparty)||null,
    programId:s(row.program_id)||null,
    token:s(row.mint)||null,
    timestamp:blockTime===null?null:Math.max(0,Math.trunc(blockTime))*1000,
    slot:slot===null?null:slot,
    kind:swapLike?'trade':s(row.event_class)||'event',
    side,
    price:null,
    tokenDelta:delta,
    solDelta,
    feeLamports:fee===null?null:Math.max(0,fee),
    confidence:clamp(row.confidence,0,1),
    verification,
    sources:Object.freeze(uniq([s(row.source),...parseList(row.provenance_sources)]))
  });
}

function candle(row={}){
  let sources=[];try{sources=JSON.parse(row.source_set_json||'[]')}catch{}
  const timestamp=nullableNumber(row.bucket_start),bucket=nullableNumber(row.bucket_seconds);
  return Object.freeze({timestamp:timestamp===null?null:Math.max(0,Math.trunc(timestamp))*1000,bucketSeconds:bucket===null?null:Math.max(60,Math.trunc(bucket)),open:nullableNumber(row.open),high:nullableNumber(row.high),low:nullableNumber(row.low),close:nullableNumber(row.close),volumeBase:nullableNumber(row.volume_base),volumeQuote:nullableNumber(row.volume_quote),swapCount:nullableNumber(row.swap_count),walletCount:nullableNumber(row.wallet_count),confidence:clamp(row.confidence,0,1),sources:Object.freeze(uniq(sources))});
}

export async function buildMarketReplayBundle(env={},input={}){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const mint=s(input.mint||input.token);if(!ADDRESS_RE.test(mint))throw new TypeError('invalid_token_mint');
  const quoteMint=s(input.quoteMint||input.quote_mint);if(quoteMint&&!ADDRESS_RE.test(quoteMint))throw new TypeError('invalid_quote_mint');
  const bucketSeconds=Math.max(60,Math.min(86400,Math.trunc(n(input.bucketSeconds)||60)));
  const now=Math.floor(Date.now()/1000),to=Math.max(0,Math.trunc(n(input.to||now))),from=Math.max(0,Math.trunc(n(input.from||(to-86400))));
  if(to<from)throw new RangeError('invalid_replay_window');
  if(to-from>604800)throw new RangeError('market_replay_window_too_large');
  const limit=Math.max(50,Math.min(1500,Math.trunc(n(input.limit)||750));

  const summary=await first(db.prepare(`SELECT COUNT(*) event_count,COUNT(DISTINCT wallet) wallet_count,SUM(CASE WHEN event_class='swap-like' AND token_delta>0 THEN 1 ELSE 0 END) buy_count,SUM(CASE WHEN event_class='swap-like' AND token_delta<0 THEN 1 ELSE 0 END) sell_count,MIN(block_time) first_event,MAX(block_time) last_event FROM bull_wallet_events WHERE mint=? AND block_time BETWEEN ? AND ?`).bind(mint,from,to));
  const rows=await all(db.prepare(`SELECT e.signature,e.slot,e.block_time,e.wallet,e.counterparty,e.program_id,e.mint,e.event_class,e.sol_delta,e.token_delta,e.fee_lamports,e.source,e.confidence,MAX(COALESCE(p.verified,0)) verified,GROUP_CONCAT(DISTINCT p.source) provenance_sources,GROUP_CONCAT(DISTINCT p.commitment) commitments FROM bull_wallet_events e LEFT JOIN intelligence_event_provenance p ON p.signature=e.signature AND p.wallet=e.wallet WHERE e.mint=? AND e.block_time BETWEEN ? AND ? GROUP BY e.signature,e.slot,e.block_time,e.wallet,e.counterparty,e.program_id,e.mint,e.event_class,e.sol_delta,e.token_delta,e.fee_lamports,e.source,e.confidence ORDER BY e.block_time ASC,e.slot ASC,e.signature ASC LIMIT ?`).bind(mint,from,to,limit));
  const events=rows.map(normalizeMarketReplayEvent).filter(event=>event.timestamp!==null);
  const pairRows=await all(db.prepare(`SELECT quote_mint,bucket_seconds,COUNT(*) candle_count,MIN(bucket_start) first_bucket,MAX(bucket_start) last_bucket,MAX(confidence) confidence FROM intelligence_price_candles WHERE mint=? AND bucket_start BETWEEN ? AND ? GROUP BY quote_mint,bucket_seconds ORDER BY candle_count DESC,confidence DESC LIMIT 12`).bind(mint,from,to));
  const availablePricePairs=Object.freeze(pairRows.map(row=>Object.freeze({quoteMint:s(row.quote_mint),bucketSeconds:Math.max(60,Math.trunc(n(row.bucket_seconds)||60)),candleCount:Math.max(0,Math.trunc(n(row.candle_count))),from:Math.trunc(n(row.first_bucket)),to:Math.trunc(n(row.last_bucket)),confidence:clamp(row.confidence,0,1)})).filter(row=>row.quoteMint));
  const candleRows=quoteMint?await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(mint,quoteMint,bucketSeconds,from,to)):[];
  const candles=Object.freeze(candleRows.map(candle).filter(item=>item.timestamp!==null));
  const totalEvents=Math.max(0,Math.trunc(n(summary?.event_count)));
  const sources=uniq([...events.flatMap(event=>event.sources||[]),...candles.flatMap(item=>item.sources||[])]);
  return Object.freeze({schemaVersion:'market-replay-bundle-v1',generatedAt:Date.now(),subject:Object.freeze({kind:'token-market',mint,quoteMint:quoteMint||null}),window:Object.freeze({from,to,startTime:from*1000,endTime:to*1000,bucketSeconds}),activity:Object.freeze({totalEvents,walletCount:Math.max(0,Math.trunc(n(summary?.wallet_count))),buyCount:Math.max(0,Math.trunc(n(summary?.buy_count))),sellCount:Math.max(0,Math.trunc(n(summary?.sell_count))),firstEvent:Math.trunc(n(summary?.first_event))||null,lastEvent:Math.trunc(n(summary?.last_event))||null,returnedEvents:events.length,truncated:totalEvents>events.length}),events:Object.freeze(events),availablePricePairs,candles,sources:Object.freeze(sources),caveats:Object.freeze([totalEvents>events.length?`The selected window contains ${totalEvents} indexed events; playback is capped to the first ${events.length} ordered events for this request.`:'Playback contains every currently indexed event returned for this token/window.',quoteMint?`Price candles use only the explicitly selected quote mint ${quoteMint} and ${bucketSeconds}s bucket.`:'Time-only replay is active. No price market was selected and no price path is inferred.','Observed wallets are public-chain participants in the same token window; proximity does not prove coordination, ownership, strategy, causation, or intent.'])});
}

export async function handleMarketReplayRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/intelligence/market-replay')return null;
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);
  let input;try{input=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const started=Date.now();
  try{const bundle=await buildMarketReplayBundle(env,input||{});await recordDemand(env,'market-replay','token-market',bundle.subject.mint,Date.now()-started);return json({ok:true,bundle});}
  catch(error){const code=String(error?.message||error);const status=code==='intelligence_db_unavailable'?503:400;return json({ok:false,error:code},status);}
}
