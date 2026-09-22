import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const CONFIG="workers/wrangler.production.toml";
const DB="INTELLIGENCE_DB";
const SOLANA_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_RE=/^0x[a-fA-F0-9]{40}$/;
const s=value=>String(value??"").trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finite=value=>value==null||value===""?null:Number.isFinite(Number(value))?Number(value):null;

function normalizeChain(value,token=""){
  const raw=s(value).toLowerCase().replace(/[_\s:]+/g,"-");
  if(["sol","svm","solana-mainnet"].includes(raw)||raw==="solana")return"solana";
  if(["bnb","bnb-chain","bnbchain","binance-smart-chain"].includes(raw)||raw==="bsc")return"bsc";
  if(["eth","ethereum-mainnet","mainnet"].includes(raw)||raw==="ethereum")return"ethereum";
  if(["robinhood-chain","robinhoodchain","hood"].includes(raw)||raw==="robinhood")return"robinhood";
  if(raw)return raw;
  if(SOLANA_RE.test(s(token)))return"solana";
  if(EVM_RE.test(s(token)))return"unknown-evm";
  return"unknown";
}
function canonical(chain,value){const text=s(value);return chain==="solana"?text:text.toLowerCase();}
function key(chain,wallet,token){return`${chain}|${canonical(chain,wallet)}|${canonical(chain,token)}`;}
function tokenKey(chain,token){return`${chain}|${canonical(chain,token)}`;}
function d1(sql){
  const stdout=execFileSync("npx",["wrangler","d1","execute",DB,"--remote","--config",CONFIG,"--json","--command",sql],{encoding:"utf8",stdio:["ignore","pipe","inherit"],maxBuffer:32*1024*1024});
  const start=stdout.indexOf("[");if(start<0)throw new Error("wrangler_d1_json_missing");
  const payload=JSON.parse(stdout.slice(start)),rows=payload.flatMap(item=>Array.isArray(item?.results)?item.results:[]);
  return rows;
}

const traders=d1(`
SELECT handle,current_rank,display_name,solana_wallet,evm_wallet,top_tokens_json,captured_at
FROM fomo_traders
WHERE current_rank BETWEEN 1 AND 50
ORDER BY current_rank ASC;
`);
const positions=d1(`
SELECT p.handle,p.position_rank,p.token_address,p.symbol,p.name,p.chain,p.network_id,p.price_usd,p.value_usd,p.captured_at
FROM fomo_trader_positions p
JOIN fomo_traders t ON t.handle=p.handle
WHERE t.current_rank BETWEEN 1 AND 50
ORDER BY t.current_rank,p.position_rank;
`);
const trades=d1(`
SELECT tr.handle,tr.trade_id,tr.token_address,tr.symbol,tr.chain,tr.status,tr.amount,tr.avg_entry_price,tr.avg_exit_price,
       tr.realized_pnl_usd,tr.unrealized_pnl_usd,tr.created_at,tr.closed_at,tr.captured_at
FROM fomo_trader_trades tr
JOIN fomo_traders t ON t.handle=tr.handle
WHERE t.current_rank BETWEEN 1 AND 50
ORDER BY t.current_rank,MAX(COALESCE(tr.closed_at,0),COALESCE(tr.created_at,0)) DESC;
`);
const multichain=d1(`
WITH tokens AS (
  SELECT DISTINCT LOWER(token_address) token FROM fomo_trader_positions
  UNION
  SELECT DISTINCT LOWER(token_address) token FROM fomo_trader_trades
)
SELECT 'event' dataset,e.chain_key,e.wallet_address wallet,e.asset_address token,NULL quote,COUNT(*) count,
       SUM(CASE WHEN e.source_kind='observed-fact' THEN 1 ELSE 0 END) observed_count,
       SUM(CASE WHEN e.source_kind='provider-reported' THEN 1 ELSE 0 END) provider_count
FROM intelligence_chain_events_v2 e
JOIN tokens x ON LOWER(e.asset_address)=x.token
GROUP BY e.chain_key,e.wallet_address,e.asset_address
UNION ALL
SELECT 'market',m.chain_key,NULL,m.asset_address,NULL,COUNT(*),0,0
FROM intelligence_market_snapshots_v2 m
JOIN tokens x ON LOWER(m.asset_address)=x.token
GROUP BY m.chain_key,m.asset_address
UNION ALL
SELECT 'candle',c.chain_key,NULL,c.asset_address,c.quote_asset_address,COUNT(*),0,0
FROM intelligence_price_candles_v2 c
JOIN tokens x ON LOWER(c.asset_address)=x.token
GROUP BY c.chain_key,c.asset_address,c.quote_asset_address;
`);
const solana=d1(`
WITH wallets AS (
  SELECT DISTINCT solana_wallet wallet
  FROM fomo_traders
  WHERE current_rank BETWEEN 1 AND 50 AND solana_wallet IS NOT NULL AND TRIM(solana_wallet)<>''
),
tokens AS (
  SELECT DISTINCT token_address token FROM fomo_trader_positions WHERE chain IS NULL OR LOWER(chain) IN ('solana','sol','svm','solana-mainnet')
  UNION
  SELECT DISTINCT token_address token FROM fomo_trader_trades WHERE chain IS NULL OR LOWER(chain) IN ('solana','sol','svm','solana-mainnet')
)
SELECT 'event' dataset,e.wallet,e.mint token,NULL quote,COUNT(*) count
FROM bull_wallet_events e
JOIN wallets w ON w.wallet=e.wallet
JOIN tokens x ON x.token=e.mint
GROUP BY e.wallet,e.mint
UNION ALL
SELECT 'candle',NULL,c.mint,c.quote_mint,COUNT(*)
FROM intelligence_price_candles c
JOIN tokens x ON x.token=c.mint
GROUP BY c.mint,c.quote_mint;
`);

