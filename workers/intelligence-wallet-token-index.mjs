/* Wallet token activity index for Playable Data.
 * Reads only normalized Intelligence Store evidence. No provider fetches or inferred ownership.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { coverageForWallet, recordDemand } from './intelligence-mesh-runtime.mjs';
import { queueHistoryJob, runIntelligenceMeshScheduler } from './intelligence-mesh-scheduler.mjs';

const WALLET_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const enabled=env=>String(env.PLAYABLE_DATA_ENABLED||'').trim().toLowerCase()==='true';
async function all(stmt){const result=await stmt.all();return result?.results||[];}

export async function buildWalletTokenIndex(env={},walletInput='',{limit=100,db:dbOverride}={}){
  const wallet=s(walletInput);if(!WALLET_RE.test(wallet))throw new TypeError('invalid_public_wallet');const db=dbOverride||intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');const safeLimit=Math.max(1,Math.min(250,Math.trunc(n(limit)||100)));
  const rows=await all(db.prepare(`
    SELECT mint,COUNT(*) event_count,SUM(CASE WHEN event_class='swap-like' THEN 1 ELSE 0 END) trade_count,
      MIN(block_time) first_event,MAX(block_time) last_event,SUM(ABS(COALESCE(token_delta,0))) observed_token_flow,
      MAX(COALESCE(confidence,0)) max_confidence
    FROM bull_wallet_events
    WHERE wallet=? AND mint IS NOT NULL AND mint<>''
    GROUP BY mint
    ORDER BY trade_count DESC,event_count DESC,last_event DESC
    LIMIT ?
  `).bind(wallet,safeLimit));
  const tokens=rows.map(row=>Object.freeze({mint:s(row.mint),eventCount:Math.max(0,Math.trunc(n(row.event_count))),tradeCount:Math.max(0,Math.trunc(n(row.trade_count))),firstEvent:Math.max(0,Math.trunc(n(row.first_event)))||null,lastEvent:Math.max(0,Math.trunc(n(row.last_event)))||null,observedTokenFlow:Math.abs(n(row.observed_token_flow)),maxConfidence:Math.max(0,Math.min(1,n(row.max_confidence)))})).filter(item=>WALLET_RE.test(item.mint));
  const coverage=await coverageForWallet(env,wallet).catch(()=>null);
  return Object.freeze({schemaVersion:'wallet-token-index-v1',wallet,tokenCount:tokens.length,tokens:Object.freeze(tokens),coverage,disclosure:'Token activity reflects currently indexed public-chain observations for this wallet address. Event counts do not prove trading intent, identity, ownership, or complete history.'});
}

export async function buildCommonTokenIndex(env={},walletAInput='',walletBInput='',{limit=100,db:dbOverride}={}){
  const walletA=s(walletAInput),walletB=s(walletBInput);if(!WALLET_RE.test(walletA)||!WALLET_RE.test(walletB))throw new TypeError('invalid_public_wallet');if(walletA===walletB)throw new TypeError('comparison_wallet_must_differ');const db=dbOverride||intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const [a,b]=await Promise.all([buildWalletTokenIndex(env,walletA,{limit,db}),buildWalletTokenIndex(env,walletB,{limit,db})]);const byB=new Map(b.tokens.map(item=>[item.mint,item]));
  const common=a.tokens.filter(item=>byB.has(item.mint)).map(item=>{const other=byB.get(item.mint),observedFrom=Math.min(item.firstEvent||Infinity,other.firstEvent||Infinity),observedTo=Math.max(item.lastEvent||0,other.lastEvent||0),overlapFrom=Math.max(item.firstEvent||0,other.firstEvent||0)||null,overlapTo=Math.min(item.lastEvent||Infinity,other.lastEvent||Infinity),hasTemporalOverlap=overlapFrom!=null&&overlapTo!=null&&overlapFrom<=overlapTo;return Object.freeze({mint:item.mint,walletA:Object.freeze(item),walletB:Object.freeze(other),combinedTradeCount:item.tradeCount+other.tradeCount,combinedEventCount:item.eventCount+other.eventCount,observedFrom:Number.isFinite(observedFrom)?observedFrom:null,observedTo:observedTo||null,hasTemporalOverlap,overlapFrom:hasTemporalOverlap?overlapFrom:null,overlapTo:hasTemporalOverlap?overlapTo:null});}).sort((x,y)=>y.combinedTradeCount-x.combinedTradeCount||y.combinedEventCount-x.combinedEventCount).slice(0,Math.max(1,Math.min(250,Math.trunc(n(limit)||100))));
  return Object.freeze({schemaVersion:'wallet-common-token-index-v1',walletA,walletB,commonTokenCount:common.length,commonTokens:Object.freeze(common),coverage:Object.freeze({walletA:a.coverage,walletB:b.coverage}),disclosure:'Common tokens mean both addresses have indexed observations for the same mint, even when their observed trading periods differ. This does not prove shared ownership, coordination, strategy, or complete history.'});
}

export async function handleWalletTokenIndexRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/intelligence/wallet-tokens')return null;if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);const wallet=s(url.searchParams.get('wallet')),compareWallet=s(url.searchParams.get('compareWallet')),limit=url.searchParams.get('limit'),started=Date.now();
  try{
    if(compareWallet){
      const comparison=await buildCommonTokenIndex(env,wallet,compareWallet,{limit});
      const wallets=[{wallet,coverage:comparison.coverage?.walletA},{wallet:compareWallet,coverage:comparison.coverage?.walletB}];
      const jobs=[];
      for(const item of wallets){
        if(Number(item.coverage?.complete_to_genesis)>0)continue;
        jobs.push(Object.freeze({wallet:item.wallet,...await queueHistoryJob(env,item.wallet,{pageSize:25})}));
      }
      const result=Object.freeze({...comparison,indexing:Object.freeze({requested:jobs.length>0,jobs:Object.freeze(jobs)})});
      if(jobs.length&&env.__EXECUTION_CTX?.waitUntil)env.__EXECUTION_CTX.waitUntil(runIntelligenceMeshScheduler(env,{limit:1}).catch(()=>null));
      await recordDemand(env,'wallet-common-token-index','wallet-comparison',`${wallet}:${compareWallet}`,Date.now()-started).catch(()=>null);
      return json({ok:true,comparison:result});
    }
    const index=await buildWalletTokenIndex(env,wallet,{limit});
    const jobs=[];
    if(Number(index.coverage?.complete_to_genesis)!==1)jobs.push(Object.freeze({wallet,...await queueHistoryJob(env,wallet,{pageSize:25})}));
    const result=Object.freeze({...index,indexing:Object.freeze({requested:jobs.length>0,jobs:Object.freeze(jobs)})});
    if(jobs.length&&env.__EXECUTION_CTX?.waitUntil)env.__EXECUTION_CTX.waitUntil(runIntelligenceMeshScheduler(env,{limit:1}).catch(()=>null));
    await recordDemand(env,'wallet-token-index','wallet',wallet,Date.now()-started).catch(()=>null);
    return json({ok:true,index:result});
  }
  catch(error){const code=s(error?.message||error);return json({ok:false,error:code},code==='intelligence_db_unavailable'?503:400);}
}


