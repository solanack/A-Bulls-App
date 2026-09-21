/* Token system / planet local sky. D1-only: no provider calls on navigation.
 * A token is a PLANET; retained public wallets are STARS above it.
 * Chain identity is first-class. Missing evidence stays empty.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { canonicalChainAddress, normalizeChainKey, resolveChain } from './intelligence-chain-registry.mjs';

const PATH='/api/intelligence/token-system';
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finite=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const all=async statement=>{try{return(await statement.all())?.results||[];}catch{return[];}};

export function normalizeHolderRows(rows=[],limit=50,{chainKey='solana'}={}){
  const chain=normalizeChainKey(chainKey);
  const clean=(Array.isArray(rows)?rows:[]).map(row=>{
    const wallet=canonicalChainAddress(chain,s(row.wallet));
    const pricedCount=Math.max(0,Math.trunc(n(row.priced_count)));
    return wallet?{
      wallet,
      chainKey:chain,
      netTokenObserved:n(row.net_token),
      tradeCount:Math.max(0,Math.trunc(n(row.trade_count))),
      buySolObserved:chain==='solana'?Math.max(0,n(row.buy_sol)):null,
      sellSolObserved:chain==='solana'?Math.max(0,n(row.sell_sol)):null,
      buyValueUsd:pricedCount?Math.max(0,n(row.buy_usd)):null,
      sellValueUsd:pricedCount?Math.max(0,n(row.sell_usd)):null,
      lastObservedAt:Math.max(0,Math.trunc(n(row.last_seen)))*1000,
      source:s(row.source)||'indexed-d1',
      sourceKind:s(row.source_kind)||'observed-fact',
    }:null;
  }).filter(row=>row&&row.netTokenObserved>0);
  clean.sort((a,b)=>b.netTokenObserved-a.netTokenObserved||b.tradeCount-a.tradeCount||a.wallet.localeCompare(b.wallet));
  const total=clean.reduce((sum,row)=>sum+row.netTokenObserved,0);
  return clean.slice(0,Math.max(1,Math.min(50,Math.trunc(n(limit)||50)))).map((row,index)=>Object.freeze({rank:index+1,...row,observedSharePct:total>0?row.netTokenObserved/total*100:null}));
}

function mapPumpTrade(row){
  const side=s(row.side).toLowerCase();if(side!=='buy'&&side!=='sell')return null;
  return Object.freeze({signature:s(row.signature)||null,wallet:s(row.wallet),chainKey:'solana',side,solAmount:Math.abs(n(row.sol_amount)),tokenAmount:Math.abs(n(row.token_amount)),priceSol:n(row.price_sol)||null,priceUsd:null,valueUsd:null,observedAt:Math.max(0,Math.trunc(n(row.block_time)))*1000,source:s(row.source)||'pump-index',sourceKind:'observed-fact'});
}
function mapWalletEvent(row){
  const token=n(row.token_delta),sol=n(row.sol_delta);if(!token||!sol)return null;
  return Object.freeze({signature:s(row.signature)||null,wallet:s(row.wallet),chainKey:'solana',side:token>0?'buy':'sell',solAmount:Math.abs(sol),tokenAmount:Math.abs(token),priceSol:Math.abs(token)>0?Math.abs(sol/token):null,priceUsd:null,valueUsd:null,observedAt:Math.max(0,Math.trunc(n(row.block_time)))*1000,source:s(row.source)||'indexed-wallet-events',sourceKind:'observed-fact'});
}
function mapChainEvent(row,chain){
  const side=s(row.side).toLowerCase();if(side!=='buy'&&side!=='sell')return null;
  const wallet=canonicalChainAddress(chain,s(row.wallet_address)),tokenAmount=Math.abs(n(row.amount)),priceUsd=finite(row.price_usd);
  if(!wallet||!tokenAmount)return null;
  return Object.freeze({signature:s(row.tx_id)||null,wallet,chainKey:chain,side,solAmount:null,tokenAmount,priceSol:null,priceUsd,valueUsd:priceUsd==null?null:tokenAmount*Math.abs(priceUsd),observedAt:Math.max(0,Math.trunc(n(row.block_time)))*1000,source:s(row.source)||'intelligence-chain-events-v2',sourceKind:s(row.source_kind)||'provider-reported'});
}

async function bullHolders(db,mint,limit){return all(db.prepare(`SELECT wallet,SUM(token_delta) net_token,SUM(CASE WHEN token_delta>0 THEN ABS(sol_delta) ELSE 0 END) buy_sol,SUM(CASE WHEN token_delta<0 THEN ABS(sol_delta) ELSE 0 END) sell_sol,COUNT(*) trade_count,MAX(block_time) last_seen,'bull_wallet_events' source,'observed-fact' source_kind,0 priced_count FROM bull_wallet_events WHERE mint=? AND wallet IS NOT NULL AND wallet<>'' GROUP BY wallet HAVING SUM(token_delta)>0 ORDER BY net_token DESC,trade_count DESC LIMIT ?`).bind(mint,limit));}
async function pumpHolders(db,mint,limit){return all(db.prepare(`SELECT wallet,SUM(CASE WHEN side='buy' THEN token_amount WHEN side='sell' THEN -token_amount ELSE 0 END) net_token,SUM(CASE WHEN side='buy' THEN ABS(sol_amount) ELSE 0 END) buy_sol,SUM(CASE WHEN side='sell' THEN ABS(sol_amount) ELSE 0 END) sell_sol,COUNT(*) trade_count,MAX(block_time) last_seen,'pump_trades' source,'observed-fact' source_kind,0 priced_count FROM pump_trades WHERE mint=? AND wallet IS NOT NULL AND wallet<>'' AND side IN ('buy','sell') GROUP BY wallet HAVING SUM(CASE WHEN side='buy' THEN token_amount WHEN side='sell' THEN -token_amount ELSE 0 END)>0 ORDER BY net_token DESC,trade_count DESC LIMIT ?`).bind(mint,limit));}
async function chainHolders(db,chain,mint,limit){return all(db.prepare(`SELECT wallet_address wallet,SUM(CASE WHEN LOWER(side)='buy' THEN ABS(COALESCE(amount,0)) WHEN LOWER(side)='sell' THEN -ABS(COALESCE(amount,0)) ELSE 0 END) net_token,NULL buy_sol,NULL sell_sol,SUM(CASE WHEN LOWER(side)='buy' AND price_usd IS NOT NULL THEN ABS(COALESCE(amount,0)*price_usd) ELSE 0 END) buy_usd,SUM(CASE WHEN LOWER(side)='sell' AND price_usd IS NOT NULL THEN ABS(COALESCE(amount,0)*price_usd) ELSE 0 END) sell_usd,SUM(CASE WHEN price_usd IS NOT NULL AND LOWER(side) IN ('buy','sell') THEN 1 ELSE 0 END) priced_count,SUM(CASE WHEN LOWER(side) IN ('buy','sell') THEN 1 ELSE 0 END) trade_count,MAX(block_time) last_seen,GROUP_CONCAT(DISTINCT source) source,CASE WHEN SUM(CASE WHEN source_kind='observed-fact' THEN 1 ELSE 0 END)>0 THEN 'observed-fact' ELSE 'provider-reported' END source_kind FROM intelligence_chain_events_v2 WHERE chain_key=? AND LOWER(asset_address)=LOWER(?) AND wallet_address IS NOT NULL AND wallet_address<>'' GROUP BY wallet_address HAVING SUM(CASE WHEN LOWER(side)='buy' THEN ABS(COALESCE(amount,0)) WHEN LOWER(side)='sell' THEN -ABS(COALESCE(amount,0)) ELSE 0 END)>0 ORDER BY net_token DESC,trade_count DESC,last_seen DESC LIMIT ?`).bind(chain,mint,limit));}
async function recentSolanaTrades(db,mint,limit){let rows=await all(db.prepare(`SELECT signature,wallet,side,sol_amount,token_amount,price_sol,block_time,source FROM pump_trades WHERE mint=? AND wallet IS NOT NULL AND side IN ('buy','sell') ORDER BY block_time DESC,event_id DESC LIMIT ?`).bind(mint,limit)),mapped=rows.map(mapPumpTrade).filter(Boolean);if(mapped.length)return mapped;rows=await all(db.prepare(`SELECT signature,wallet,sol_delta,token_delta,block_time,source FROM bull_wallet_events WHERE mint=? AND wallet IS NOT NULL AND token_delta<>0 AND sol_delta<>0 ORDER BY block_time DESC,id DESC LIMIT ?`).bind(mint,limit));return rows.map(mapWalletEvent).filter(Boolean);}
async function recentChainTrades(db,chain,mint,limit){const rows=await all(db.prepare(`SELECT tx_id,wallet_address,side,amount,price_usd,block_time,source,source_kind FROM intelligence_chain_events_v2 WHERE chain_key=? AND LOWER(asset_address)=LOWER(?) AND wallet_address IS NOT NULL AND LOWER(side) IN ('buy','sell') ORDER BY block_time DESC,COALESCE(block_height,0) DESC,event_id DESC LIMIT ?`).bind(chain,mint,limit));return rows.map(row=>mapChainEvent(row,chain)).filter(Boolean);}

export async function readTokenSystem(env={},mint,limit=50,chainInput='solana'){
  const db=intelligenceDb(env);if(!db)return Object.freeze({ok:false,error:'database_unavailable',coverage:'degraded',mint,chainKey:normalizeChainKey(chainInput),holders:[],trades:[],disclosure:'The Intelligence D1 binding is unavailable. No provider fallback was attempted.'});
  const chain=normalizeChainKey(chainInput),definition=resolveChain(chain,{address:mint}),normalized=definition?canonicalChainAddress(definition.key,s(mint)):null;
  if(!definition||!normalized)return Object.freeze({ok:false,error:'invalid_token',coverage:'empty',mint:s(mint),chainKey:chain,holders:[],trades:[],disclosure:'A valid public token address for the selected chain is required.'});
  const cap=Math.max(1,Math.min(50,Math.trunc(n(limit)||50)));
  let rows,trades;
  if(chain==='solana'){
    rows=await bullHolders(db,normalized,cap*2);if(!rows.length)rows=await pumpHolders(db,normalized,cap*2);
    trades=await recentSolanaTrades(db,normalized,Math.min(24,cap));
  }else{
    rows=await chainHolders(db,chain,normalized,cap*2);
    trades=await recentChainTrades(db,chain,normalized,Math.min(24,cap));
  }
  const holders=normalizeHolderRows(rows,cap,{chainKey:chain}),observedAt=Math.max(0,...holders.map(row=>row.lastObservedAt),...trades.map(row=>row.observedAt))||null;
  const disclosure=holders.length
    ? `Holder/trader STARS are positive-net wallets derived from retained ${chain} events. Observed share is a share of this retained positive-net sample, not total token supply. Provider-reported evidence remains labeled and does not become an identity, ownership, skill, or recommendation claim.`
    : `No positive-net wallet STARS are present in retained ${chain} evidence for this token. Missing coverage is not zero activity. No provider lookup was attempted. No wallet stars were invented.`;
  return Object.freeze({ok:true,coverage:holders.length?'fresh':'empty',mint:normalized,chainKey:chain,holders,trades,observedAt,method:'chain-qualified-indexed-positive-net-position-v2',disclosure});
}
export async function handleTokenSystemRequest(request,env={}){const url=new URL(request.url);if(url.pathname!==PATH||request.method!=='GET')return null;const mint=s(url.searchParams.get('mint')),chainKey=s(url.searchParams.get('chain')||url.searchParams.get('chainKey')||'solana'),limit=Math.max(1,Math.min(50,Math.trunc(n(url.searchParams.get('limit'))||50))),body=await readTokenSystem(env,mint,limit,chainKey),status=body.error==='invalid_token'?400:body.error==='database_unavailable'?503:200;return json(body,status,status===200?'public, max-age=15, stale-while-revalidate=30':'no-store');}
