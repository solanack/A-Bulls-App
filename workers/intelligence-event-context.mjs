/* Event Market Context — bounded indexed context around one replay event.
 * Read-only. Uses the Intelligence Store only; no provider fetches or invented prices.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { recordDemand } from './intelligence-mesh-runtime.mjs';

const ADDRESS_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=v=>String(v==null?'':v).trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,num(v)));
const uniq=values=>[...new Set(values.map(s).filter(Boolean))];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

function enabled(env={}){return String(env.PLAYABLE_DATA_ENABLED||'').trim().toLowerCase()==='true';}
async function all(stmt){try{return (await stmt.all())?.results||[];}catch{return[];}}
function sideFor(row={}){if(s(row.event_class)!=='swap-like')return s(row.event_class)||'event';const delta=num(row.token_delta);return delta>0?'buy':delta<0?'sell':'trade';}
function pct(from,to){const a=Number(from),b=Number(to);return Number.isFinite(a)&&Number.isFinite(b)&&a!==0?((b-a)/Math.abs(a))*100:null;}
function shortEvent(row={}){return Object.freeze({signature:s(row.signature)||null,wallet:s(row.wallet)||null,counterparty:s(row.counterparty)||null,programId:s(row.program_id)||null,timestamp:Math.max(0,Math.trunc(num(row.block_time)))*1000,slot:num(row.slot)||null,side:sideFor(row),tokenDelta:num(row.token_delta),solDelta:num(row.sol_delta),feeLamports:Math.max(0,num(row.fee_lamports)),confidence:clamp(row.confidence,0,1),source:s(row.source)||null});}

function nearestAtOrBefore(rows,target){let found=null;for(const row of rows){const t=num(row.bucket_start);if(t<=target)found=row;else break;}return found;}
function nearestAtOrAfter(rows,target){return rows.find(row=>num(row.bucket_start)>=target)||null;}
function horizonSnapshot(rows,center,seconds,direction){
  const anchor=nearestAtOrBefore(rows,center)||nearestAtOrAfter(rows,center);if(!anchor)return null;
  const target=center+(direction==='after'?seconds:-seconds);
  const sample=direction==='after'?nearestAtOrAfter(rows,target):nearestAtOrBefore(rows,target);
  if(!sample)return null;
  const from=direction==='after'?num(anchor.close):num(sample.close),to=direction==='after'?num(sample.close):num(anchor.close);
  return Object.freeze({direction,requestedSeconds:seconds,actualSeconds:Math.abs(Math.trunc(num(sample.bucket_start)-num(anchor.bucket_start))),anchorTime:Math.trunc(num(anchor.bucket_start)),sampleTime:Math.trunc(num(sample.bucket_start)),anchorClose:num(anchor.close),sampleClose:num(sample.close),changePercent:pct(from,to)});
}
function summarizePairs(rows=[],center=0){
  const groups=new Map();
  for(const row of rows){const quote=s(row.quote_mint);if(!quote)continue;const bucket=Math.max(60,Math.trunc(num(row.bucket_seconds)||60));const key=`${quote}:${bucket}`;if(!groups.has(key))groups.set(key,{quoteMint:quote,bucketSeconds:bucket,candles:[]});groups.get(key).candles.push(row);}
  return Object.freeze([...groups.values()].map(group=>{
    group.candles.sort((a,b)=>num(a.bucket_start)-num(b.bucket_start));
    const first=group.candles[0],last=group.candles.at(-1);const highs=group.candles.map(r=>num(r.high)),lows=group.candles.map(r=>num(r.low));
    const before=Object.freeze([300,900,1800].map(seconds=>horizonSnapshot(group.candles,center,seconds,'before')).filter(Boolean));
    const after=Object.freeze([300,900,1800].map(seconds=>horizonSnapshot(group.candles,center,seconds,'after')).filter(Boolean));
    return Object.freeze({quoteMint:group.quoteMint,bucketSeconds:group.bucketSeconds,candleCount:group.candles.length,from:Math.trunc(num(first.bucket_start)),to:Math.trunc(num(last.bucket_start)),firstClose:num(first.close),lastClose:num(last.close),changePercent:pct(first.close,last.close),high:highs.length?Math.max(...highs):null,low:lows.length?Math.min(...lows):null,swapCount:group.candles.reduce((sum,r)=>sum+Math.max(0,Math.trunc(num(r.swap_count))),0),walletCountMax:group.candles.reduce((max,r)=>Math.max(max,Math.max(0,Math.trunc(num(r.wallet_count)))),0),confidence:group.candles.reduce((max,r)=>Math.max(max,clamp(r.confidence,0,1)),0),sources:uniq(group.candles.flatMap(r=>{try{return JSON.parse(r.source_set_json||'[]')}catch{return[]}})),before,after});
  }).sort((a,b)=>b.candleCount-a.candleCount||b.confidence-a.confidence).slice(0,6));
}

function summarizeRoutes(rows=[]){
  const venues=new Map(),pools=new Map();
  for(const row of rows){const venue=s(row.venue),pool=s(row.pool);if(venue)venues.set(venue,(venues.get(venue)||0)+1);if(pool)pools.set(pool,(pools.get(pool)||0)+1);}
  const rank=map=>Object.freeze([...map.entries()].map(([id,count])=>Object.freeze({id,count})).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)).slice(0,10));
  return Object.freeze({routeRows:rows.length,venues:rank(venues),pools:rank(pools),sources:Object.freeze(uniq(rows.map(r=>r.source)))});
}

export async function buildEventMarketContext(env={},input={}){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const mint=s(input.mint||input.token);if(!ADDRESS_RE.test(mint))throw new TypeError('invalid_token_mint');
  const timestampMs=Number(input.timestamp??input.blockTimeMs??(Number(input.blockTime)*1000));if(!Number.isFinite(timestampMs)||timestampMs<=0)throw new TypeError('invalid_event_timestamp');
  const center=Math.trunc(timestampMs/1000);const windowSeconds=Math.max(60,Math.min(21600,Math.trunc(num(input.windowSeconds)||1800));const from=Math.max(0,center-windowSeconds),to=center+windowSeconds;
  const subjectWallet=s(input.subjectWallet||input.wallet);if(subjectWallet&&!ADDRESS_RE.test(subjectWallet))throw new TypeError('invalid_subject_wallet');
  const signature=s(input.signature);

  const activityRows=await all(db.prepare(`
    SELECT signature,slot,block_time,wallet,counterparty,program_id,mint,event_class,sol_delta,token_delta,fee_lamports,source,confidence
    FROM bull_wallet_events
    WHERE mint=? AND block_time BETWEEN ? AND ?
    ORDER BY ABS(block_time-?) ASC,block_time ASC,slot ASC
    LIMIT 500
  `).bind(mint,from,to,center));
  const events=activityRows.map(shortEvent).sort((a,b)=>a.timestamp-b.timestamp||(a.slot||0)-(b.slot||0));
  const wallets=uniq(events.map(e=>e.wallet));const buys=events.filter(e=>e.side==='buy').length,sells=events.filter(e=>e.side==='sell').length;
  const beforeEvents=events.filter(e=>e.timestamp<center*1000),afterEvents=events.filter(e=>e.timestamp>center*1000);

  const candleRows=await all(db.prepare(`
    SELECT quote_mint,bucket_start,bucket_seconds,open,high,low,close,swap_count,wallet_count,confidence,source_set_json
    FROM intelligence_price_candles
    WHERE mint=? AND bucket_start BETWEEN ? AND ?
    ORDER BY quote_mint ASC,bucket_seconds ASC,bucket_start ASC
    LIMIT 4000
  `).bind(mint,from,to));
  const pricePairs=summarizePairs(candleRows,center);

  const routeRows=await all(db.prepare(`
    SELECT signature,wallet,venue,pool,input_mint,output_mint,block_time,source,confidence
    FROM intelligence_trade_routes
    WHERE block_time BETWEEN ? AND ? AND (input_mint=? OR output_mint=?)
    ORDER BY ABS(block_time-?) ASC,block_time ASC
    LIMIT 1000
  `).bind(from,to,mint,mint,center));
  const routes=summarizeRoutes(routeRows);

  const subjectEvents=subjectWallet?events.filter(e=>e.wallet===subjectWallet):[];
  const selected=signature?events.find(e=>e.signature===signature)||null:null;
  return Object.freeze({
    schemaVersion:'event-market-context-v1',generatedAt:Date.now(),subject:Object.freeze({mint,subjectWallet:subjectWallet||null,signature:signature||null,eventTime:center*1000}),window:Object.freeze({from,to,windowSeconds}),
    activity:Object.freeze({eventCount:events.length,walletCount:wallets.length,buyCount:buys,sellCount:sells,beforeCount:beforeEvents.length,afterCount:afterEvents.length,subjectEventCount:subjectEvents.length,events:Object.freeze(events.slice(0,120))}),
    pricePairs,routes,selected,
    observations:Object.freeze([
      `${events.length} indexed token events from ${wallets.length} observed wallet${wallets.length===1?'':'s'} fall inside the ±${Math.round(windowSeconds/60)} minute context window.`,
      buys||sells?`${buys} indexed buy-side and ${sells} indexed sell-side swap-like events are observed in that window.`:'No indexed buy/sell classification is available in this context window.',
      pricePairs.length?`${pricePairs.length} indexed quote-market series are available; each remains labeled by quote mint and bucket size.`:'No indexed price series is available for this event window; no market-price path is inferred.',
      routes.routeRows?`${routes.routeRows} indexed route rows provide venue/pool context in the same window.`:'No indexed route rows are available in the selected context window.'
    ]),
    disclosure:'Market context is bounded to currently indexed public-chain evidence in this time window. Before/after price windows use the nearest indexed candle and report actual elapsed time. Nearby activity does not prove coordination, causation, shared ownership, strategy, or intent.'
  });
}

export async function handleEventMarketContextRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/intelligence/event-context')return null;
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);
  let input;try{input=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const started=Date.now();
  try{const context=await buildEventMarketContext(env,input||{});await recordDemand(env,'event-market-context','token-event',context.subject.mint,Date.now()-started);return json({ok:true,context});}
  catch(error){const code=String(error?.message||error);return json({ok:false,error:code},code==='intelligence_db_unavailable'?503:400);}
}
