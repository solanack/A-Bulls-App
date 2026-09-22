/* Multi-chain evidence spine for cached Fomo research objects.
 * Provider-reported holdings/trades remain provider-reported. When a reported
 * transaction identifier can be independently resolved through an EVM RPC, a
 * separate observed transaction-receipt fact is stored without upgrading the
 * provider's trade interpretation. Public reads are D1-only.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { providerFetch } from './intelligence-fetch.mjs';
import { canonicalChainAddress,chainQualifiedId,fomoChainTargets,normalizeChainKey,providerChainConfig,resolveChain,rpcCandidatesForChain } from './intelligence-chain-registry.mjs';
import { marketSnapshotFields,normalizeDexScreenerPairs } from './intelligence-market-normalizer.mjs';

const STATUS_PATH='/api/intelligence/multichain/status';
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finite=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const bool=value=>['1','true','yes','on'].includes(s(value).toLowerCase());
const clamp=(value,fallback,min,max)=>Math.max(min,Math.min(max,Math.trunc(n(value)||fallback)));
const all=async stmt=>{try{return(await stmt.all())?.results||[];}catch{return[];}};
const first=async stmt=>{try{return await stmt.first();}catch{return null;}};
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const evmTx=/^0x[a-fA-F0-9]{64}$/;
const solanaSig=/^[1-9A-HJ-NP-Za-km-z]{64,96}$/;
const hexInt=value=>{const raw=s(value);if(!/^0x[0-9a-f]+$/i.test(raw))return null;const parsed=Number.parseInt(raw,16);return Number.isSafeInteger(parsed)?parsed:null;};

export function candidateTransactionId(chain,value){
  const definition=resolveChain(chain);const id=s(value);if(!definition)return null;
  if(definition.kind==='evm')return evmTx.test(id)?id.toLowerCase():null;
  return solanaSig.test(id)?id:null;
}

function rowChain(row={}){return normalizeChainKey(row.chain??row.network_id??row.networkId??'');}
function walletForRow(row,definition){return definition?.kind==='svm'?s(row.solana_wallet):s(row.evm_wallet);}

export function fomoPositionToChainAsset(row={}){
  const chain=rowChain(row),definition=resolveChain(chain,{address:row.token_address}),address=canonicalChainAddress(chain,row.token_address);if(!definition||!address)return null;
  return Object.freeze({assetId:chainQualifiedId(chain,address),chain,address,symbol:s(row.symbol).slice(0,32)||null,name:s(row.name).slice(0,120)||null,observedAt:Math.max(0,Math.trunc(n(row.captured_at))),source:'fomoapi.io/balances',sourceKind:'provider-reported'});
}

export function fomoTradeToChainEvents(row={}){
  const chain=rowChain(row),definition=resolveChain(chain,{address:row.token_address}),assetAddress=canonicalChainAddress(chain,row.token_address);if(!definition||!assetAddress)return Object.freeze([]);
  const createdAt=Math.max(0,Math.trunc(n(row.created_at))),closedAt=Math.max(0,Math.trunc(n(row.closed_at))),closed=createdAt>0&&closedAt>=createdAt,wallet=walletForRow(row,definition),tradeId=s(row.trade_id);if(!tradeId||!createdAt)return Object.freeze([]);
  const common={chain,walletAddress:wallet||null,assetAddress,quoteAssetAddress:null,blockHeight:null,amount:finite(row.amount),source:'fomoapi.io/trades',sourceKind:'provider-reported',confidence:0.65},evidenceBase={handle:s(row.handle),tradeId,status:s(row.status)||null,reportedRealizedPnlUsd:finite(row.realized_pnl_usd),reportedUnrealizedPnlUsd:finite(row.unrealized_pnl_usd)};
  const entryTx=candidateTransactionId(chain,row.entry_tx_id??row.entryTxId??(!closed?(row.tx_id??tradeId):null)),exitTx=candidateTransactionId(chain,row.exit_tx_id??row.exitTxId??row.tx_id??(closed?tradeId:null)),events=[
    Object.freeze({...common,eventId:`fomo:${chain}:${s(row.handle).toLowerCase()}:${tradeId}:entry`,txId:entryTx,blockTime:createdAt,eventClass:'fomo-position-entry',side:'entry',priceUsd:finite(row.avg_entry_price),evidence:Object.freeze({...evidenceBase,phase:'entry'})})
  ];
  if(closed)events.push(Object.freeze({...common,eventId:`fomo:${chain}:${s(row.handle).toLowerCase()}:${tradeId}:exit`,txId:exitTx,blockTime:closedAt,eventClass:'fomo-position-exit',side:'exit',priceUsd:finite(row.avg_exit_price),evidence:Object.freeze({...evidenceBase,phase:'exit'})}));
  return Object.freeze(events);
}

/** Backward-compatible single event view; closed trades resolve to the exit event. */
export function fomoTradeToChainEvent(row={}){
  const events=fomoTradeToChainEvents(row);return events.at(-1)??null;
}

