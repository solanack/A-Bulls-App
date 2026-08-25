/* Wallet token activity index for Playable Data.
 * Reads only normalized Intelligence Store evidence. No provider fetches or inferred ownership.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { coverageForWallet, recordDemand } from './intelligence-mesh-runtime.mjs';

const WALLET_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const enabled=env=>String(env.PLAYABLE_DATA_ENABLED||'').trim().toLowerCase()==='true';

async function all(stmt){const result=await stmt.all();return result?.results||[];}

export async function buildWalletTokenIndex(env={},walletInput='',{limit=100,db:dbOverride}={}){
  const wallet=s(walletInput);
  if(!WALLET_RE.test(wallet))throw new TypeError('invalid_public_wallet');
  const db=dbOverride||intelligenceDb(env);
  if(!db)throw new Error('intelligence_db_unavailable');
  const safeLimit=Math.max(1,Math.min(250,Math.trunc(n(limit)||100)));
  const rows=await all(db.prepare(`
    SELECT mint,
      COUNT(*) event_count,
      SUM(CASE WHEN event_class='swap-like' THEN 1 ELSE 0 END) trade_count,
      MIN(block_time) first_event,
      MAX(block_time) last_event,
      SUM(ABS(COALESCE(token_delta,0))) observed_token_flow,
      MAX(COALESCE(confidence,0)) max_confidence
    FROM bull_wallet_events
    WHERE wallet=? AND mint IS NOT NULL AND mint<>''
    GROUP BY mint
    ORDER BY trade_count DESC,event_count DESC,last_event DESC
    LIMIT ?
  `).bind(wallet,safeLimit));
  const tokens=rows.map(row=>Object.freeze({
    mint:s(row.mint),
    eventCount:Math.max(0,Math.trunc(n(row.event_count))),
    tradeCount:Math.max(0,Math.trunc(n(row.trade_count))),
    firstEvent:Math.max(0,Math.trunc(n(row.first_event)))||null,
    lastEvent:Math.max(0,Math.trunc(n(row.last_event)))||null,
    observedTokenFlow:Math.abs(n(row.observed_token_flow)),
    maxConfidence:Math.max(0,Math.min(1,n(row.max_confidence)))
  })).filter(item=>WALLET_RE.test(item.mint));
  const coverage=await coverageForWallet(env,wallet).catch(()=>null);
  return Object.freeze({
    schemaVersion:'wallet-token-index-v1',wallet,tokenCount:tokens.length,tokens:Object.freeze(tokens),coverage,
    disclosure:'Token activity reflects currently indexed public-chain observations for this wallet address. Event counts do not prove trading intent, identity, ownership, or complete history.'
  });
}

export async function handleWalletTokenIndexRequest(request,env={}){
  const url=new URL(request.url);
  if(url.pathname!=='/api/intelligence/wallet-tokens')return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);
  const wallet=s(url.searchParams.get('wallet'));
  const limit=url.searchParams.get('limit');
  const started=Date.now();
  try{
    const index=await buildWalletTokenIndex(env,wallet,{limit});
    await recordDemand(env,'wallet-token-index','wallet',wallet,Date.now()-started).catch(()=>null);
    return json({ok:true,index});
  }catch(error){
    const code=s(error?.message||error);
    return json({ok:false,error:code},code==='intelligence_db_unavailable'?503:400);
  }
}
