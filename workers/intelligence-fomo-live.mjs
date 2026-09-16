/* Self-populating Fomo research cache.
 * Scheduled only: public page reads remain D1-only. Fomo values stay explicitly
 * provider-reported and never become execution/copy-trading instructions.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { providerFetch } from './intelligence-fetch.mjs';
import { reserveProviderCredits } from './intelligence-provider-budget.mjs';
import { normalizeFomoLeaderboard } from './intelligence-fomo-galaxy.mjs';

const API_ROOT='https://api.fomoapi.io/v2';
const TRADER_PATH='/api/intelligence/fomo/trader';
const GALAXY_PATH='/api/intelligence/fomo/galaxy';
const SOLANA_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finite=value=>{if(value==null||value==='')return null;if(typeof value==='number')return Number.isFinite(value)?value:null;if(typeof value==='object')return null;const cleaned=s(value).replace(/[$,%\s,]/g,'').replace(/^\+/,'');const parsed=Number(cleaned);return Number.isFinite(parsed)?parsed:null;};
const firstFinite=(...values)=>{for(const value of values){const parsed=finite(value);if(parsed!=null)return parsed;}return null;};
const bool=value=>s(value).toLowerCase()==='true';
const clamp=(value,fallback,min,max)=>Math.max(min,Math.min(max,Math.trunc(n(value)||fallback)));
const all=async stmt=>{try{return(await stmt.all())?.results||[];}catch{return[];}};
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const parseMs=value=>{const time=Date.parse(s(value));return Number.isFinite(time)?time:null;};
const parseSec=value=>{const ms=parseMs(value);return ms==null?null:Math.floor(ms/1000);};

async function apiJson(env,path,credits=1){
  const key=s(env.FOMOAPI_API_KEY);if(!key)throw new Error('fomoapi_unconfigured');
  const reservation=await reserveProviderCredits(env,credits,'fomoapi');if(reservation.blocked)throw new Error('fomoapi_budget_blocked');
  const response=await providerFetch(`${API_ROOT}${path}`,{headers:{accept:'application/json',authorization:`Bearer ${key}`}});
  if(!response.ok)throw new Error(response.status===402?'fomoapi_credits_exhausted':`fomoapi_http_${response.status}`);
  return response.json();
}
function payloadArray(payload,...keys){for(const key of keys){const value=key.split('.').reduce((obj,part)=>obj?.[part],payload);if(Array.isArray(value))return value;}return Array.isArray(payload)?payload:[];}
export function fomoLeaderboardPnl(row={}){return firstFinite(row?.pnlUsd,row?.pnl_usd,row?.totalPnl,row?.total_pnl,row?.pnlAllTime,row?.pnl_all_time,row?.allTimePnl,row?.all_time_pnl,row?.realizedPnlUsd,row?.realized_pnl_usd,row?.realizedPnl,row?.realized_pnl,row?.profit,row?.pnl,typeof row?.pnl==='object'?row.pnl?.all:null,typeof row?.pnl==='object'?row.pnl?.allTime:null,typeof row?.pnl==='object'?row.pnl?.all_time:null,typeof row?.pnl==='object'?row.pnl?.total:null,row?.performance?.pnl,row?.performance?.all?.pnl,row?.performance?.allTime?.pnl,row?.performance?.all_time?.pnl,row?.metrics?.pnl,row?.stats?.pnl);}
export function normalizeFomoLiveLeaderboard(payload,capturedAt=Date.now()){
  const source=payloadArray(payload,'traders','data.traders','leaderboard','data.leaderboard','items','data.items','results','data.results','data');
  const reportedAt=parseMs(payload?.capturedAt??payload?.data?.capturedAt)??capturedAt;
  const prepared=source.map(row=>{const pnl=fomoLeaderboardPnl(row);return pnl==null?row:{...row,pnl};});
  return normalizeFomoLeaderboard(prepared,reportedAt);
}
export function normalizeFomoHoldings(payload,capturedAt=Date.now()){
  return payloadArray(payload,'holdings','data.holdings','balances','data.balances').flatMap(item=>{
    const token=item?.token&&typeof item.token==='object'?item.token:{};
    const address=s(token.address??item?.tokenAddress??item?.address);if(!address)return[];
    const valueUsd=finite(item?.valueUsd??item?.value_usd),amount=finite(item?.amount??item?.balance),priceUsd=finite(item?.priceUsd??item?.price_usd);
    return [{tokenAddress:address,symbol:s(token.symbol??item?.symbol).slice(0,32)||null,name:s(token.name??item?.name).slice(0,120)||null,chain:s(item?.chain??token?.chain).slice(0,32)||null,networkId:s(token.networkId??item?.networkId??item?.network_id).slice(0,32)||null,amount,priceUsd,valueUsd,change24h:finite(item?.change24h??item?.change_24h),capturedAt}];
  }).sort((a,b)=>n(b.valueUsd)-n(a.valueUsd)).slice(0,10).map((item,index)=>({...item,rank:index+1}));
}
export function normalizeFomoTrades(payload,capturedAt=Date.now()){
  return payloadArray(payload,'trades','data.trades','items','data.items','results','data.results','data').flatMap((item,index)=>{
    const token=item?.token&&typeof item.token==='object'?item.token:{};const address=s(token.address??item?.tokenAddress??item?.token_address);if(!address)return[];
    const createdAt=parseSec(item?.createdAt??item?.openedAt??item?.created_at),closedAt=parseSec(item?.closedAt??item?.closed_at);
    return [{tradeId:s(item?.tradeId??item?.id??`${address}:${createdAt??capturedAt}:${index}`).slice(0,180),tokenAddress:address,symbol:s(token.symbol??item?.symbol).slice(0,32)||null,chain:s(item?.chain??token?.chain).slice(0,32)||null,status:s(item?.status).toLowerCase()==='closed'?'closed':'open',amount:finite(item?.amount),avgEntryPrice:finite(item?.avgEntryPrice??item?.avg_entry_price),avgExitPrice:finite(item?.avgExitPrice??item?.avg_exit_price),realizedPnlUsd:finite(item?.realizedPnlUsd??item?.realized_pnl_usd),unrealizedPnlUsd:finite(item?.unrealizedPnlUsd??item?.unrealized_pnl_usd),createdAt,closedAt,capturedAt}];
  }).sort((a,b)=>Math.max(n(b.closedAt),n(b.createdAt))-Math.max(n(a.closedAt),n(a.createdAt))).slice(0,25);
}

async function storeLeaderboard(db,items,now){
  for(const item of items)await db.prepare(`INSERT INTO fomo_traders(handle,current_rank,display_name,reported_pnl_usd,reported_volume_usd,reported_trade_count,follower_count,solana_wallet,evm_wallet,top_tokens_json,profile_picture_url,captured_at,source,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(handle) DO UPDATE SET current_rank=excluded.current_rank,display_name=excluded.display_name,reported_pnl_usd=excluded.reported_pnl_usd,reported_volume_usd=excluded.reported_volume_usd,reported_trade_count=excluded.reported_trade_count,follower_count=excluded.follower_count,solana_wallet=COALESCE(excluded.solana_wallet,fomo_traders.solana_wallet),evm_wallet=COALESCE(excluded.evm_wallet,fomo_traders.evm_wallet),top_tokens_json=CASE WHEN excluded.top_tokens_json<>'[]' THEN excluded.top_tokens_json ELSE fomo_traders.top_tokens_json END,profile_picture_url=COALESCE(excluded.profile_picture_url,fomo_traders.profile_picture_url),captured_at=excluded.captured_at,source=excluded.source,updated_at=excluded.updated_at`).bind(item.handle,item.rank,item.displayName,item.reportedPnlUsd,item.reportedVolumeUsd,item.reportedTradeCount,item.followerCount,item.solanaWallet,item.evmWallet,JSON.stringify(item.topTokens),item.profilePictureUrl,Math.floor(item.capturedAt/1000),item.source,now).run();
  await db.prepare('DELETE FROM fomo_traders WHERE captured_at<?').bind(now-7*86400).run();
}
async function storeHoldings(db,handle,holdings,now){
  await db.prepare('DELETE FROM fomo_trader_positions WHERE handle=?').bind(handle).run();
  for(const item of holdings)await db.prepare(`INSERT INTO fomo_trader_positions(handle,position_rank,token_address,symbol,name,chain,network_id,amount,price_usd,value_usd,change_24h,captured_at,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(handle,item.rank,item.tokenAddress,item.symbol,item.name,item.chain,item.networkId,item.amount,item.priceUsd,item.valueUsd,item.change24h,now,'fomoapi.io/balances').run();
}
async function storeTrades(db,handle,trades,now){
  for(const item of trades)await db.prepare(`INSERT INTO fomo_trader_trades(handle,trade_id,token_address,symbol,chain,status,amount,avg_entry_price,avg_exit_price,realized_pnl_usd,unrealized_pnl_usd,created_at,closed_at,captured_at,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(handle,trade_id) DO UPDATE SET token_address=excluded.token_address,symbol=excluded.symbol,chain=excluded.chain,status=excluded.status,amount=excluded.amount,avg_entry_price=excluded.avg_entry_price,avg_exit_price=excluded.avg_exit_price,realized_pnl_usd=excluded.realized_pnl_usd,unrealized_pnl_usd=excluded.unrealized_pnl_usd,created_at=excluded.created_at,closed_at=excluded.closed_at,captured_at=excluded.captured_at,source=excluded.source`).bind(handle,item.tradeId,item.tokenAddress,item.symbol,item.chain,item.status,item.amount,item.avgEntryPrice,item.avgExitPrice,item.realizedPnlUsd,item.unrealizedPnlUsd,item.createdAt,item.closedAt,now,'fomoapi.io/trades').run();
  await db.prepare('DELETE FROM fomo_trader_trades WHERE handle=? AND captured_at<?').bind(handle,now-30*86400).run();
}
async function enrichTrader(env,db,handle,now){
  try{
    const [balances,trades]=await Promise.all([apiJson(env,`/users/${encodeURIComponent(handle)}/balances`,1),apiJson(env,`/users/${encodeURIComponent(handle)}/trades?limit=25`,1)]);
    const holdings=normalizeFomoHoldings(balances,now*1000),history=normalizeFomoTrades(trades,now*1000);
    if(balances?.available!==false)await storeHoldings(db,handle,holdings,now);
    if(trades?.available!==false)await storeTrades(db,handle,history,now);
    await db.prepare(`INSERT INTO fomo_enrichment_state(handle,last_positions_at,last_trades_at,last_error,updated_at) VALUES(?,?,?,NULL,?) ON CONFLICT(handle) DO UPDATE SET last_positions_at=excluded.last_positions_at,last_trades_at=excluded.last_trades_at,last_error=NULL,updated_at=excluded.updated_at`).bind(handle,now,now,now).run();
    return {handle,holdings:holdings.length,trades:history.length};
  }catch(error){const message=s(error?.message||error);await db.prepare(`INSERT INTO fomo_enrichment_state(handle,last_error,updated_at) VALUES(?,?,?) ON CONFLICT(handle) DO UPDATE SET last_error=excluded.last_error,updated_at=excluded.updated_at`).bind(handle,message,now).run().catch(()=>null);console.error('[fomo-enrich]',handle,message);return {handle,error:message};}
}

export async function refreshFomoLive(env={},nowMs=Date.now()){
  if(!bool(env.FOMO_GALAXY_ENABLED))return Object.freeze({enabled:false});const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const now=Math.floor(nowMs/1000),key=s(env.FOMOAPI_API_KEY),refreshMinutes=clamp(env.FOMO_REFRESH_MINUTES,180,60,1440);
  if(!key){await db.prepare(`INSERT INTO fomo_sync_state(id,last_error,updated_at) VALUES(1,'fomoapi_unconfigured',?) ON CONFLICT(id) DO UPDATE SET last_error='fomoapi_unconfigured',updated_at=excluded.updated_at`).bind(now).run().catch(()=>null);return Object.freeze({enabled:true,configured:false,error:'fomoapi_unconfigured'});}
  const state=await db.prepare('SELECT last_fetch_at,last_success_at FROM fomo_sync_state WHERE id=1').first().catch(()=>null);
  if(n(state?.last_fetch_at)&&now-n(state.last_fetch_at)<refreshMinutes*60)return Object.freeze({enabled:true,configured:true,skipped:'fresh-cache',lastSuccessAt:n(state?.last_success_at)||null});
  await db.prepare(`INSERT INTO fomo_sync_state(id,last_fetch_at,last_error,updated_at) VALUES(1,?,NULL,?) ON CONFLICT(id) DO UPDATE SET last_fetch_at=excluded.last_fetch_at,last_error=NULL,updated_at=excluded.updated_at`).bind(now,now).run();
  try{
    const payload=await apiJson(env,'/leaderboard/all?limit=50',1),items=normalizeFomoLiveLeaderboard(payload,nowMs);if(!items.length)throw new Error('fomoapi_empty_leaderboard');await storeLeaderboard(db,items,now);
    const positionCount=n((await db.prepare('SELECT COUNT(*) count FROM fomo_trader_positions').first().catch(()=>null))?.count),limit=positionCount===0?clamp(env.FOMO_BOOTSTRAP_ENRICH_LIMIT,10,0,10):clamp(env.FOMO_ENRICH_TRADERS_PER_REFRESH,1,0,2);
    const targets=limit?await all(db.prepare(`SELECT t.handle FROM fomo_traders t LEFT JOIN fomo_enrichment_state e ON e.handle=t.handle WHERE t.current_rank BETWEEN 1 AND 10 ORDER BY CASE WHEN e.last_positions_at IS NULL THEN 0 ELSE 1 END,COALESCE(e.last_positions_at,0),t.current_rank LIMIT ?`).bind(limit)):[];
    const enriched=[];for(const row of targets){const handle=s(row.handle);if(handle)enriched.push(await enrichTrader(env,db,handle,now));}
    await db.prepare(`INSERT INTO fomo_sync_state(id,last_fetch_at,last_success_at,last_error,updated_at) VALUES(1,?,?,NULL,?) ON CONFLICT(id) DO UPDATE SET last_fetch_at=excluded.last_fetch_at,last_success_at=excluded.last_success_at,last_error=NULL,updated_at=excluded.updated_at`).bind(now,now,now).run();
    return Object.freeze({enabled:true,configured:true,items:items.length,enriched,capturedAt:now});
  }catch(error){const message=s(error?.message||error);await db.prepare('UPDATE fomo_sync_state SET last_error=?,updated_at=? WHERE id=1').bind(message,now).run().catch(()=>null);throw error;}
}

function rowToTrader(row){let topTokens=[];try{topTokens=JSON.parse(s(row.top_tokens_json)||'[]');if(!Array.isArray(topTokens))topTokens=[];}catch{}return{rank:n(row.current_rank),handle:s(row.handle),displayName:s(row.display_name)||s(row.handle),reportedPnlUsd:finite(row.reported_pnl_usd),reportedVolumeUsd:finite(row.reported_volume_usd),reportedTradeCount:finite(row.reported_trade_count),followerCount:finite(row.follower_count),solanaWallet:s(row.solana_wallet)||null,evmWallet:s(row.evm_wallet)||null,avatarUrl:s(row.profile_picture_url)||null,coverPhotoUrl:s(row.cover_photo_url)||null,thumbhash:s(row.thumbhash)||null,topTokens,capturedAt:n(row.captured_at)*1000,source:'fomoapi.io'};}
async function observedPositions(db,wallet){if(!SOLANA_RE.test(wallet))return[];const rows=await all(db.prepare(`SELECT mint,COUNT(*) event_count,SUM(CASE WHEN event_class='swap-like' THEN 1 ELSE 0 END) trade_count,SUM(COALESCE(token_delta,0)) observed_net_token_flow,MAX(block_time) last_observed_at FROM bull_wallet_events WHERE wallet=? AND mint IS NOT NULL AND mint<>'' GROUP BY mint ORDER BY trade_count DESC,ABS(observed_net_token_flow) DESC,last_observed_at DESC LIMIT 30`).bind(wallet));return rows.filter(row=>SOLANA_RE.test(s(row.mint))).map(row=>({mint:s(row.mint),symbol:null,name:null,chain:'solana',networkId:'solana',sourceKind:'a-bulls-observed',amount:null,priceUsd:null,valueUsd:null,change24h:null,observedNetTokenFlow:n(row.observed_net_token_flow),tradeCount:n(row.trade_count),eventCount:n(row.event_count),lastObservedAt:n(row.last_observed_at)*1000}));}
async function observedTrades(db,wallet){if(!SOLANA_RE.test(wallet))return[];let rows=await all(db.prepare(`SELECT mint,side,token_amount,sol_amount,block_time,signature,source FROM pump_trades WHERE wallet=? AND mint IS NOT NULL AND side IN ('buy','sell') ORDER BY block_time DESC,event_id DESC LIMIT 3`).bind(wallet));if(!rows.length)rows=(await all(db.prepare(`SELECT mint,token_delta,sol_delta,block_time,signature,source FROM bull_wallet_events WHERE wallet=? AND mint IS NOT NULL AND mint<>'' AND token_delta<>0 AND sol_delta<>0 ORDER BY block_time DESC,id DESC LIMIT 3`).bind(wallet))).map(row=>({...row,side:n(row.token_delta)>0?'buy':'sell',token_amount:Math.abs(n(row.token_delta)),sol_amount:Math.abs(n(row.sol_delta))}));return rows.filter(row=>SOLANA_RE.test(s(row.mint))).map(row=>({signature:s(row.signature)||null,wallet,mint:s(row.mint),side:s(row.side)==='sell'?'sell':'buy',solAmount:Math.abs(n(row.sol_amount)),tokenAmount:Math.abs(n(row.token_amount)),priceSol:n(row.token_amount)>0?Math.abs(n(row.sol_amount))/Math.abs(n(row.token_amount)):null,priceUsd:null,status:null,realizedPnlUsd:null,unrealizedPnlUsd:null,observedAt:n(row.block_time)*1000,source:s(row.source)||'indexed-d1',sourceKind:'a-bulls-observed'}));}

export async function handleFomoLiveRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!==TRADER_PATH&&url.pathname!==GALAXY_PATH)return null;if(request.method!=='GET')return null;const db=intelligenceDb(env);if(!db)return null;
  if(url.pathname===GALAXY_PATH){const count=n((await db.prepare('SELECT COUNT(*) count FROM fomo_traders').first().catch(()=>null))?.count);if(count>0)return null;const state=await db.prepare('SELECT last_success_at,last_error,updated_at FROM fomo_sync_state WHERE id=1').first().catch(()=>null),error=s(state?.last_error);return json({ok:true,coverage:error?'degraded':'empty',items:[],source:'fomoapi.io',capturedAt:null,disclosure:error==='fomoapi_unconfigured'?'Fomo Galaxy is ready but its FOMOAPI_API_KEY Worker secret is not connected. No leaderboard was fabricated or scraped from a logged-in session.':error?`Fomo Galaxy is waiting for its scheduled source refresh (${error}). No leaderboard was fabricated.`:'Fomo Galaxy has not completed its first scheduled source refresh yet.',error:error||undefined,configuration:{providerConfigured:Boolean(s(env.FOMOAPI_API_KEY)),scheduled:true,lastSuccessAt:n(state?.last_success_at)?n(state.last_success_at)*1000:null}},200,'public, max-age=30');}
  const handle=s(url.searchParams.get('handle')).replace(/^@/,'');if(!handle)return null;const traderRow=await db.prepare('SELECT * FROM fomo_traders WHERE handle=? COLLATE NOCASE LIMIT 1').bind(handle).first().catch(()=>null);if(!traderRow)return null;
  const positionRows=await all(db.prepare('SELECT * FROM fomo_trader_positions WHERE handle=? COLLATE NOCASE ORDER BY position_rank ASC,value_usd DESC LIMIT 10').bind(handle)),tradeRows=await all(db.prepare('SELECT * FROM fomo_trader_trades WHERE handle=? COLLATE NOCASE ORDER BY MAX(COALESCE(closed_at,0),COALESCE(created_at,0)) DESC LIMIT 10').bind(handle));if(!positionRows.length&&!tradeRows.length)return null;
  const trader=rowToTrader(traderRow),observed=await observedPositions(db,trader.solanaWallet||''),byMint=new Map();
  for(const row of positionRows){const mint=s(row.token_address);if(!mint)continue;byMint.set(mint,{mint,symbol:s(row.symbol)||null,name:s(row.name)||null,chain:s(row.chain)||null,networkId:s(row.network_id)||null,sourceKind:'fomo-reported',amount:finite(row.amount),priceUsd:finite(row.price_usd),valueUsd:finite(row.value_usd),change24h:finite(row.change_24h),observedNetTokenFlow:null,tradeCount:null,eventCount:null,lastObservedAt:n(row.captured_at)*1000});}
  for(const item of observed){const prior=byMint.get(item.mint);byMint.set(item.mint,prior?{...item,...prior,sourceKind:'fomo-reported+a-bulls-observed',observedNetTokenFlow:item.observedNetTokenFlow,tradeCount:item.tradeCount,eventCount:item.eventCount,lastObservedAt:Math.max(n(prior.lastObservedAt),n(item.lastObservedAt))}:item);}
  const positions=[...byMint.values()].sort((a,b)=>n(b.valueUsd)-n(a.valueUsd)||n(b.tradeCount)-n(a.tradeCount)||n(b.lastObservedAt)-n(a.lastObservedAt)).slice(0,10).map((item,index)=>({...item,rank:index+1}));
  const providerTrades=tradeRows.map(row=>{const closed=n(row.closed_at),created=n(row.created_at),isExit=closed>0&&closed>=created,observedAt=(isExit?closed:created)*1000;return{signature:null,wallet:trader.solanaWallet??trader.evmWallet??trader.handle,mint:s(row.token_address),side:isExit?'sell':'buy',solAmount:0,tokenAmount:Math.abs(n(row.amount)),priceSol:null,priceUsd:finite(isExit?row.avg_exit_price:row.avg_entry_price),status:s(row.status)||null,realizedPnlUsd:finite(row.realized_pnl_usd),unrealizedPnlUsd:finite(row.unrealized_pnl_usd),observedAt,source:'fomoapi.io/trades',sourceKind:'fomo-reported-position-event'};}).filter(item=>item.mint&&item.observedAt>0);
  const latestTrades=[...providerTrades,...await observedTrades(db,trader.solanaWallet||'')].sort((a,b)=>b.observedAt-a.observedAt).slice(0,3);
  return json({ok:true,coverage:positions.length||latestTrades.length?'partial':'empty',trader,positions,latestTrades,source:'fomoapi.io + a-bulls-indexed-public-chain',disclosure:'Top positions are cached Fomo-reported holdings when available and are kept separate from A Bulls App observed public-chain activity. Latest events may be Fomo-reported position entries/exits or independently indexed chain trades; sourceKind identifies which. This is research context, not copy trading or an execution signal.'},200,'public, max-age=60, stale-while-revalidate=180');
}

export const __fomoLiveContract=Object.freeze({leaderboardPath:'/leaderboard/all?limit=50',maximumTraders:50,maximumPositions:10,latestTrades:3,pageReadsProviderFree:true,scheduled:true,requiresApiKey:true,bootstrapEnrichmentMax:10,priorityDetailedTraders:10});
