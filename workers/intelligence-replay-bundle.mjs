/* Playable Data Engine — evidence-backed replay bundles from the Intelligence Store.
 * Read-only. No provider fetches, signatures, transaction submission, or invented prices.
 */

import { intelligenceDb } from './intelligence-indexer.mjs';
import { coverageForWallet, recordDemand } from './intelligence-mesh-runtime.mjs';

const WALLET_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MINT_RE=WALLET_RE;
const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,n(v)));
const uniq=values=>[...new Set(values.filter(Boolean))].sort();
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

function enabled(env={}){
  return String(env.PLAYABLE_DATA_ENABLED||'').trim().toLowerCase()==='true';
}

async function all(stmt){
  try{const result=await stmt.all();return result?.results||[];}catch{return[];}
}

function parseList(value){
  return s(value).split(',').map(item=>item.trim()).filter(Boolean);
}

function verificationState(row={}){
  const commitments=new Set(parseList(row.commitments).map(value=>value.toLowerCase()));
  if(n(row.verified)>0)return 'verified';
  if(commitments.has('finalized'))return 'finalized';
  if(commitments.has('confirmed'))return 'confirmed';
  return parseList(row.provenance_sources).length||s(row.source)?'observed':'unknown';
}

function directExecution(routeRows=[],mint='',quoteMint=''){
  let best=null;
  for(const row of routeRows){
    const inputMint=s(row.input_mint),outputMint=s(row.output_mint);
    const input=Math.abs(n(row.input_amount)),output=Math.abs(n(row.output_amount));
    if(!(input>0&&output>0))continue;
    let candidate=null;
    if(inputMint===quoteMint&&outputMint===mint){
      candidate={side:'buy',price:input/output,baseAmount:output,quoteAmount:input};
    }else if(inputMint===mint&&outputMint===quoteMint){
      candidate={side:'sell',price:output/input,baseAmount:input,quoteAmount:output};
    }
    if(!candidate||!(candidate.price>0))continue;
    candidate={...candidate,confidence:clamp(row.confidence,0,1),venue:s(row.venue),pool:s(row.pool),source:s(row.source)};
    if(!best||candidate.confidence>best.confidence)best=candidate;
  }
  return best;
}

function normalizedReplayEvent(row,execution){
  const blockTime=Math.max(0,Math.trunc(n(row.block_time)));
  const swapLike=s(row.event_class)==='swap-like';
  const fallbackSide=swapLike?(n(row.token_delta)>0?'buy':n(row.token_delta)<0?'sell':null):null;
  const sources=uniq([s(row.source),...parseList(row.provenance_sources),execution?.source]);
  return Object.freeze({
    id:s(row.signature)||`${s(row.wallet)}-${blockTime}-${s(row.mint)}`,
    signature:s(row.signature)||null,
    wallet:s(row.wallet),
    token:s(row.mint)||null,
    timestamp:blockTime*1000,
    slot:n(row.slot)||null,
    kind:swapLike?'trade':s(row.event_class)||'event',
    side:execution?.side||fallbackSide,
    price:execution?.price??null,
    tokenDelta:n(row.token_delta),
    solDelta:n(row.sol_delta),
    feeLamports:Math.max(0,n(row.fee_lamports)),
    counterparty:s(row.counterparty)||null,
    programId:s(row.program_id)||null,
    confidence:clamp(Math.max(n(row.confidence),n(execution?.confidence)),0,1),
    verification:verificationState(row),
    sources,
    execution:execution?Object.freeze({
      baseAmount:execution.baseAmount,
      quoteAmount:execution.quoteAmount,
      venue:execution.venue||null,
      pool:execution.pool||null
    }):null
  });
}

function normalizeCandle(row){
  return Object.freeze({
    timestamp:Math.max(0,Math.trunc(n(row.bucket_start)))*1000,
    bucketSeconds:Math.max(60,Math.trunc(n(row.bucket_seconds)||60)),
    open:n(row.open),high:n(row.high),low:n(row.low),close:n(row.close),
    volumeBase:n(row.volume_base),volumeQuote:n(row.volume_quote),
    swapCount:Math.max(0,Math.trunc(n(row.swap_count))),walletCount:Math.max(0,Math.trunc(n(row.wallet_count))),
    confidence:clamp(row.confidence,0,1),
    sources:(()=>{try{return JSON.parse(row.source_set_json||'[]')}catch{return[]}})()
  });
}