function assetUpsert(db,asset){return db.prepare(`INSERT INTO intelligence_chain_assets_v2(asset_id,chain_key,asset_address,symbol,name,source_set_json,first_observed_at,last_observed_at,updated_at) VALUES(?,?,?,?,?,?,?, ?,unixepoch()) ON CONFLICT(asset_id) DO UPDATE SET symbol=COALESCE(excluded.symbol,intelligence_chain_assets_v2.symbol),name=COALESCE(excluded.name,intelligence_chain_assets_v2.name),source_set_json=excluded.source_set_json,last_observed_at=MAX(COALESCE(intelligence_chain_assets_v2.last_observed_at,0),COALESCE(excluded.last_observed_at,0)),updated_at=unixepoch()`).bind(asset.assetId,asset.chain,asset.address,asset.symbol,asset.name,JSON.stringify([asset.source]),asset.observedAt||null,asset.observedAt||null);}
function eventUpsert(db,event){return db.prepare(`INSERT INTO intelligence_chain_events_v2(event_id,chain_key,tx_id,wallet_address,asset_address,quote_asset_address,block_height,block_time,event_class,side,amount,price_usd,source,source_kind,confidence,evidence_json,observed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,unixepoch(),unixepoch()) ON CONFLICT(event_id) DO UPDATE SET tx_id=COALESCE(excluded.tx_id,intelligence_chain_events_v2.tx_id),wallet_address=COALESCE(excluded.wallet_address,intelligence_chain_events_v2.wallet_address),block_height=COALESCE(excluded.block_height,intelligence_chain_events_v2.block_height),block_time=COALESCE(excluded.block_time,intelligence_chain_events_v2.block_time),event_class=excluded.event_class,side=COALESCE(excluded.side,intelligence_chain_events_v2.side),amount=COALESCE(excluded.amount,intelligence_chain_events_v2.amount),price_usd=COALESCE(excluded.price_usd,intelligence_chain_events_v2.price_usd),source=excluded.source,source_kind=excluded.source_kind,confidence=MAX(intelligence_chain_events_v2.confidence,excluded.confidence),evidence_json=excluded.evidence_json,updated_at=unixepoch()`).bind(event.eventId,event.chain,event.txId,event.walletAddress,event.assetAddress,event.quoteAssetAddress,event.blockHeight,event.blockTime,event.eventClass,event.side,event.amount,event.priceUsd,event.source,event.sourceKind,event.confidence,JSON.stringify(event.evidence||{}));}
function marketUpsert(db,chain,address,market,now){const fields=marketSnapshotFields(market),nowSec=Math.floor(now/1000);return db.prepare(`INSERT INTO intelligence_market_snapshots_v2(chain_key,asset_address,price_usd,market_cap_usd,fdv_usd,liquidity_usd,volume_m5_usd,volume_h1_usd,volume_h6_usd,volume_h24_usd,pair_address,dex_id,pair_created_at,source,payload_json,observed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(chain_key,asset_address) DO UPDATE SET price_usd=excluded.price_usd,market_cap_usd=excluded.market_cap_usd,fdv_usd=excluded.fdv_usd,liquidity_usd=excluded.liquidity_usd,volume_m5_usd=excluded.volume_m5_usd,volume_h1_usd=excluded.volume_h1_usd,volume_h6_usd=excluded.volume_h6_usd,volume_h24_usd=excluded.volume_h24_usd,pair_address=excluded.pair_address,dex_id=excluded.dex_id,pair_created_at=excluded.pair_created_at,source=excluded.source,payload_json=excluded.payload_json,observed_at=excluded.observed_at,updated_at=excluded.updated_at`).bind(chain,address,fields.priceUsd,fields.marketCapUsd,fields.fdvUsd,fields.liquidityUsd,fields.volumeM5Usd,fields.volumeH1Usd,fields.volumeH6Usd,fields.volumeH24Usd,fields.pairAddress,fields.dexId,fields.pairCreatedAt,fields.source,JSON.stringify(market),nowSec,nowSec);}