const traderByHandle=new Map(traders.map(row=>[s(row.handle).toLowerCase(),row]));
const knownChainsByHandleToken=new Map();
for(const row of [...positions,...trades]){
  const handle=s(row.handle).toLowerCase(),token=s(row.token_address),chain=normalizeChain(row.chain,token);
  if(chain==="unknown-evm"||chain==="unknown")continue;
  const id=`${handle}|${token.toLowerCase()}`;const set=knownChainsByHandleToken.get(id)||new Set();set.add(chain);knownChainsByHandleToken.set(id,set);
}
function resolvedChain(handle,token,raw){
  const normalized=normalizeChain(raw,token);if(normalized!=="unknown-evm")return normalized;
  const known=knownChainsByHandleToken.get(`${s(handle).toLowerCase()}|${s(token).toLowerCase()}`);
  return known?.size===1?[...known][0]:normalized;
}

const pairs=new Map();
function ensure(handle,token,chain,source){
  const trader=traderByHandle.get(s(handle).toLowerCase());if(!trader||!s(token))return null;
  const resolved=resolvedChain(handle,token,chain),id=`${s(handle).toLowerCase()}|${resolved}|${canonical(resolved,token)}`;
  if(!pairs.has(id))pairs.set(id,{rank:n(trader.current_rank),handle:s(trader.handle),displayName:s(trader.display_name)||s(trader.handle),chain:resolved,token:canonical(resolved,token),solanaWallet:s(trader.solana_wallet)||null,evmWallet:s(trader.evm_wallet)?.toLowerCase()||null,sources:new Set(),positionRows:0,tradeRows:0,timedTradeRows:0,providerPricePoints:0,openTrades:0,closedTrades:0});
  const pair=pairs.get(id);pair.sources.add(source);return pair;
}
for(const row of positions){const pair=ensure(row.handle,row.token_address,row.chain,"position");if(pair)pair.positionRows+=1;}
for(const row of trades){const pair=ensure(row.handle,row.token_address,row.chain,"trade");if(!pair)continue;pair.tradeRows+=1;if(n(row.created_at)>0)pair.timedTradeRows+=1;if(finite(row.avg_entry_price)!=null)pair.providerPricePoints+=1;if(n(row.closed_at)>0&&finite(row.avg_exit_price)!=null)pair.providerPricePoints+=1;if(s(row.status).toLowerCase()==="closed"||n(row.closed_at)>0)pair.closedTrades+=1;else pair.openTrades+=1;}
for(const trader of traders){
  let top=[];try{top=JSON.parse(s(trader.top_tokens_json)||"[]");if(!Array.isArray(top))top=[];}catch{}
  for(const item of top){const token=s(item?.mint??item?.address),chain=item?.chain??item?.chainKey??item?.networkId??item?.network_id??"";ensure(trader.handle,token,chain,"leaderboard-top-token");}
}

const eventCounts=new Map(),marketCounts=new Map(),candleCounts=new Map();
for(const row of multichain){
  const chain=normalizeChain(row.chain_key,row.token),token=canonical(chain,row.token);
  if(row.dataset==="event"){eventCounts.set(key(chain,row.wallet,token),{count:n(row.count),observed:n(row.observed_count),provider:n(row.provider_count)});}
  if(row.dataset==="market")marketCounts.set(tokenKey(chain,token),n(row.count));
  if(row.dataset==="candle"){const id=tokenKey(chain,token),prior=candleCounts.get(id)||{count:0,quotes:new Set()};prior.count+=n(row.count);if(s(row.quote))prior.quotes.add(canonical(chain,row.quote));candleCounts.set(id,prior);}
}
const solEventCounts=new Map(),solCandleCounts=new Map();
for(const row of solana){
  if(row.dataset==="event")solEventCounts.set(key("solana",row.wallet,row.token),n(row.count));
  else{const id=tokenKey("solana",row.token),prior=solCandleCounts.get(id)||{count:0,quotes:new Set()};prior.count+=n(row.count);if(s(row.quote))prior.quotes.add(s(row.quote));solCandleCounts.set(id,prior);}
}

