/* Robinhood Chain reference context.
 * Read-only. Underlying-equity quotes and Lighter market stats are reference
 * tracks only and never become execution price/candle evidence.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { providerFetch } from './intelligence-fetch.mjs';
import { canonicalChainAddress } from './intelligence-chain-registry.mjs';

const RHJ_ASSETS='https://api.robinhood.com/rhj/assets';
const RHJ_PRICES='https://api.robinhood.com/rhj/prices/';
const LIGHTER_DETAILS='https://api.rh.lighter.xyz/api/v1/orderBookDetails';
const RH_CHAIN_ID=4663;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finite=value=>{const out=Number(value);return Number.isFinite(out)?out:null;};
const all=async stmt=>{try{return(await stmt.all())?.results||[];}catch{return[];}};

function payloadArray(payload,...keys){for(const key of keys){const value=key.split('.').reduce((obj,part)=>obj?.[part],payload);if(Array.isArray(value))return value;}return Array.isArray(payload)?payload:[];}
async function getJson(url,fetchImpl=providerFetch){const response=await fetchImpl(url,{headers:{accept:'application/json','user-agent':'A-Bulls-App/1.0'}});if(!response?.ok)throw new Error('robinhood_reference_http_'+String(response?.status||0));return response.json();}
function deploymentForRobinhood(asset={}){return (Array.isArray(asset?.deployments)?asset.deployments:[]).find(row=>Math.trunc(n(row?.chainId))===RH_CHAIN_ID&&canonicalChainAddress('robinhood',row?.contractAddress));}

export function normalizeRobinhoodStockAssets(payload={}){
  return payloadArray(payload,'assets','data.assets','results','data.results','data').flatMap(asset=>{const deployment=deploymentForRobinhood(asset);if(!deployment)return[];const tokenAddress=canonicalChainAddress('robinhood',deployment.contractAddress),symbol=s(asset?.tokenSymbol??asset?.symbol).replace(/^X/,'').toUpperCase(),multiplier=finite(asset?.currentMultiplier);if(!tokenAddress||!symbol)return[];return[Object.freeze({tokenAddress,symbol,name:s(asset?.tokenName??asset?.name)||null,multiplier:multiplier&&multiplier>0?multiplier:1,assetId:s(asset?.id)||null,status:s(asset?.status)||null,tradingCapabilities:asset?.tradingCapabilities??null,raw:asset})];});
}

export function normalizeRobinhoodUnderlyingPrice(payload={},symbol=''){
  const wanted=s(symbol).toUpperCase(),quotes=payloadArray(payload,'quotes','data.quotes','results','data.results','data'),row=quotes.find(item=>s(item?.tokenSymbol).toUpperCase()===wanted)??quotes[0];if(!row)return null;
  const bid=finite(row?.bid),ask=finite(row?.ask),mid=bid!=null&&ask!=null?(bid+ask)/2:bid??ask;if(mid==null||mid<=0)return null;
  return Object.freeze({symbol:s(row?.tokenSymbol||wanted).toUpperCase(),bid,ask,mid,currency:s(row?.currency)||'USD',generatedAt:Date.parse(s(row?.generatedAt))||Date.now(),dailyTradingVolume:finite(row?.dailyTradingVolume),isTradingHalt:Boolean(row?.isTradingHalt),raw:row});
}

export function normalizeRobinhoodLighterMarkets(payload={}){
  const perps=payloadArray(payload,'order_book_details','data.order_book_details'),spots=payloadArray(payload,'spot_order_book_details','data.spot_order_book_details');
  return [...perps,...spots].flatMap(row=>{const symbol=s(row?.symbol).toUpperCase();if(!symbol)return[];return[Object.freeze({symbol,marketId:Math.trunc(n(row?.market_id)),marketType:s(row?.market_type)||null,status:s(row?.status)||null,markPrice:finite(row?.mark_price),indexPrice:finite(row?.index_price),lastPrice:finite(row?.last_trade_price??row?.last_price),dailyQuoteVolume:finite(row?.daily_quote_token_volume??row?.volume_24h),openInterest:finite(row?.open_interest),raw:row})];});
}
function lighterForSymbol(markets=[],symbol=''){
  const wanted=s(symbol).toUpperCase(),patterns=new Set([wanted,'RH'+wanted,wanted+'/USDG',wanted+'/USDC','RH'+wanted+'/USDG','RH'+wanted+'/USDC']);
  const candidates=(Array.isArray(markets)?markets:[]).filter(row=>{const normalized=s(row?.symbol).toUpperCase();return patterns.has(normalized)||normalized.split('/')[0]===wanted||normalized.split('/')[0]==='RH'+wanted;}).sort((a,b)=>{const active=Number(s(b?.status).toLowerCase()==='active')-Number(s(a?.status).toLowerCase()==='active');return active||n(b?.dailyQuoteVolume)-n(a?.dailyQuoteVolume);});
  return candidates[0]??null;
}

async function currentRobinhoodFomoTokens(db,limit){
  const sql="WITH current AS (SELECT handle FROM fomo_traders WHERE current_rank BETWEEN 1 AND 50 AND captured_at=(SELECT MAX(captured_at) FROM fomo_traders)), tokens AS (SELECT p.token_address token FROM fomo_trader_positions p JOIN current c ON c.handle=p.handle WHERE LOWER(COALESCE(p.chain,'')) IN ('robinhood','robinhood-chain','robinhoodchain','hood','4663') UNION SELECT tr.token_address token FROM fomo_trader_trades tr JOIN current c ON c.handle=tr.handle WHERE LOWER(COALESCE(tr.chain,'')) IN ('robinhood','robinhood-chain','robinhoodchain','hood','4663')) SELECT token FROM tokens WHERE token IS NOT NULL AND TRIM(token)<>'' LIMIT ?";
  return all(db.prepare(sql).bind(limit));
}

async function upsertReference(db,asset,quote,lighter,now){
  const assetSql="INSERT INTO intelligence_robinhood_reference_assets(token_address,token_symbol,token_name,current_multiplier,asset_id,source,payload_json,observed_at,updated_at) VALUES(?,?,?,?,?,'robinhood-rhj',?,?,unixepoch()) ON CONFLICT(token_address) DO UPDATE SET token_symbol=excluded.token_symbol,token_name=excluded.token_name,current_multiplier=excluded.current_multiplier,asset_id=excluded.asset_id,source=excluded.source,payload_json=excluded.payload_json,observed_at=excluded.observed_at,updated_at=unixepoch()";
  await db.prepare(assetSql).bind(asset.tokenAddress,asset.symbol,asset.name,asset.multiplier,asset.assetId,JSON.stringify(asset.raw||{}),now).run();
  if(!quote&&!lighter)return;const bucket=Math.floor(now/900)*900,tokenReferenceMid=quote?.mid!=null?quote.mid*asset.multiplier:null,sources=[quote?'robinhood-rhj-underlying':null,lighter?'robinhood-lighter-reference':null].filter(Boolean);
  const snapshotSql="INSERT INTO intelligence_robinhood_reference_snapshots(token_address,bucket_start,underlying_bid_usd,underlying_ask_usd,token_reference_mid_usd,lighter_market_id,lighter_mark_price,lighter_index_price,lighter_last_price,lighter_daily_quote_volume,source_set_json,payload_json,observed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(token_address,bucket_start) DO UPDATE SET underlying_bid_usd=COALESCE(excluded.underlying_bid_usd,intelligence_robinhood_reference_snapshots.underlying_bid_usd),underlying_ask_usd=COALESCE(excluded.underlying_ask_usd,intelligence_robinhood_reference_snapshots.underlying_ask_usd),token_reference_mid_usd=COALESCE(excluded.token_reference_mid_usd,intelligence_robinhood_reference_snapshots.token_reference_mid_usd),lighter_market_id=COALESCE(excluded.lighter_market_id,intelligence_robinhood_reference_snapshots.lighter_market_id),lighter_mark_price=COALESCE(excluded.lighter_mark_price,intelligence_robinhood_reference_snapshots.lighter_mark_price),lighter_index_price=COALESCE(excluded.lighter_index_price,intelligence_robinhood_reference_snapshots.lighter_index_price),lighter_last_price=COALESCE(excluded.lighter_last_price,intelligence_robinhood_reference_snapshots.lighter_last_price),lighter_daily_quote_volume=COALESCE(excluded.lighter_daily_quote_volume,intelligence_robinhood_reference_snapshots.lighter_daily_quote_volume),source_set_json=excluded.source_set_json,payload_json=excluded.payload_json,observed_at=excluded.observed_at";
  await db.prepare(snapshotSql).bind(asset.tokenAddress,bucket,quote?.bid??null,quote?.ask??null,tokenReferenceMid,lighter?.marketId??null,lighter?.markPrice??null,lighter?.indexPrice??null,lighter?.lastPrice??null,lighter?.dailyQuoteVolume??null,JSON.stringify(sources),JSON.stringify({underlying:quote?.raw??null,lighter:lighter?.raw??null,multiplier:asset.multiplier}),now).run();
}

export async function refreshRobinhoodReferenceContext(env={},nowMs=Date.now(),{fetchImpl=providerFetch}={}){
  const db=intelligenceDb(env);if(!db)return Object.freeze({ok:false,state:'unavailable',reason:'intelligence_db_unavailable'});const limit=Math.max(0,Math.min(12,Math.trunc(n(env.ROBINHOOD_REFERENCE_ASSETS_PER_RUN)||6)));if(!limit)return Object.freeze({ok:true,enabled:false});
  const tokens=(await currentRobinhoodFomoTokens(db,limit)).map(row=>canonicalChainAddress('robinhood',row.token)).filter(Boolean);if(!tokens.length)return Object.freeze({ok:true,enabled:true,assets:0});
  const [assetsPayload,lighterPayload]=await Promise.all([getJson(RHJ_ASSETS,fetchImpl).catch(()=>null),getJson(LIGHTER_DETAILS,fetchImpl).catch(()=>null)]),assets=assetsPayload?normalizeRobinhoodStockAssets(assetsPayload):[],lighterMarkets=lighterPayload?normalizeRobinhoodLighterMarkets(lighterPayload):[],byToken=new Map(assets.map(asset=>[asset.tokenAddress,asset])),now=Math.floor(nowMs/1000),results=[];
  for(const token of tokens){const asset=byToken.get(token);if(!asset){results.push({token,state:'not-stock-token'});continue;}const pricePayload=await getJson(RHJ_PRICES+encodeURIComponent(asset.symbol),fetchImpl).catch(()=>null),quote=pricePayload?normalizeRobinhoodUnderlyingPrice(pricePayload,asset.symbol):null,lighter=lighterForSymbol(lighterMarkets,asset.symbol);await upsertReference(db,asset,quote,lighter,now);results.push({token,symbol:asset.symbol,state:quote||lighter?'ready':'metadata-only',underlyingReference:Boolean(quote),lighterReference:Boolean(lighter)});}
  return Object.freeze({ok:true,enabled:true,assets:results.length,results:Object.freeze(results),disclosure:'Robinhood underlying-equity and Lighter values are reference tracks only. They are never substituted for the selected token execution price or historical OHLC.'});
}

export async function loadRobinhoodReferenceSeries(db,token,from,to){
  const address=canonicalChainAddress('robinhood',token);if(!db||!address)return Object.freeze({asset:null,points:Object.freeze([])});
  const assetSql="SELECT token_address,token_symbol,token_name,current_multiplier,asset_id,source,observed_at FROM intelligence_robinhood_reference_assets WHERE token_address=? LIMIT 1";
  const seriesSql="SELECT bucket_start,underlying_bid_usd,underlying_ask_usd,token_reference_mid_usd,lighter_market_id,lighter_mark_price,lighter_index_price,lighter_last_price,lighter_daily_quote_volume,source_set_json,observed_at FROM intelligence_robinhood_reference_snapshots WHERE token_address=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 5000";
  const asset=await db.prepare(assetSql).bind(address).first().catch(()=>null),rows=await all(db.prepare(seriesSql).bind(address,from,to));
  return Object.freeze({asset:asset?Object.freeze({tokenAddress:s(asset.token_address),symbol:s(asset.token_symbol),name:s(asset.token_name)||null,multiplier:finite(asset.current_multiplier),source:s(asset.source),observedAt:n(asset.observed_at)}):null,points:Object.freeze(rows.map(row=>Object.freeze({timestamp:n(row.bucket_start)*1000,underlyingBidUsd:finite(row.underlying_bid_usd),underlyingAskUsd:finite(row.underlying_ask_usd),tokenReferenceMidUsd:finite(row.token_reference_mid_usd),lighterMarketId:row.lighter_market_id==null?null:Math.trunc(n(row.lighter_market_id)),lighterMarkPrice:finite(row.lighter_mark_price),lighterIndexPrice:finite(row.lighter_index_price),lighterLastPrice:finite(row.lighter_last_price),lighterDailyQuoteVolume:finite(row.lighter_daily_quote_volume),sources:(()=>{try{return JSON.parse(s(row.source_set_json)||'[]')}catch{return[]}})(),observedAt:n(row.observed_at)*1000})))});
}

export const __robinhoodReferenceContract=Object.freeze({chain:'robinhood',chainId:4663,stockTokenAssetsEndpoint:RHJ_ASSETS,stockTokenPricesEndpoint:RHJ_PRICES,lighterEndpoint:LIGHTER_DETAILS,referenceOnly:true,neverExecutionPrice:true,scheduledCache:true});
