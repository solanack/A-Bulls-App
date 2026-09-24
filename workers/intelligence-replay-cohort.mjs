/* Replay cohort: other wallets in the same room (FOMO or Afterbell) with a retained BUY on the same mint
 * after the selected wallet's first buy. D1-only reads. Timing only: a cohort buy is never described as
 * following or copying the selected trader, and rooms are never mixed.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { canonicalChainAddress,normalizeChainKey } from './intelligence-chain-registry.mjs';
import { retainedIdentityMap } from './intelligence-afterbell-traders.mjs';

export const REPLAY_COHORT_PATH='/api/intelligence/replay/cohort';
export const REPLAY_COHORT_MAX=200;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finite=value=>value==null||value===''?null:Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;
const json=(body,status=200,cache='public, max-age=30, stale-while-revalidate=60')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const all=async stmt=>{try{return(await stmt.all())?.results||[];}catch{return[];}};
const callsign=wallet=>{const value=s(wallet);return value.length>=8?`${value.slice(0,4)}…${value.slice(-4)}`:value||'PUBLIC WALLET';};
const sameWallet=(chain,a,b)=>Boolean(a&&b)&&(chain==='solana'?s(a)===s(b):s(a).toLowerCase()===s(b).toLowerCase());

export function shapeCohort(rows=[],{room,chain,wallet,after,to}){
  const seen=new Set(),items=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const time=Math.trunc(n(row.time)),who=s(row.wallet);
    if(!who||sameWallet(chain,who,wallet)||time<after||time>to)continue;
    const id=s(row.id)||`${who}:${time}`;if(seen.has(id))continue;seen.add(id);
    items.push(Object.freeze({id,wallet:who,callsign:s(row.callsign)||callsign(who),callsignSource:s(row.callsignSource)||'wallet-callsign',time:time*1000,priceUsd:finite(row.priceUsd),txId:s(row.txId)||null,source:s(row.source)||(room==='fomo'?'fomoapi.io/trades':'indexed-d1'),sourceKind:s(row.sourceKind)||'provider-reported'}));
  }
  items.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
  const capped=items.slice(0,REPLAY_COHORT_MAX);
  return Object.freeze({ok:true,room,chain,after:after*1000,count:capped.length,wallets:new Set(capped.map(item=>item.wallet)).size,items:Object.freeze(capped),disclosure:'Other retained buys on this token in the same room after this print. Timing only; no link to the selected trader is claimed.'});
}

async function fomoRows(db,chain,mint,after,to){
  const evm=chain!=='solana',rows=await all(db.prepare(`SELECT x.handle,x.trade_id,x.chain,x.created_at,x.avg_entry_price,x.source,x.entry_tx_id,x.tx_id,t.display_name,t.solana_wallet,t.evm_wallet FROM fomo_trader_trades x JOIN fomo_traders t ON t.handle=x.handle WHERE ${evm?'LOWER(x.token_address)=?':'x.token_address=?'} AND x.created_at BETWEEN ? AND ? ORDER BY x.created_at ASC LIMIT 400`).bind(evm?mint.toLowerCase():mint,after,to));
  return rows.filter(row=>{const raw=s(row.chain);return evm?raw&&normalizeChainKey(raw)===chain:!raw||normalizeChainKey(raw)==='solana';}).map(row=>{const handle=s(row.handle).replace(/^@/,'');return{id:`fomo:${handle.toLowerCase()}:${s(row.trade_id)}`,wallet:evm?s(row.evm_wallet):s(row.solana_wallet),callsign:handle?`@${handle}`:s(row.display_name),callsignSource:'fomoapi.io-retained-handle',time:row.created_at,priceUsd:row.avg_entry_price,txId:s(row.entry_tx_id)||null,source:s(row.source)||'fomoapi.io/trades',sourceKind:'provider-reported'};});
}

async function afterbellRows(db,mint,after,to){
  const native=await all(db.prepare(`SELECT wallet,signature txId,block_time time,source FROM bull_wallet_events WHERE mint=? AND source LIKE 'helius-afterbell-%' AND token_delta>0 AND block_time BETWEEN ? AND ? ORDER BY block_time ASC LIMIT 400`).bind(mint,after,to));
  const chain=await all(db.prepare(`SELECT wallet_address wallet,tx_id txId,block_time time,price_usd priceUsd,source,source_kind sourceKind FROM intelligence_chain_events_v2 WHERE chain_key='solana' AND asset_address=? AND LOWER(side)='buy' AND block_time BETWEEN ? AND ? ORDER BY block_time ASC LIMIT 400`).bind(mint,after,to));
  const rows=[...native.map(row=>({...row,sourceKind:'observed-fact'})),...chain].map(row=>({...row,id:s(row.txId)?`${s(row.txId)}:${s(row.wallet)}`:''}));
  const identities=await retainedIdentityMap(db,rows.map(row=>s(row.wallet)));
  return rows.map(row=>{const identity=identities.get(s(row.wallet));return{...row,callsign:identity?.displayName,callsignSource:identity?.displayNameSource};});
}

export async function readReplayCohort(env={},input={}){
  const room=s(input.room)==='afterbell'?'afterbell':s(input.room)==='fomo'?'fomo':'',chain=normalizeChainKey(room==='afterbell'?'solana':input.chain||'solana'),mint=canonicalChainAddress(chain,s(input.mint)),wallet=canonicalChainAddress(chain,s(input.wallet))||s(input.wallet),after=Math.trunc(n(input.after)),to=Math.trunc(n(input.to))||Math.floor(Date.now()/1000);
  if(!room||!mint||!wallet||!(after>0))return Object.freeze({ok:false,error:'invalid_cohort_subject',room,chain,count:0,wallets:0,items:Object.freeze([])});
  const db=intelligenceDb(env);if(!db)return shapeCohort([],{room,chain,wallet,after,to});
  const rows=room==='fomo'?await fomoRows(db,chain,mint,after,to):await afterbellRows(db,mint,after,to);
  return shapeCohort(rows,{room,chain,wallet,after,to});
}

export async function handleReplayCohortRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!==REPLAY_COHORT_PATH)return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405,'no-store');
  const p=url.searchParams,result=await readReplayCohort(env,{room:p.get('room'),chain:p.get('chain'),mint:p.get('mint'),wallet:p.get('wallet'),after:p.get('after'),to:p.get('to')});
  return json(result,result.ok?200:400,result.ok?undefined:'no-store');
}

export const __replayCohortContract=Object.freeze({path:REPLAY_COHORT_PATH,sameRoomOnly:true,buysAfterFirstPrint:true,excludesSubject:true,followCopyClaimed:false,readOnly:true});