const rows=[...pairs.values()].sort((a,b)=>a.rank-b.rank||a.handle.localeCompare(b.handle)||a.chain.localeCompare(b.chain)||a.token.localeCompare(b.token)).map(pair=>{
  const wallet=pair.chain==="solana"?pair.solanaWallet:pair.evmWallet;
  const evt=pair.chain==="solana"?{count:solEventCounts.get(key("solana",wallet,pair.token))||0,observed:solEventCounts.get(key("solana",wallet,pair.token))||0,provider:0}:eventCounts.get(key(pair.chain,wallet,pair.token))||{count:0,observed:0,provider:0};
  const candles=pair.chain==="solana"?(solCandleCounts.get(tokenKey("solana",pair.token))||candleCounts.get(tokenKey("solana",pair.token))):candleCounts.get(tokenKey(pair.chain,pair.token));
  const candleCount=n(candles?.count),quotes=[...(candles?.quotes||[])],marketCount=marketCounts.get(tokenKey(pair.chain,pair.token))||0,replayEvidence=pair.timedTradeRows>0||evt.count>0,chartEvidence=candleCount>0||pair.providerPricePoints>0;
  return{...pair,sources:[...pair.sources].sort(),wallet,retainedEvents:evt.count,observedEvents:evt.observed,materializedProviderEvents:evt.provider,marketSnapshots:marketCount,candleCount,candleQuotes:quotes,hasReplayEvidence:replayEvidence,hasChartEvidence:chartEvidence,missingWallet:!wallet,unknownChain:pair.chain==="unknown-evm"||pair.chain==="unknown",positionWithoutReplay:pair.positionRows>0&&!replayEvidence,tradeWithoutReplay:pair.tradeRows>0&&!replayEvidence,tradeWithoutChart:pair.tradeRows>0&&!chartEvidence};
});

const tradersWithPairs=new Set(rows.map(row=>row.handle.toLowerCase()));
const perChain={};
for(const row of rows){const item=perChain[row.chain]??={pairs:0,replayReady:0,chartReady:0,positionsWithoutReplay:0,tradesWithoutReplay:0,tradesWithoutChart:0,unknownChain:0,missingWallet:0};item.pairs+=1;item.replayReady+=Number(row.hasReplayEvidence);item.chartReady+=Number(row.hasChartEvidence);item.positionsWithoutReplay+=Number(row.positionWithoutReplay);item.tradesWithoutReplay+=Number(row.tradeWithoutReplay);item.tradesWithoutChart+=Number(row.tradeWithoutChart);item.unknownChain+=Number(row.unknownChain);item.missingWallet+=Number(row.missingWallet);}

const perTrader=traders.map(trader=>{const owned=rows.filter(row=>row.handle.toLowerCase()===s(trader.handle).toLowerCase());return{rank:n(trader.current_rank),handle:s(trader.handle),pairs:owned.length,replayReady:owned.filter(row=>row.hasReplayEvidence).length,chartReady:owned.filter(row=>row.hasChartEvidence).length,positionsWithoutReplay:owned.filter(row=>row.positionWithoutReplay).length,tradesWithoutReplay:owned.filter(row=>row.tradeWithoutReplay).length,tradesWithoutChart:owned.filter(row=>row.tradeWithoutChart).length,unknownChain:owned.filter(row=>row.unknownChain).length};});
const summary={generatedAt:new Date().toISOString(),traders:traders.length,tradersWithAnyTokenPair:tradersWithPairs.size,tradersWithProviderPositions:new Set(positions.map(row=>s(row.handle).toLowerCase())).size,tradersWithProviderTrades:new Set(trades.map(row=>s(row.handle).toLowerCase())).size,totalPairs:rows.length,replayReadyPairs:rows.filter(row=>row.hasReplayEvidence).length,chartReadyPairs:rows.filter(row=>row.hasChartEvidence).length,positionPairsWithoutReplay:rows.filter(row=>row.positionWithoutReplay).length,tradePairsWithoutReplay:rows.filter(row=>row.tradeWithoutReplay).length,tradePairsWithoutChart:rows.filter(row=>row.tradeWithoutChart).length,unknownChainPairs:rows.filter(row=>row.unknownChain).length,missingWalletPairs:rows.filter(row=>row.missingWallet).length,perChain,perTrader};

writeFileSync("fomo-replay-audit.json",JSON.stringify({summary,rows},null,2));
writeFileSync("fomo-replay-audit-summary.json",JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
if(!traders.length)process.exitCode=2;