export async function buildReplayBundle(env={},input={}){
  const db=intelligenceDb(env);
  if(!db)throw new Error('intelligence_db_unavailable');
  const wallets=uniq((Array.isArray(input.wallets)?input.wallets:[input.wallet,input.compareWallet]).map(s)).slice(0,2);
  if(!wallets.length||wallets.some(wallet=>!WALLET_RE.test(wallet)))throw new TypeError('invalid_public_wallet');
  const mint=s(input.mint||input.token);
  if(!MINT_RE.test(mint))throw new TypeError('invalid_token_mint');
  const quoteMint=s(input.quoteMint||input.quote_mint);
  if(quoteMint&&!MINT_RE.test(quoteMint))throw new TypeError('invalid_quote_mint');
  const now=Math.floor(Date.now()/1000);
  const requestedTo=Math.trunc(n(input.to||input.endTime||now));
  const requestedFrom=Math.trunc(n(input.from||input.startTime||(requestedTo-86400)));
  const from=Math.max(0,Math.min(requestedFrom,requestedTo));
  const to=Math.max(from,Math.max(requestedFrom,requestedTo));
  if(to-from>60*60*24*365*5)throw new RangeError('replay_window_too_large');
  const limit=Math.max(1,Math.min(1000,Math.trunc(n(input.limit)||500)));
  const bucketSeconds=Math.max(60,Math.min(86400,Math.trunc(n(input.bucketSeconds)||60));

  const events=[];
  const coverages=[];
  const sourceSet=new Set();
  for(const wallet of wallets){
    const rows=await all(db.prepare(`
      SELECT e.signature,e.slot,e.block_time,e.wallet,e.counterparty,e.program_id,e.mint,e.event_class,
        e.sol_delta,e.token_delta,e.fee_lamports,e.source,e.confidence,
        MAX(COALESCE(p.verified,0)) verified,
        GROUP_CONCAT(DISTINCT p.source) provenance_sources,
        GROUP_CONCAT(DISTINCT p.commitment) commitments
      FROM bull_wallet_events e
      LEFT JOIN intelligence_event_provenance p ON p.signature=e.signature AND p.wallet=e.wallet
      WHERE e.wallet=? AND e.mint=? AND e.block_time BETWEEN ? AND ?
      GROUP BY e.signature,e.slot,e.block_time,e.wallet,e.counterparty,e.program_id,e.mint,e.event_class,
        e.sol_delta,e.token_delta,e.fee_lamports,e.source,e.confidence
      ORDER BY e.block_time ASC,e.slot ASC,e.signature ASC
      LIMIT ?
    `).bind(wallet,mint,from,to,limit));

    const signatures=rows.map(row=>s(row.signature)).filter(Boolean);
    const routes=signatures.length?await all(db.prepare(`
      SELECT signature,wallet,hop_index,venue,pool,input_mint,output_mint,input_amount,output_amount,
        block_time,source,confidence
      FROM intelligence_trade_routes
      WHERE wallet=? AND block_time BETWEEN ? AND ? AND (input_mint=? OR output_mint=?)
      ORDER BY block_time ASC,signature ASC,hop_index ASC
      LIMIT ?
    `).bind(wallet,from,to,mint,mint,Math.min(4000,limit*4))):[];
    const bySignature=new Map();
    for(const route of routes){const key=s(route.signature);if(!bySignature.has(key))bySignature.set(key,[]);bySignature.get(key).push(route);}
    for(const row of rows){
      const execution=quoteMint?directExecution(bySignature.get(s(row.signature))||[],mint,quoteMint):null;
      const event=normalizedReplayEvent(row,execution);
      event.sources.forEach(source=>sourceSet.add(source));
      events.push(event);
    }
    coverages.push(await coverageForWallet(env,wallet));
  }

  events.sort((a,b)=>a.timestamp-b.timestamp||(a.slot||0)-(b.slot||0)||String(a.signature||'').localeCompare(String(b.signature||'')));
  const candleRows=quoteMint?await all(db.prepare(`
    SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json
    FROM intelligence_price_candles
    WHERE mint=? AND quote_mint=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ?
    ORDER BY bucket_start ASC
    LIMIT 2000
  `).bind(mint,quoteMint,bucketSeconds,from,to)):[];
  const candles=candleRows.map(normalizeCandle);
  candles.flatMap(candle=>candle.sources||[]).forEach(source=>sourceSet.add(source));

  const verificationCounts={observed:0,confirmed:0,finalized:0,verified:0,unknown:0};
  for(const event of events)verificationCounts[event.verification]=(verificationCounts[event.verification]||0)+1;
  const complete=coverages.length>0&&coverages.every(item=>n(item?.complete_to_genesis)>0);
  const coverageStatement=complete
    ? 'Indexed wallet histories report complete-to-genesis coverage; this replay is still bounded to the selected time window and token.'
    : 'Replay uses currently indexed evidence only. Wallet history may be partial while the Intelligence Mesh continues backfill.';

  return Object.freeze({
    schemaVersion:'replay-bundle-v1',
    generatedAt:Date.now(),
    subject:Object.freeze({kind:wallets.length===2?'wallet-comparison':'wallet-token',wallets:Object.freeze(wallets),mint,quoteMint:quoteMint||null}),
    window:Object.freeze({from,to,startTime:from*1000,endTime:to*1000,bucketSeconds}),
    eventCount:events.length,
    events:Object.freeze(events),
    candles:Object.freeze(candles),
    coverage:Object.freeze({wallets:Object.freeze(coverages),complete,statement:coverageStatement}),
    verification:Object.freeze(verificationCounts),
    sources:Object.freeze([...sourceSet].sort()),
    caveats:Object.freeze([
      'Public-chain observations only; wallet relationships do not prove identity or common ownership.',
      quoteMint?'Execution price is shown only when indexed route evidence directly supports the selected base/quote pair.':'No quote mint was supplied, so execution prices are not inferred.',
      candles.length?'Candles are indexed market observations with their own confidence/source metadata.':'No indexed OHLC series is available for this selection; no price series was invented.',
      'What-if overlays are historical counterfactuals, not predictions or claims of achievable execution.'
    ])
  });
}

export async function handleReplayBundleRequest(request,env={}){
  const url=new URL(request.url);
  if(url.pathname!=='/api/intelligence/replay-bundle')return null;
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);
  let input;
  try{input=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const started=Date.now();
  try{
    const bundle=await buildReplayBundle(env,input||{});
    await recordDemand(env,'replay-bundle',bundle.subject.kind,bundle.subject.mint,Date.now()-started);
    return json({ok:true,bundle});
  }catch(error){
    const code=String(error?.message||error);
    const status=code==='replay_window_too_large'?400:code==='intelligence_db_unavailable'?503:400;
    return json({ok:false,error:code},status);
  }
}