async function markSourceHealth(db,source,sourceKind,state,details={},error=false){const now=Math.floor(Date.now()/1000);await db.prepare(`INSERT INTO intelligence_source_health(source,source_kind,state,last_ok_at,last_error_at,details_json,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source) DO UPDATE SET source_kind=excluded.source_kind,state=excluded.state,last_ok_at=CASE WHEN excluded.state='ok' THEN excluded.last_ok_at ELSE intelligence_source_health.last_ok_at END,last_error_at=CASE WHEN excluded.state='error' THEN excluded.last_error_at ELSE intelligence_source_health.last_error_at END,details_json=excluded.details_json,updated_at=excluded.updated_at`).bind(source,sourceKind,state,state==='ok'?now:null,error||state==='error'?now:null,JSON.stringify(details),now).run().catch(()=>null);}

async function fetchDexBatch(chain,assets,fetchImpl){
  const provider=providerChainConfig(chain,assets[0]?.address);if(!provider)return{chain,markets:[],error:'chain_provider_unavailable'};
  const url=`https://api.dexscreener.com/tokens/v1/${encodeURIComponent(provider.dexScreenerId)}/${assets.map(item=>encodeURIComponent(item.address)).join(',')}`;
  try{const response=await fetchImpl(url,{headers:{accept:'application/json','user-agent':'A-Bulls-App/1.0'}});if(!response?.ok)return{chain,markets:[],error:`http_${response?.status||0}`};const rows=await response.json();if(!Array.isArray(rows))return{chain,markets:[],error:'invalid_response'};return{chain,markets:assets.map(item=>({asset:item,market:normalizeDexScreenerPairs(chain,item.address,rows)})).filter(item=>item.market),error:null};}catch(error){return{chain,markets:[],error:s(error?.message||error)||'fetch_failed'};}
}

