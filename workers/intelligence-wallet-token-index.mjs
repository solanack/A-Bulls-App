/* Wallet token activity index for Playable Data.
 * Reads only normalized Intelligence Store evidence. No provider fetches or inferred ownership.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { coverageForWallet, recordDemand } from './intelligence-mesh-runtime.mjs';
import { queueHistoryJob, runIntelligenceMeshScheduler } from './intelligence-mesh-scheduler.mjs';

const SOLANA_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;const EVM_RE=/^0x[a-fA-F0-9]{40}$/;const s=v=>String(v==null?'':v).trim();const n=v=>Number.isFinite(Number(v))?Number(v):0;const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});const enabled=env=>String(env.PLAYABLE_DATA_ENABLED||'').trim().toLowerCase()==='true';async function all(stmt){const result=await stmt.all();return result?.results||[];}
function validWallet(value){return SOLANA_RE.test(value)||EVM_RE.test(value);}function normalizedAsset(value,evm=false){const raw=s(value);return evm?raw.toLowerCase():raw;}

async function solanaTokenRows(db,wallet,safeLimit){return all(db.prepare(`
    SELECT mint,COUNT(*) event_count,SUM(CASE WHEN event_class='swap-like' THEN 1 ELSE 0 END) trade_count,
      MIN(block_time) first_event,MAX(block_time) last_event,SUM(ABS(COALESCE(token_delta,0))) observed_token_flow,
      MAX(COALESCE(confidence,0)) max_confidence
    FROM bull_wallet_events
    WHERE wallet=? AND mint IS NOT NULL AND mint<>''
    GROUP BY mint
    ORDER BY trade_count DESC,event_count DESC,last_event DESC
    LIMIT ?
  `).bind(wallet,safeLimit));}
async function evmTokenRows(db,wallet,safeLimit){return all(db.prepare(`
    SELECT chain_key,asset_address mint,COUNT(DISTINCT COALESCE(NULLIF(tx_id,''),event_id)) event_count,
      SUM(CASE WHEN event_class IN ('fomo-position-entry','fomo-position-exit') THEN 1 ELSE 0 END) trade_count,
      MIN(block_time) first_event,MAX(block_time) last_event,SUM(ABS(COALESCE(amount,0))) observed_token_flow,
      MAX(COALESCE(confidence,0)) max_confidence,GROUP_CONCAT(DISTINCT source_kind) source_kinds
    FROM intelligence_chain_events_v2
    WHERE LOWER(wallet_address)=LOWER(?) AND asset_address IS NOT NULL AND asset_address<>''
    GROUP BY chain_key,asset_address
    ORDER BY trade_count DESC,event_count DESC,last_event DESC
    LIMIT ?
  `).bind(wallet,safeLimit));}

export async function buildWalletTokenIndex(env={},walletInput='',{limit=100,db:dbOverride}={}){
  const wallet=s(walletInput);if(!validWallet(wallet))throw new TypeError('invalid_public_wallet');const db=dbOverride||intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');const safeLimit=Math.max(1,Math.min(250,Math.trunc(n(limit)||100)),isEvm=EVM_RE.test(wallet),rows=isEvm?await evmTokenRows(db,wallet,safeLimit):await solanaTokenRows(db,wallet,safeLimit);
  const tokens=rows.map(row=>Object.freeze({chainKey:isEvm?s(row.chain_key).toLowerCase()||'evm':'solana',mint:normalizedAsset(row.mint,isEvm),eventCount:Math.max(0,Math.trunc(n(row.event_count))),tradeCount:Math.max(0,Math.trunc(n(row.trade_count))),firstEvent:Math.max(0,Math.trunc(n(row.first_event)))||null,lastEvent:Math.max(0,Math.trunc(n(row.last_event)))||null,observedTokenFlow:Math.abs(n(row.observed_token_flow)),maxConfidence:Math.max(0,Math.min(1,n(row.max_confidence))),sourceKinds:Object.freeze(s(row.source_kinds).split(',').map(value=>value.trim()).filter(Boolean))})).filter(item=>isEvm?EVM_RE.test(item.mint):SOLANA_RE.test(item.mint));
  const coverage=isEvm?null:await coverageForWallet(env,wallet).catch(()=>null);
  return Object.freeze({schemaVersion:'wallet-token-index-v2',wallet,addressKind:isEvm?'evm':'solana',tokenCount:tokens.length,tokens:Object.freeze(tokens),coverage,disclosure:isEvm?'Token planets are chain-qualified cached events for this public EVM address. Provider-reported trade events and independently observed receipts retain their own provenance; missing rows mean unavailable coverage, not zero activity.':'Token activity reflects currently indexed public-chain observations for this wallet address. Event counts do not prove trading intent, identity, ownership, or complete history.'});
}

export async function buildCommonTokenIndex(env={},walletAInput='',walletBInput='',{limit=100,db:dbOverride}={}){
  const walletA=s(walletAInput),walletB=s(walletBInput);if(!validWallet(walletA)||!validWallet(walletB))throw new TypeError('invalid_public_wallet');if(walletA.toLowerCase()===walletB.toLowerCase())throw new TypeError('comparison_wallet_must_differ');const db=dbOverride||intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const [a,b]=await Promise.all([buildWalletTokenIndex(env,walletA,{limit,db}),buildWalletTokenIndex(env,walletB,{limit,db})]);const key=item=>`${item.chainKey}:${String(item.mint).toLowerCase()}`,byB=new Map(b.tokens.map(item=>[key(item),item]));
  const common=a.tokens.filter(item=>byB.has(key(item))).map(item=>{const other=byB.get(key(item)),observedFrom=Math.min(item.firstEvent||Infinity,other.firstEvent||Infinity),observedTo=Math.max(item.lastEvent||0,other.lastEvent||0),overlapFrom=Math.max(item.firstEvent||0,other.firstEvent||0)||null,overlapTo=Math.min(item.lastEvent||Infinity,other.lastEvent||Infinity),hasTemporalOverlap=overlapFrom!=null&&overlapTo!=null&&overlapFrom<=overlapTo;return Object.freeze({chainKey:item.chainKey,mint:item.mint,walletA:Object.freeze(item),walletB:Object.freeze(other),combinedTradeCount:item.tradeCount+other.tradeCount,combinedEventCount:item.eventCount+other.eventCount,observedFrom:Number.isFinite(observedFrom)?observedFrom:null,observedTo:observedTo||null,hasTemporalOverlap,overlapFrom:hasTemporalOverlap?overlapFrom:null,overlapTo:hasTemporalOverlap?overlapTo:null});}).sort((x,y)=>y.combinedTradeCount-x.combinedTradeCount||y.combinedEventCount-x.combinedEventCount).slice(0,Math.max(1,Math.min(250,Math.trunc(n(limit)||100))));
  return Object.freeze({schemaVersion:'wallet-common-token-index-v2',walletA,walletB,commonTokenCount:common.length,commonTokens:Object.freeze(common),coverage:Object.freeze({walletA:a.coverage,walletB:b.coverage}),disclosure:'Common tokens mean both addresses have indexed observations for the same chain-qualified asset, even when their observed trading periods differ. This does not prove shared ownership, coordination, strategy, or complete history.'});
}

export async function handleWalletTokenIndexRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/intelligence/wallet-tokens')return null;if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);const wallet=s(url.searchParams.get('wallet')),compareWallet=s(url.searchParams.get('compareWallet')),limit=url.searchParams.get('limit'),started=Date.now();
  try{
    if(compareWallet){const comparison=await buildCommonTokenIndex(env,wallet,compareWallet,{limit}),wallets=[{wallet,coverage:comparison.coverage?.walletA},{wallet:compareWallet,coverage:comparison.coverage?.walletB}],jobs=[];for(const item of wallets){if(!SOLANA_RE.test(item.wallet)||Number(item.coverage?.complete_to_genesis)>0)continue;jobs.push(Object.freeze({wallet:item.wallet,...await queueHistoryJob(env,item.wallet,{pageSize:25})}));}const result=Object.freeze({...comparison,indexing:Object.freeze({requested:jobs.length>0,jobs:Object.freeze(jobs)})});if(jobs.length&&env.__EXECUTION_CTX?.waitUntil)env.__EXECUTION_CTX.waitUntil(runIntelligenceMeshScheduler(env,{limit:1}).catch(()=>null));await recordDemand(env,'wallet-common-token-index','wallet-comparison',`${wallet}:${compareWallet}`,Date.now()-started).catch(()=>null);return json({ok:true,comparison:result});}
    const index=await buildWalletTokenIndex(env,wallet,{limit}),jobs=[];if(SOLANA_RE.test(wallet)&&Number(index.coverage?.complete_to_genesis)!==1)jobs.push(Object.freeze({wallet,...await queueHistoryJob(env,wallet,{pageSize:25})}));const result=Object.freeze({...index,indexing:Object.freeze({requested:jobs.length>0,jobs:Object.freeze(jobs)})});if(jobs.length&&env.__EXECUTION_CTX?.waitUntil)env.__EXECUTION_CTX.waitUntil(runIntelligenceMeshScheduler(env,{limit:1}).catch(()=>null));await recordDemand(env,'wallet-token-index','wallet',wallet,Date.now()-started).catch(()=>null);return json({ok:true,index:result});
  }catch(error){const code=s(error?.message||error);return json({ok:false,error:code},code==='intelligence_db_unavailable'?503:400);}
}
