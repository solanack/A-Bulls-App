/**
 * Afterbell xStock trader ranking.
 * D1-only on navigation: no provider fetches, no invented holders, prices, or PnL.
 * Ranking = unique transactions in the current/most-recent NY after-close window.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { canonicalChainAddress } from './intelligence-chain-registry.mjs';

export const AFTERBELL_TRADERS_PATH='/api/intelligence/afterbell/traders';
export const AFTERBELL_AUDIT_PATH='/api/intelligence/afterbell/audit';
export const AFTERBELL_MAX_TRADERS=50;
export const AFTERBELL_BASIS_LOOKBACK_SECONDS=90*24*60*60;
const ZONE='America/New_York';
const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const finite=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const json=(body,status=200,cache='public, max-age=15, stale-while-revalidate=30')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const all=async stmt=>{try{return(await stmt.all())?.results||[];}catch{return[];}};

const NY_PARTS=new Intl.DateTimeFormat('en-US',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function partsAt(ms){const out={};for(const part of NY_PARTS.formatToParts(new Date(ms)))if(part.type!=='literal')out[part.type]=part.value;return{year:Number(out.year),month:Number(out.month),day:Number(out.day),weekday:String(out.weekday),hour:Number(out.hour),minute:Number(out.minute),second:Number(out.second)};}
function offsetMsAt(ms){const p=partsAt(ms),asUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);return asUtc-Math.trunc(ms/1000)*1000;}
function localToUtcMs({year,month,day,hour,minute=0,second=0}){const localAsUtc=Date.UTC(year,month-1,day,hour,minute,second);let guess=localAsUtc-offsetMsAt(localAsUtc);guess=localAsUtc-offsetMsAt(guess);return guess;}
function ymdAdd(ymd,days){const d=new Date(Date.UTC(ymd.year,ymd.month-1,ymd.day+days));return{year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()};}
function weekday(ymd){return new Date(Date.UTC(ymd.year,ymd.month-1,ymd.day)).getUTCDay();}
const businessDay=ymd=>{const d=weekday(ymd);return d!==0&&d!==6;};
function previousBusinessDay(ymd){let cur=ymdAdd(ymd,-1);while(!businessDay(cur))cur=ymdAdd(cur,-1);return cur;}
function nextBusinessDay(ymd){let cur=ymdAdd(ymd,1);while(!businessDay(cur))cur=ymdAdd(cur,1);return cur;}
function localSeconds(p){return p.hour*3600+p.minute*60+p.second;}

export function afterbellWindow(nowMs=Date.now()){
  const p=partsAt(nowMs),today={year:p.year,month:p.month,day:p.day},clock=localSeconds(p),open=9*3600+30*60,close=16*3600;
  let startDay,endDay,live=false;
  if(businessDay(today)&&clock>=close){startDay=today;endDay=nextBusinessDay(today);live=true;}
  else if(businessDay(today)&&clock<open){startDay=previousBusinessDay(today);endDay=today;live=true;}
  else if(businessDay(today)){startDay=previousBusinessDay(today);endDay=today;live=false;}
  else{startDay=today;while(!businessDay(startDay))startDay=ymdAdd(startDay,-1);endDay=nextBusinessDay(startDay);live=true;}
  const fromMs=localToUtcMs({...startDay,hour:16,minute:0}),scheduledEndMs=localToUtcMs({...endDay,hour:9,minute:30}),toMs=live?Math.min(nowMs,scheduledEndMs):scheduledEndMs;
  return Object.freeze({from:Math.floor(fromMs/1000),to:Math.floor(toMs/1000),scheduledEnd:Math.floor(scheduledEndMs/1000),live,timezone:ZONE,label:'AFTER CLOSE · 4:00 PM → 9:30 AM ET',calendarCoverage:'weekday Wall Street schedule; exchange-holiday exceptions are not inferred'});
}


function walletCallsign(wallet){const value=s(wallet);return value.length>=8?`${value.slice(0,4)}…${value.slice(-4)}`:value||'PUBLIC WALLET';}
function safeAlias(value){const alias=s(value).replace(/^@/,'').slice(0,80);return alias&&alias.toLowerCase()!=='unknown'?alias:null;}
async function retainedIdentityMap(db,wallets=[]){
  const unique=[...new Set(wallets.map(s).filter(Boolean))];const map=new Map(unique.map(wallet=>[wallet,{displayName:walletCallsign(wallet),displayNameSource:'wallet-callsign'}]));
  if(!unique.length)return map;const placeholders=unique.map(()=>'?').join(',');
  const fomo=await all(db.prepare(`SELECT solana_wallet wallet,handle,display_name,captured_at FROM fomo_traders WHERE solana_wallet IN (${placeholders}) ORDER BY captured_at DESC,current_rank ASC`).bind(...unique));
  for(const row of fomo){const wallet=s(row.wallet);if(!wallet||map.get(wallet)?.displayNameSource!=='wallet-callsign')continue;const handle=safeAlias(row.handle),name=safeAlias(row.display_name);if(handle||name)map.set(wallet,{displayName:handle?`@${handle}`:name,displayNameSource:'fomoapi.io-retained-handle'});}
  const indexed=await all(db.prepare(`SELECT wallet,title,payload_json,source_kind,updated_at FROM research_index_objects WHERE kind='star' AND visibility='public' AND wallet IN (${placeholders}) ORDER BY updated_at DESC`).bind(...unique));
  for(const row of indexed){const wallet=s(row.wallet),current=map.get(wallet);if(!wallet||!current||current.displayNameSource!=='wallet-callsign')continue;let payload={};try{payload=JSON.parse(s(row.payload_json)||'{}');}catch{}const alias=safeAlias(payload?.authorizedHandle??payload?.handle??payload?.displayName??payload?.alias??row.title);if(alias&&!/^wallet\b/i.test(alias))map.set(wallet,{displayName:alias.startsWith('@')?alias:`@${alias}`,displayNameSource:`research-index:${s(row.source_kind)||'retained'}`});}
  return map;
}

function eventKey(event){const tx=s(event.txId);return tx?`${tx}:${s(event.mint)}`:[s(event.wallet),s(event.mint),n(event.blockTime),s(event.side),n(event.amount),s(event.source)].join(':');}
export function normalizeAfterbellEvents(rows=[]){
  const byKey=new Map();
  for(const raw of Array.isArray(rows)?rows:[]){
    const wallet=canonicalChainAddress('solana',s(raw.wallet)),mint=canonicalChainAddress('solana',s(raw.mint)),side=s(raw.side).toLowerCase(),amount=Math.abs(n(raw.amount)),blockTime=Math.trunc(n(raw.blockTime)),txId=s(raw.txId)||null,priceUsd=finite(raw.priceUsd),priceSol=finite(raw.priceSol),sourceKind=s(raw.sourceKind)||'provider-reported';
    if(!wallet||!mint||!['buy','sell'].includes(side)||!amount||!blockTime)continue;
    const event=Object.freeze({wallet,mint,side,amount,blockTime,txId,priceUsd:priceUsd!=null&&priceUsd>0?Math.abs(priceUsd):null,priceSol:priceSol!=null&&priceSol>0?Math.abs(priceSol):null,source:s(raw.source)||'indexed-d1',sourceKind});
    const key=eventKey(event),prior=byKey.get(key);
    if(!prior||prior.sourceKind!=='observed-fact'&&event.sourceKind==='observed-fact')byKey.set(key,event);
  }
  return [...byKey.values()].sort((a,b)=>a.blockTime-b.blockTime||String(a.txId??'').localeCompare(String(b.txId??'')));
}

function realizedForUnit(events,from,to,unit){
  const lots=[],unitKey=unit==='usd'?'priceUsd':'priceSol';let realized=0,closedQty=0,hasSell=false,complete=true;
  for(const event of events){
    if(event.side==='buy'){lots.push({qty:event.amount,cost:event[unitKey]});continue;}
    if(event.blockTime<from||event.blockTime>to)continue;
    hasSell=true;let remaining=event.amount;const sellPrice=event[unitKey];if(sellPrice==null)complete=false;
    while(remaining>1e-12&&lots.length){
      const lot=lots[0],matched=Math.min(remaining,lot.qty);if(sellPrice==null||lot.cost==null)complete=false;else{realized+=(sellPrice-lot.cost)*matched;closedQty+=matched;}
      lot.qty-=matched;remaining-=matched;if(lot.qty<=1e-12)lots.shift();
    }
    if(remaining>1e-12)complete=false;
  }
  return hasSell&&complete&&closedQty>0?realized:null;
}

export function rankAfterbellTraders(events=[],{from,to,limit=AFTERBELL_MAX_TRADERS}={}){
  const start=Math.trunc(n(from)),end=Math.trunc(n(to)),cap=Math.max(1,Math.min(AFTERBELL_MAX_TRADERS,Math.trunc(n(limit)||AFTERBELL_MAX_TRADERS))),normalized=normalizeAfterbellEvents(events),byWallet=new Map();
  for(const event of normalized){
    if(event.blockTime<start||event.blockTime>end)continue;
    const row=byWallet.get(event.wallet)||{wallet:event.wallet,txIds:new Set(),eventCount:0,buyCount:0,sellCount:0,lastObservedAt:0,sources:new Set(),sourceKinds:new Set(),mints:new Set(),trades:[]};
    row.txIds.add(event.txId||eventKey(event));row.eventCount++;if(event.side==='buy')row.buyCount++;else row.sellCount++;row.lastObservedAt=Math.max(row.lastObservedAt,event.blockTime);row.sources.add(event.source);row.sourceKinds.add(event.sourceKind);row.mints.add(event.mint);row.trades.push(event);byWallet.set(event.wallet,row);
  }
  const result=[];
  for(const row of byWallet.values()){
    const walletEvents=normalized.filter(event=>event.wallet===row.wallet&&event.blockTime<=end),windowTrades=row.trades.filter(event=>event.blockTime>=start&&event.blockTime<=end);
    const perMint=[...row.mints].map(mint=>walletEvents.filter(event=>event.mint===mint));
    const pnlFor=unit=>{let total=0,has=false;for(const mintEvents of perMint){const value=realizedForUnit(mintEvents,start,end,unit),hasSell=mintEvents.some(event=>event.side==='sell'&&event.blockTime>=start&&event.blockTime<=end);if(hasSell&&value==null)return null;if(value!=null){total+=value;has=true;}}return has?total:null;};
    const latestTrades=windowTrades.slice().sort((a,b)=>b.blockTime-a.blockTime||String(a.txId??'').localeCompare(String(b.txId??''))).slice(0,3).map(event=>Object.freeze({mint:event.mint,txId:event.txId,side:event.side,amount:event.amount,blockTime:event.blockTime,priceUsd:event.priceUsd,priceSol:event.priceSol,source:event.source,sourceKind:event.sourceKind}));
    const mostTraded=[...row.mints].map(mint=>{const trades=windowTrades.filter(event=>event.mint===mint),txIds=new Set(trades.map(event=>event.txId||eventKey(event)));return Object.freeze({mint,uniqueAfterCloseTxCount:txIds.size,eventCount:trades.length,lastObservedAt:trades.reduce((max,event)=>Math.max(max,event.blockTime),0)*1000});}).sort((a,b)=>b.uniqueAfterCloseTxCount-a.uniqueAfterCloseTxCount||b.eventCount-a.eventCount||a.mint.localeCompare(b.mint));
    const holdings=[...row.mints].map(mint=>{const retained=walletEvents.filter(event=>event.mint===mint),observedNetAmount=retained.reduce((sum,event)=>sum+(event.side==='buy'?event.amount:-event.amount),0),lastObservedAt=retained.reduce((max,event)=>Math.max(max,event.blockTime),0)*1000;return Object.freeze({mint,observedNetAmount,lastObservedAt,sourceKind:'retained-observed-flow'});}).filter(item=>item.observedNetAmount>1e-12).sort((a,b)=>b.observedNetAmount-a.observedNetAmount||b.lastObservedAt-a.lastObservedAt||a.mint.localeCompare(b.mint)).slice(0,10);
    result.push(Object.freeze({wallet:row.wallet,transactionCount:row.txIds.size,uniqueAfterCloseTxCount:row.txIds.size,eventCount:row.eventCount,buyCount:row.buyCount,sellCount:row.sellCount,assetCount:row.mints.size,mints:Object.freeze([...row.mints]),holdings:Object.freeze(holdings),mostTraded:Object.freeze(mostTraded.slice(0,10)),latestTrades:Object.freeze(latestTrades),realizedPnlUsd:pnlFor('usd'),realizedPnlSol:pnlFor('sol'),lastObservedAt:row.lastObservedAt*1000,sourceKind:row.sourceKinds.has('observed-fact')?'observed':'provider-reported',sources:Object.freeze([...row.sources])}));
  }
  result.sort((a,b)=>b.uniqueAfterCloseTxCount-a.uniqueAfterCloseTxCount||a.wallet.localeCompare(b.wallet));
  return Object.freeze(result.slice(0,cap).map((row,index)=>Object.freeze({rank:index+1,...row})));
}

async function readRows(db,mint,from,to){
  const lookback=Math.max(0,from-AFTERBELL_BASIS_LOOKBACK_SECONDS),rows=[];
  const chain=await all(db.prepare(`SELECT wallet_address wallet,asset_address mint,tx_id txId,LOWER(side) side,ABS(COALESCE(amount,0)) amount,price_usd priceUsd,NULL priceSol,block_time blockTime,source,source_kind sourceKind FROM intelligence_chain_events_v2 WHERE chain_key='solana' AND asset_address=? AND block_time BETWEEN ? AND ? AND wallet_address IS NOT NULL AND LOWER(side) IN ('buy','sell') ORDER BY block_time ASC LIMIT 10000`).bind(mint,lookback,to));rows.push(...chain);
  const native=await all(db.prepare(`SELECT ? mint,wallet,signature txId,CASE WHEN token_delta>0 THEN 'buy' ELSE 'sell' END side,ABS(token_delta) amount,NULL priceUsd,CASE WHEN ABS(token_delta)>0 AND ABS(sol_delta)>0 THEN ABS(sol_delta/token_delta) ELSE NULL END priceSol,block_time blockTime,source,'observed-fact' sourceKind FROM bull_wallet_events WHERE mint=? AND block_time BETWEEN ? AND ? AND wallet IS NOT NULL AND token_delta<>0 ORDER BY block_time ASC LIMIT 10000`).bind(mint,mint,lookback,to));rows.push(...native);return rows;
}

export async function readAfterbellTraders(env={},mintInput='',options={}){
  const db=intelligenceDb(env),rawMints=Array.isArray(mintInput)?mintInput:String(mintInput||'').split(','),mints=[...new Set(rawMints.map(value=>canonicalChainAddress('solana',s(value))).filter(Boolean))].slice(0,50);
  if(!mints.length)return Object.freeze({ok:false,coverage:'empty',error:'invalid_xstock_mint',mint:'',mints:[],items:[],disclosure:'At least one valid Solana xStock mint is required. No trader list was invented.'});
  if(!db)return Object.freeze({ok:false,coverage:'degraded',error:'database_unavailable',mint:mints.length===1?mints[0]:'',mints,items:[],disclosure:'The Intelligence D1 binding is unavailable. No trader list or PnL was invented.'});
  const window=options.from&&options.to?Object.freeze({from:Math.trunc(n(options.from)),to:Math.trunc(n(options.to)),scheduledEnd:Math.trunc(n(options.to)),live:false,timezone:ZONE,label:'CUSTOM AFTERBELL WINDOW',calendarCoverage:'caller supplied'}):afterbellWindow(options.nowMs);
  const groups=await Promise.all(mints.map(mint=>readRows(db,mint,window.from,window.to))),rows=groups.flat(),ranked=rankAfterbellTraders(rows,{from:window.from,to:window.to,limit:options.limit}),identities=await retainedIdentityMap(db,ranked.map(item=>item.wallet)),items=Object.freeze(ranked.map(item=>Object.freeze({...item,...(identities.get(item.wallet)||{displayName:walletCallsign(item.wallet),displayNameSource:'wallet-callsign'})})));
  return Object.freeze({ok:true,coverage:items.length?'fresh':'empty',mint:mints.length===1?mints[0]:'',mints,window,items,method:'afterbell-cross-xstock-unique-retained-after-close-transactions-v3',disclosure:items.length?'Rank is based only on unique retained after-close transactions across the requested xStock universe. Display names use a retained authorized handle/alias when available, otherwise a deterministic wallet callsign. Holdings and most-traded assets describe bounded retained evidence only; missing history stays unavailable. No identity, skill, ownership, brokerage, or recommendation claim is made.':'No retained xStock wallet trades are indexed across the requested Afterbell universe in this window. Empty coverage stays empty; no trader, identity, holding, or PnL was invented.'});
}

export async function readAfterbellAudit(env={},options={}){
  const db=intelligenceDb(env);if(!db)return Object.freeze({ok:false,coverage:'degraded',error:'database_unavailable'});
  const window=afterbellWindow(options.nowMs),summary=await db.prepare(`SELECT COUNT(*) eventCount,COUNT(DISTINCT wallet) walletCount,COUNT(DISTINCT signature) transactionCount,COUNT(DISTINCT mint) assetCount,MAX(block_time) latestBlockTime FROM bull_wallet_events WHERE source LIKE 'helius-afterbell-%' AND block_time BETWEEN ? AND ?`).bind(window.from,window.to).first().catch(()=>null),assets=await all(db.prepare(`SELECT mint,COUNT(*) eventCount,COUNT(DISTINCT wallet) walletCount,COUNT(DISTINCT signature) transactionCount,MAX(block_time) latestBlockTime FROM bull_wallet_events WHERE source LIKE 'helius-afterbell-%' AND block_time BETWEEN ? AND ? GROUP BY mint ORDER BY transactionCount DESC,latestBlockTime DESC LIMIT 20`).bind(window.from,window.to)),sourceHealth=await db.prepare(`SELECT source,source_kind,state,last_ok_at,last_error_at,details_json,updated_at FROM intelligence_source_health WHERE source='afterbell-xstock-history' LIMIT 1`).first().catch(()=>null);
  const counts=Object.freeze({events:n(summary?.eventCount),wallets:n(summary?.walletCount),transactions:n(summary?.transactionCount),assets:n(summary?.assetCount),latestBlockTime:n(summary?.latestBlockTime)||null});
  return Object.freeze({ok:true,coverage:counts.events?'fresh':'empty',window,counts,assets:Object.freeze(assets),sourceHealth:sourceHealth||null,disclosure:counts.events?'Afterbell audit counts retained signer-owned swap-like xStock observations from the bounded archive collector.':'No retained observations from the Afterbell archive collector exist in this window yet. This is unavailable coverage, not zero market activity.'});
}
export async function handleAfterbellTradersRequest(request,env={}){
  const url=new URL(request.url);if(![AFTERBELL_TRADERS_PATH,AFTERBELL_AUDIT_PATH].includes(url.pathname))return null;if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405,'no-store');if(url.pathname===AFTERBELL_AUDIT_PATH)return json(await readAfterbellAudit(env),200,'public, max-age=15, stale-while-revalidate=30');const mint=s(url.searchParams.get('mints')||url.searchParams.get('mint')),limit=Math.max(1,Math.min(AFTERBELL_MAX_TRADERS,Math.trunc(n(url.searchParams.get('limit'))||AFTERBELL_MAX_TRADERS))),from=finite(url.searchParams.get('from')),to=finite(url.searchParams.get('to')),body=await readAfterbellTraders(env,mint,{limit,from,to}),status=body.error==='invalid_xstock_mint'?400:body.error==='database_unavailable'?503:200;return json(body,status,status===200?'public, max-age=15, stale-while-revalidate=30':'no-store');
}