async function evmRpc(url,method,params,fetchImpl){const response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json','user-agent':'A-Bulls-App/1.0'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(5000)});if(!response?.ok)throw new Error(`http_${response?.status||0}`);const body=await response.json();if(body?.error)throw new Error(`rpc_${s(body.error.code)||'error'}`);return body?.result??null;}

export async function verifyEvmTransaction(env,event,{fetchImpl=providerFetch}={}){
  if(!event?.txId)return null;const definition=resolveChain(event.chain,{address:event.assetAddress});if(definition?.kind!=='evm')return null;
  const candidates=rpcCandidatesForChain(env,event.chain,event.assetAddress);for(const candidate of candidates){try{const [tx,receipt]=await Promise.all([evmRpc(candidate.url,'eth_getTransactionByHash',[event.txId],fetchImpl),evmRpc(candidate.url,'eth_getTransactionReceipt',[event.txId],fetchImpl)]);if(!tx||!receipt)continue;const from=canonicalChainAddress(event.chain,tx.from),to=canonicalChainAddress(event.chain,tx.to),blockNumber=s(receipt.blockNumber??tx.blockNumber),blockHeight=hexInt(blockNumber),block=blockNumber?await evmRpc(candidate.url,'eth_getBlockByNumber',[blockNumber,false],fetchImpl).catch(()=>null):null,blockTime=hexInt(block?.timestamp),success=s(receipt.status).toLowerCase()==='0x1';return Object.freeze({eventId:`receipt:${event.chain}:${event.txId}`,chain:event.chain,txId:event.txId,walletAddress:from,assetAddress:event.assetAddress,quoteAssetAddress:null,blockHeight,blockTime,eventClass:'transaction-receipt',side:null,amount:null,priceUsd:null,source:candidate.source,sourceKind:'observed-fact',confidence:0.9,evidence:Object.freeze({to,success,status:s(receipt.status)||null,gasUsed:s(receipt.gasUsed)||null,logsCount:Array.isArray(receipt.logs)?receipt.logs.length:null,tradeInterpretationVerified:false})});}catch{}}
  return null;
}

export async function materializeFomoMultichainEvidence(env={},nowMs=Date.now(),{fetchImpl=providerFetch}={}){
  if(!bool(env.MULTICHAIN_EVIDENCE_ENABLED))return Object.freeze({enabled:false});const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const assetLimit=clamp(env.MULTICHAIN_MARKET_ASSETS_PER_RUN,60,1,120),eventLimit=clamp(env.MULTICHAIN_FOMO_EVENTS_PER_RUN,100,1,250),verifyLimit=clamp(env.MULTICHAIN_TX_VERIFY_LIMIT,4,0,12);
  const positions=await all(db.prepare(`SELECT p.handle,p.token_address,p.symbol,p.name,p.chain,p.network_id,p.captured_at,t.current_rank,t.solana_wallet,t.evm_wallet FROM fomo_trader_positions p JOIN fomo_traders t ON t.handle=p.handle WHERE t.current_rank BETWEEN 1 AND 50 AND t.captured_at=(SELECT MAX(captured_at) FROM fomo_traders) ORDER BY t.current_rank ASC,p.position_rank ASC LIMIT ?`).bind(assetLimit));
  const trades=await all(db.prepare(`SELECT tr.handle,tr.trade_id,tr.token_address,tr.symbol,tr.chain,tr.status,tr.amount,tr.avg_entry_price,tr.avg_exit_price,tr.realized_pnl_usd,tr.unrealized_pnl_usd,tr.created_at,tr.closed_at,tr.captured_at,t.current_rank,t.solana_wallet,t.evm_wallet FROM fomo_trader_trades tr JOIN fomo_traders t ON t.handle=tr.handle WHERE t.current_rank BETWEEN 1 AND 50 AND t.captured_at=(SELECT MAX(captured_at) FROM fomo_traders) ORDER BY t.current_rank ASC,MAX(COALESCE(tr.closed_at,0),COALESCE(tr.created_at,0)) DESC LIMIT ?`).bind(eventLimit));
  const assetsById=new Map();for(const row of positions){const asset=fomoPositionToChainAsset(row);if(asset)assetsById.set(asset.assetId,asset);}for(const row of trades){const chain=rowChain(row),address=canonicalChainAddress(chain,row.token_address),assetId=address&&chainQualifiedId(chain,address);if(assetId&&!assetsById.has(assetId))assetsById.set(assetId,{assetId,chain,address,symbol:s(row.symbol).slice(0,32)||null,name:null,observedAt:Math.max(n(row.captured_at),n(row.created_at),n(row.closed_at)),source:'fomoapi.io/trades',sourceKind:'provider-reported'});}
  const events=trades.flatMap(row=>[...fomoTradeToChainEvents(row)]),writes=[];for(const asset of assetsById.values())writes.push(assetUpsert(db,asset));for(const event of events)writes.push(eventUpsert(db,event));for(let i=0;i<writes.length;i+=50)await db.batch(writes.slice(i,i+50));

  let marketCount=0;const groups=new Map();for(const asset of assetsById.values()){const list=groups.get(asset.chain)||[];if(list.length<30)list.push(asset);groups.set(asset.chain,list);}if(bool(env.MULTICHAIN_MARKET_ENABLED)){const results=await Promise.all([...groups.entries()].map(([chain,items])=>fetchDexBatch(chain,items,fetchImpl)));for(const result of results){if(result.error){await markSourceHealth(db,`multichain-market:${result.chain}`,'market-provider','error',{error:result.error},true);continue;}const statements=[];for(const item of result.markets){statements.push(marketUpsert(db,result.chain,item.asset.address,{...item.market,observedAt:nowMs},nowMs));marketCount+=1;}for(let i=0;i<statements.length;i+=50)await db.batch(statements.slice(i,i+50));await markSourceHealth(db,`multichain-market:${result.chain}`,'market-provider','ok',{assets:result.markets.length});}}

  let verified=0,attempted=0;for(const event of events){if(attempted>=verifyLimit)break;if(!event.txId)continue;const definition=resolveChain(event.chain,{address:event.assetAddress});if(definition?.kind!=='evm')continue;attempted+=1;const receipt=await verifyEvmTransaction(env,event,{fetchImpl});if(receipt){await eventUpsert(db,receipt).run();verified+=1;}}
  return Object.freeze({enabled:true,assets:assetsById.size,providerReportedEvents:events.length,marketSnapshots:marketCount,txVerificationsAttempted:attempted,observedReceipts:verified,chains:Object.freeze([...new Set([...assetsById.values()].map(item=>item.chain))].sort())});
}

async function statusPayload(env){
  const db=intelligenceDb(env);if(!db)return{ok:false,error:'intelligence_db_unavailable'};
  const [assets,markets,events,kinds]=await Promise.all([
    all(db.prepare(`SELECT chain_key,COUNT(*) count,MAX(last_observed_at) last_observed_at FROM intelligence_chain_assets_v2 GROUP BY chain_key ORDER BY chain_key`)),
    all(db.prepare(`SELECT chain_key,COUNT(*) count,MAX(observed_at) last_observed_at FROM intelligence_market_snapshots_v2 GROUP BY chain_key ORDER BY chain_key`)),
    all(db.prepare(`SELECT chain_key,COUNT(*) count,MAX(COALESCE(block_time,observed_at)) last_observed_at FROM intelligence_chain_events_v2 GROUP BY chain_key ORDER BY chain_key`)),
    all(db.prepare(`SELECT source_kind,COUNT(*) count FROM intelligence_chain_events_v2 GROUP BY source_kind ORDER BY source_kind`))
  ]);
  return{ok:true,schemaVersion:'multichain-evidence-spine-v1',enabled:bool(env.MULTICHAIN_EVIDENCE_ENABLED),marketEnabled:bool(env.MULTICHAIN_MARKET_ENABLED),fomoCoverageTargets:fomoChainTargets(),assets,markets,events,evidenceKinds:kinds,disclosure:'Chain-qualified caches keep Fomo provider reports separate from independently observed transaction receipts. Missing rows mean unavailable coverage, not zero activity. No signing, swaps, custody, or execution are performed.'};
}

export async function handleMultichainEvidenceRequest(request,env={}){const url=new URL(request.url);if(url.pathname!==STATUS_PATH)return null;if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);return json(await statusPayload(env),200,'public, max-age=30, stale-while-revalidate=60');}

export const __multichainEvidenceContract=Object.freeze({statusPath:STATUS_PATH,schemaVersion:'multichain-evidence-spine-v1',readOnly:true,pageReadsProviderFree:true,providerLifecyclePreservesEntryAndExit:true,providerReportedTradeFactsStayProviderReported:true,receiptVerificationDoesNotVerifyTradeInterpretation:true});
