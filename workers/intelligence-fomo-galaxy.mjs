/* Fomo Galaxy: cached, read-only trader discovery sourced from the independent fomoapi.io data layer.
 * Page reads are D1-only. Provider access happens only during scheduled refreshes.
 * Fomo-reported PnL is provider-reported context, never A Bulls App on-chain proof or a copy-trading signal.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { providerFetch } from './intelligence-fetch.mjs';
import { reserveProviderCredits } from './intelligence-provider-budget.mjs';

const GALAXY_PATH='/api/intelligence/fomo/galaxy';
const TRADER_PATH='/api/intelligence/fomo/trader';
const API_ROOT='https://api.fomoapi.io/v2';
const SOLANA_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_RE=/^0x[0-9a-fA-F]{40}$/;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finite=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const bool=value=>s(value).toLowerCase()==='true';
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const all=async stmt=>{try{return(await stmt.all())?.results||[];}catch{return[];}};
const clamp=(value,fallback,min,max)=>Math.max(min,Math.min(max,Math.trunc(n(value)||fallback)));

function rowsFrom(payload){
  const candidates=[payload?.data?.leaderboard,payload?.data?.items,payload?.data?.results,payload?.leaderboard,payload?.items,payload?.results,payload?.data,payload];
  return candidates.find(Array.isArray)||[];
}
function objectFrom(payload){
  const candidates=[payload?.data?.user,payload?.data?.profile,payload?.user,payload?.profile,payload?.data,payload];
  return candidates.find(value=>value&&typeof value==='object'&&!Array.isArray(value))||{};
}
function walletValue(row,kind){
  const wallets=row?.wallets&&typeof row.wallets==='object'?row.wallets:{};
  const value=kind==='solana'
    ? row?.solanaWallet??row?.solana_wallet??row?.solWallet??row?.sol_wallet??wallets.solana??wallets.sol
    : row?.evmWallet??row?.evm_wallet??row?.ethereumWallet??row?.ethereum_wallet??row?.robinhoodWallet??row?.robinhood_wallet??wallets.evm??wallets.ethereum??wallets.robinhood;
  const text=s(value);return kind==='solana'?(SOLANA_RE.test(text)?text:null):(EVM_RE.test(text)?text.toLowerCase():null);
}
function normalizeTopTokens(row){
  const source=Array.isArray(row?.topTokens)?row.topTokens:Array.isArray(row?.top_tokens)?row.top_tokens:Array.isArray(row?.tokens)?row.tokens:[];
  return source.slice(0,20).map(item=>{
    if(typeof item==='string')return {mint:SOLANA_RE.test(item)?item:null,address:EVM_RE.test(item)?item.toLowerCase():null,symbol:null,name:null,reported:true};
    const mint=s(item?.mint??item?.tokenMint??item?.token_mint??item?.solanaAddress??item?.solana_address);
    const address=s(item?.address??item?.tokenAddress??item?.token_address??item?.contractAddress??item?.contract_address);
    return {mint:SOLANA_RE.test(mint)?mint:null,address:EVM_RE.test(address)?address.toLowerCase():SOLANA_RE.test(address)?address:null,symbol:s(item?.symbol??item?.ticker).slice(0,32)||null,name:s(item?.name).slice(0,120)||null,reported:true};
  }).filter(item=>item.mint||item.address||item.symbol||item.name);
}
export function normalizeFomoLeaderboard(payload,capturedAt=Date.now()){
  const seen=new Set();
  return rowsFrom(payload).slice(0,100).flatMap((row,index)=>{
    const handle=s(row?.handle??row?.username??row?.userHandle??row?.user_handle).replace(/^@/,'').slice(0,80);
    if(!handle||seen.has(handle.toLowerCase()))return[];seen.add(handle.toLowerCase());
    const solanaWallet=walletValue(row,'solana'),evmWallet=walletValue(row,'evm');
    if(!solanaWallet&&!evmWallet)return[];
    return [{rank:clamp(row?.rank,index+1,1,100),handle,displayName:s(row?.displayName??row?.display_name??row?.name??handle).slice(0,120),reportedPnlUsd:finite(row?.pnl??row?.profit??row?.totalPnl??row?.total_pnl??row?.pnlUsd??row?.pnl_usd),reportedVolumeUsd:finite(row?.volume??row?.volumeUsd??row?.volume_usd),reportedTradeCount:finite(row?.trades??row?.tradeCount??row?.trade_count),followerCount:finite(row?.followers??row?.followerCount??row?.follower_count),solanaWallet,evmWallet,profilePictureUrl:s(row?.profilePictureLink??row?.profile_picture_link??row?.avatarUrl??row?.avatar_url).slice(0,1000)||null,topTokens:normalizeTopTokens(row),capturedAt,source:'fomoapi.io'}];
  }).sort((a,b)=>a.rank-b.rank).slice(0,50);
}

async function apiJson(env,path,credits=1){
  const key=s(env.FOMOAPI_API_KEY);if(!key)throw new Error('fomoapi_unconfigured');
  const reservation=await reserveProviderCredits(env,credits,'fomoapi');if(reservation.blocked)throw new Error('fomoapi_budget_blocked');
  const response=await providerFetch(`${API_ROOT}${path}`,{headers:{accept:'application/json',authorization:`Bearer ${key}`}});
  if(!response.ok)throw new Error(`fomoapi_http_${response.status}`);
  return response.json();
}
function profileFields(payload){
  const row=objectFrom(payload);return {profilePictureUrl:s(row?.profilePictureLink??row?.profile_picture_link??row?.avatarUrl??row?.avatar_url).slice(0,1000)||null,coverPhotoUrl:s(row?.coverPhotoLink??row?.cover_photo_link??row?.coverUrl??row?.cover_url).slice(0,1000)||null,thumbhash:s(row?.thumbhash).slice(0,500)||null,solanaWallet:walletValue(row,'solana'),evmWallet:walletValue(row,'evm'),topTokens:normalizeTopTokens(row)};
}

export async function refreshFomoGalaxy(env={},nowMs=Date.now()){
  if(!bool(env.FOMO_GALAXY_ENABLED))return Object.freeze({enabled:false});
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const now=Math.floor(nowMs/1000),refreshMinutes=clamp(env.FOMO_REFRESH_MINUTES,180,60,1440);
  const state=await db.prepare('SELECT last_fetch_at,last_success_at FROM fomo_sync_state WHERE id=1').first().catch(()=>null);
  if(n(state?.last_fetch_at)&&now-n(state.last_fetch_at)<refreshMinutes*60)return Object.freeze({enabled:true,skipped:'fresh-cache',lastSuccessAt:n(state?.last_success_at)||null});
  await db.prepare(`INSERT INTO fomo_sync_state(id,last_fetch_at,last_success_at,last_error,updated_at) VALUES(1,?,NULL,NULL,?) ON CONFLICT(id) DO UPDATE SET last_fetch_at=excluded.last_fetch_at,updated_at=excluded.updated_at`).bind(now,now).run();
  try{
    const payload=await apiJson(env,'/leaderboard/all?limit=50',1),items=normalizeFomoLeaderboard(payload,nowMs);
    if(!items.length)throw new Error('fomoapi_empty_leaderboard');
    for(const item of items){
      await db.prepare(`INSERT INTO fomo_traders(handle,current_rank,display_name,reported_pnl_usd,reported_volume_usd,reported_trade_count,follower_count,solana_wallet,evm_wallet,top_tokens_json,profile_picture_url,captured_at,source,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(handle) DO UPDATE SET current_rank=excluded.current_rank,display_name=excluded.display_name,reported_pnl_usd=excluded.reported_pnl_usd,reported_volume_usd=excluded.reported_volume_usd,reported_trade_count=excluded.reported_trade_count,follower_count=excluded.follower_count,solana_wallet=COALESCE(excluded.solana_wallet,fomo_traders.solana_wallet),evm_wallet=COALESCE(excluded.evm_wallet,fomo_traders.evm_wallet),top_tokens_json=CASE WHEN excluded.top_tokens_json<>'[]' THEN excluded.top_tokens_json ELSE fomo_traders.top_tokens_json END,profile_picture_url=COALESCE(excluded.profile_picture_url,fomo_traders.profile_picture_url),captured_at=excluded.captured_at,source=excluded.source,updated_at=excluded.updated_at`).bind(item.handle,item.rank,item.displayName,item.reportedPnlUsd,item.reportedVolumeUsd,item.reportedTradeCount,item.followerCount,item.solanaWallet,item.evmWallet,JSON.stringify(item.topTokens),item.profilePictureUrl,now,'fomoapi.io',now).run();
    }
    await db.prepare('DELETE FROM fomo_traders WHERE captured_at<?').bind(now-7*86400).run();
    const profileLimit=clamp(env.FOMO_PROFILE_LOOKUPS_PER_REFRESH,1,0,2);
    const missing=profileLimit?await all(db.prepare(`SELECT handle FROM fomo_traders WHERE current_rank BETWEEN 1 AND 50 AND (profile_checked_at IS NULL OR profile_checked_at<?) ORDER BY CASE WHEN profile_picture_url IS NULL THEN 0 ELSE 1 END,current_rank LIMIT ?`).bind(now-30*86400,profileLimit)):[];
    let profiles=0;
    for(const row of missing){
      const handle=s(row.handle);if(!handle)continue;
      try{const profile=profileFields(await apiJson(env,`/users/${encodeURIComponent(handle)}`,10));await db.prepare(`UPDATE fomo_traders SET profile_picture_url=COALESCE(?,profile_picture_url),cover_photo_url=COALESCE(?,cover_photo_url),thumbhash=COALESCE(?,thumbhash),solana_wallet=COALESCE(?,solana_wallet),evm_wallet=COALESCE(?,evm_wallet),top_tokens_json=CASE WHEN ?<>'[]' THEN ? ELSE top_tokens_json END,profile_checked_at=?,updated_at=? WHERE handle=?`).bind(profile.profilePictureUrl,profile.coverPhotoUrl,profile.thumbhash,profile.solanaWallet,profile.evmWallet,JSON.stringify(profile.topTokens),JSON.stringify(profile.topTokens),now,now,handle).run();profiles+=1;}catch(error){console.error('[fomo-profile]',handle,s(error?.message||error));}
    }
    await db.prepare(`INSERT INTO fomo_sync_state(id,last_fetch_at,last_success_at,last_error,updated_at) VALUES(1,?,?,NULL,?) ON CONFLICT(id) DO UPDATE SET last_fetch_at=excluded.last_fetch_at,last_success_at=excluded.last_success_at,last_error=NULL,updated_at=excluded.updated_at`).bind(now,now,now).run();
    return Object.freeze({enabled:true,items:items.length,profiles,capturedAt:now});
  }catch(error){const message=s(error?.message||error);await db.prepare(`UPDATE fomo_sync_state SET last_error=?,updated_at=? WHERE id=1`).bind(message,now).run().catch(()=>null);throw error;}
}

function rowToTrader(row){
  let topTokens=[];try{topTokens=JSON.parse(s(row.top_tokens_json)||'[]');if(!Array.isArray(topTokens))topTokens=[];}catch{}
  return {rank:n(row.current_rank),handle:s(row.handle),displayName:s(row.display_name)||s(row.handle),reportedPnlUsd:row.reported_pnl_usd==null?null:n(row.reported_pnl_usd),reportedVolumeUsd:row.reported_volume_usd==null?null:n(row.reported_volume_usd),reportedTradeCount:row.reported_trade_count==null?null:n(row.reported_trade_count),followerCount:row.follower_count==null?null:n(row.follower_count),solanaWallet:s(row.solana_wallet)||null,evmWallet:s(row.evm_wallet)||null,avatarUrl:s(row.profile_picture_url)||null,coverPhotoUrl:s(row.cover_photo_url)||null,thumbhash:s(row.thumbhash)||null,topTokens,capturedAt:n(row.captured_at)*1000,source:'fomoapi.io'};
}

async function galaxyPayload(db){
  const rows=await all(db.prepare(`SELECT * FROM fomo_traders WHERE current_rank BETWEEN 1 AND 50 ORDER BY current_rank ASC LIMIT 50`));
  const items=rows.map(rowToTrader),capturedAt=items.reduce((max,item)=>Math.max(max,item.capturedAt||0),0)||null;
  return {ok:true,coverage:items.length?'fresh':'empty',items,source:'fomoapi.io',capturedAt,disclosure:items.length?'Fomo Galaxy shows the independent fomoapi.io all-time leaderboard as reported at the capture time. PnL, rank, profile, and top-token fields are provider-reported context, not independently verified A Bulls App performance claims. Wallet activity shown after entering a trader is separately sourced from retained public-chain evidence. No trade can be executed here.':'The cached Fomo all-time leaderboard is empty. No logged-in fomo.family session or public mirror was scraped as a fallback.'};
}

async function observedWalletPositions(db,wallet){
  if(!SOLANA_RE.test(wallet))return[];
  const rows=await all(db.prepare(`SELECT mint,COUNT(*) event_count,SUM(CASE WHEN event_class='swap-like' THEN 1 ELSE 0 END) trade_count,SUM(COALESCE(token_delta,0)) observed_net_token_flow,MAX(block_time) last_observed_at FROM bull_wallet_events WHERE wallet=? AND mint IS NOT NULL AND mint<>'' GROUP BY mint ORDER BY trade_count DESC,ABS(observed_net_token_flow) DESC,last_observed_at DESC LIMIT 30`).bind(wallet));
  return rows.filter(row=>SOLANA_RE.test(s(row.mint))).map(row=>({mint:s(row.mint),symbol:null,name:null,sourceKind:'a-bulls-observed',observedNetTokenFlow:n(row.observed_net_token_flow),tradeCount:n(row.trade_count),eventCount:n(row.event_count),lastObservedAt:n(row.last_observed_at)*1000}));
}
async function latestWalletTrades(db,wallet){
  if(!SOLANA_RE.test(wallet))return[];
  let rows=await all(db.prepare(`SELECT mint,side,token_amount,sol_amount,block_time,signature,source FROM pump_trades WHERE wallet=? AND mint IS NOT NULL AND side IN ('buy','sell') ORDER BY block_time DESC,event_id DESC LIMIT 3`).bind(wallet));
  if(!rows.length)rows=(await all(db.prepare(`SELECT mint,token_delta,sol_delta,block_time,signature,source FROM bull_wallet_events WHERE wallet=? AND mint IS NOT NULL AND mint<>'' AND token_delta<>0 AND sol_delta<>0 ORDER BY block_time DESC,id DESC LIMIT 3`).bind(wallet))).map(row=>({...row,side:n(row.token_delta)>0?'buy':'sell',token_amount:Math.abs(n(row.token_delta)),sol_amount:Math.abs(n(row.sol_delta))}));
  return rows.filter(row=>SOLANA_RE.test(s(row.mint))).slice(0,3).map(row=>({signature:s(row.signature)||null,wallet,mint:s(row.mint),side:s(row.side)==='sell'?'sell':'buy',solAmount:Math.abs(n(row.sol_amount)),tokenAmount:Math.abs(n(row.token_amount)),priceSol:n(row.token_amount)>0?Math.abs(n(row.sol_amount))/Math.abs(n(row.token_amount)):null,observedAt:n(row.block_time)*1000,source:s(row.source)||'indexed-d1'}));
}
function providerPositions(trader){
  return (Array.isArray(trader.topTokens)?trader.topTokens:[]).flatMap(item=>{const mint=s(item?.mint??item?.address);if(!SOLANA_RE.test(mint))return[];return [{mint,symbol:s(item?.symbol)||null,name:s(item?.name)||null,sourceKind:'fomo-reported',observedNetTokenFlow:null,tradeCount:null,eventCount:null,lastObservedAt:null}];});
}
function mergePositions(provider,observed){
  const byMint=new Map();for(const item of provider)byMint.set(item.mint,{...item});for(const item of observed){const prior=byMint.get(item.mint);byMint.set(item.mint,prior?{...item,symbol:prior.symbol,name:prior.name,sourceKind:'fomo-reported+a-bulls-observed'}:item);}return [...byMint.values()].sort((a,b)=>Number(String(b.sourceKind).includes('fomo-reported'))-Number(String(a.sourceKind).includes('fomo-reported'))||n(b.tradeCount)-n(a.tradeCount)||n(b.lastObservedAt)-n(a.lastObservedAt)).slice(0,10).map((item,index)=>({...item,rank:index+1}));
}

export async function handleFomoGalaxyRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!==GALAXY_PATH&&url.pathname!==TRADER_PATH)return null;if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  if(!bool(env.FOMO_GALAXY_ENABLED))return json({ok:false,error:'feature_disabled',coverage:'degraded',items:[],disclosure:'Fomo Galaxy is disabled.'},404);
  const db=intelligenceDb(env);if(!db)return json({ok:false,error:'intelligence_db_unavailable',coverage:'degraded',items:[],disclosure:'The Intelligence D1 binding is unavailable.'},503);
  if(url.pathname===GALAXY_PATH)return json(await galaxyPayload(db),200,'public, max-age=60, stale-while-revalidate=300');
  const handle=s(url.searchParams.get('handle')).replace(/^@/,'');if(!handle)return json({ok:false,error:'handle_required'},400);
  const row=await db.prepare('SELECT * FROM fomo_traders WHERE lower(handle)=lower(?) LIMIT 1').bind(handle).first();if(!row)return json({ok:false,error:'trader_not_found',coverage:'empty',positions:[],latestTrades:[],disclosure:'This trader is not present in the current cached Fomo top 50.'},404);
  const trader=rowToTrader(row),wallet=trader.solanaWallet;
  const [observed,trades]=wallet?await Promise.all([observedWalletPositions(db,wallet),latestWalletTrades(db,wallet)]):[[],[]];
  const positions=mergePositions(providerPositions(trader),observed);
  return json({ok:true,coverage:positions.length||trades.length?'partial':'empty',trader,positions,latestTrades:trades,source:'fomoapi.io + a-bulls-indexed-public-chain',disclosure:`${trader.displayName} is a Fomo-reported trader identity linked to the public wallet fields supplied by the cached provider record; A Bulls App does not claim who controls those addresses. Top-position planets are limited to public token addresses that can be mapped. Fomo-reported top tokens stay labeled provider-reported; event counts and the three latest comets come only from currently retained A Bulls App public-chain evidence and may be incomplete. No copy-trade or execution action exists.`},200,'public, max-age=30, stale-while-revalidate=120');
}

export const __fomoGalaxyContract=Object.freeze({galaxyPath:GALAXY_PATH,traderPath:TRADER_PATH,maximumTraders:50,maximumPositions:10,latestTrades:3,readOnly:true,provider:'fomoapi.io'});
