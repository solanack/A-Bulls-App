/* Verified PONS launch-origin index for Robinhood Chain (EVM chain 4663).
 * Public reads are D1-only. RPC calls occur only in protected/scheduled indexing.
 * This module never signs, submits, quotes, swaps, launches, or connects wallets.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';

const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const bool=value=>s(value).toLowerCase()==='true';
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const EVM_ADDRESS_RE=/^0x[0-9a-fA-F]{40}$/;
const HASH_RE=/^0x[0-9a-fA-F]{64}$/;
const ZERO_ADDRESS='0x0000000000000000000000000000000000000000';

export const PONS_CHAIN_ID=4663;
export const PONS_FACTORIES=Object.freeze([
  Object.freeze({version:'v1',address:'0xa5aab3f0c6eeadf30ef1d3eb997108e976351feb',topic:'0xdb51ea9ad51ab453a65a4cb7e60c3cb378c9501bb002609f8f97778fb6c4235a'}),
  Object.freeze({version:'v2',address:'0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e',topic:'0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607'})
]);

function wordList(data){
  const hex=s(data).replace(/^0x/,'');
  if(!hex||hex.length%64!==0||!/^[0-9a-fA-F]+$/.test(hex))return[];
  return Array.from({length:hex.length/64},(_,index)=>hex.slice(index*64,(index+1)*64));
}
function addressWord(word){
  const value=`0x${s(word).slice(-40)}`.toLowerCase();
  return EVM_ADDRESS_RE.test(value)?value:null;
}
function topicAddress(topic){return addressWord(s(topic).replace(/^0x/,''));}
function uintWord(word){return word?BigInt(`0x${word}`).toString(10):null;}
function hexNumber(value){return Math.max(0,Number.parseInt(s(value).replace(/^0x/,''),16)||0);}

export function decodePonsLaunchLog(log={}){
  const factory=s(log.address).toLowerCase();
  const definition=PONS_FACTORIES.find(item=>item.address===factory);
  if(!definition)return null;
  const topics=Array.isArray(log.topics)?log.topics.map(value=>s(value).toLowerCase()):[];
  if(topics[0]!==definition.topic||topics.length<4)return null;
  const words=wordList(log.data);
  const token=topicAddress(topics[1]);
  const txHash=s(log.transactionHash).toLowerCase();
  const blockHash=s(log.blockHash).toLowerCase();
  if(!token||token===ZERO_ADDRESS||!HASH_RE.test(txHash)||!HASH_RE.test(blockHash))return null;
  if(definition.version==='v2'){
    if(words.length<3)return null;
    const curve=topicAddress(topics[2]),deployer=topicAddress(topics[3]),pairToken=addressWord(words[0]);
    if(!curve||!deployer||!pairToken)return null;
    return Object.freeze({token,factory,factoryVersion:'v2',curve,deployer,dexFactory:null,pairToken,pool:null,launchConfigId:uintWord(words[1]),graduationThreshold:uintWord(words[2]),positionId:null,restrictionsEndBlock:null,initialBuyAmount:null,transactionHash:txHash,logIndex:hexNumber(log.logIndex),blockNumber:hexNumber(log.blockNumber),blockHash});
  }
  if(words.length<7)return null;
  const deployer=topicAddress(topics[2]),dexFactory=topicAddress(topics[3]),pairToken=addressWord(words[0]),pool=addressWord(words[1]);
  if(!deployer||!dexFactory||!pairToken||!pool)return null;
  return Object.freeze({token,factory,factoryVersion:'v1',curve:null,deployer,dexFactory,pairToken,pool,launchConfigId:uintWord(words[3]),graduationThreshold:null,positionId:uintWord(words[4]),restrictionsEndBlock:uintWord(words[5]),initialBuyAmount:uintWord(words[6]),transactionHash:txHash,logIndex:hexNumber(log.logIndex),blockNumber:hexNumber(log.blockNumber),blockHash});
}

async function rpc(env,method,params=[]){
  const endpoint=s(env.PONS_RPC_URL);
  if(!endpoint)throw new Error('pons_rpc_unconfigured');
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  if(!response.ok)throw new Error(`pons_rpc_http_${response.status}`);
  const body=await response.json();
  if(body?.error)throw new Error(`pons_rpc_${s(body.error.code)||'error'}`);
  return body?.result;
}

async function persistLaunch(db,launch,{blockTime,finality,now}){
  await db.prepare(`INSERT INTO pons_launches(token,factory,factory_version,curve,deployer,dex_factory,pair_token,pool,launch_config_id,graduation_threshold,position_id,restrictions_end_block,initial_buy_amount,transaction_hash,log_index,block_number,block_hash,block_time,finality,launch_state,observed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'launched',?,?) ON CONFLICT(token) DO UPDATE SET factory=excluded.factory,factory_version=excluded.factory_version,curve=excluded.curve,deployer=excluded.deployer,dex_factory=excluded.dex_factory,pair_token=excluded.pair_token,pool=excluded.pool,launch_config_id=excluded.launch_config_id,graduation_threshold=excluded.graduation_threshold,position_id=excluded.position_id,restrictions_end_block=excluded.restrictions_end_block,initial_buy_amount=excluded.initial_buy_amount,transaction_hash=excluded.transaction_hash,log_index=excluded.log_index,block_number=excluded.block_number,block_hash=excluded.block_hash,block_time=excluded.block_time,finality=excluded.finality,updated_at=excluded.updated_at`).bind(launch.token,launch.factory,launch.factoryVersion,launch.curve,launch.deployer,launch.dexFactory,launch.pairToken,launch.pool,launch.launchConfigId,launch.graduationThreshold,launch.positionId,launch.restrictionsEndBlock,launch.initialBuyAmount,launch.transactionHash,launch.logIndex,launch.blockNumber,launch.blockHash,blockTime,finality,now,now).run();
  await db.prepare(`INSERT INTO intelligence_universe_membership(universe_id,entity_kind,entity_id,rank,active,qualifying_cycles,first_entered_at,last_entered_at,last_seen_at,last_exited_at,entry_count,source_snapshot_id,metadata_json) VALUES('pons','token',?,NULL,1,1,?,?,?,NULL,1,?,?) ON CONFLICT(universe_id,entity_kind,entity_id) DO UPDATE SET active=1,last_seen_at=MAX(last_seen_at,excluded.last_seen_at),metadata_json=excluded.metadata_json`).bind(launch.token,blockTime||now,blockTime||now,blockTime||now,`pons:${launch.transactionHash}:${launch.logIndex}`,JSON.stringify({originGalaxyId:'pons',chainId:PONS_CHAIN_ID,factory:launch.factory,factoryVersion:launch.factoryVersion,deployer:launch.deployer,pairToken:launch.pairToken,pool:launch.pool,curve:launch.curve,transactionHash:launch.transactionHash,blockNumber:launch.blockNumber,finality})).run();
}

export function normalizePonsMarketPairs(token,pairs=[],observedAt=Date.now()){
  const target=s(token).toLowerCase();
  const candidates=(Array.isArray(pairs)?pairs:[]).filter(pair=>{
    const chain=s(pair?.chainId).toLowerCase();
    const base=s(pair?.baseToken?.address).toLowerCase();
    return chain==='robinhood'&&base===target;
  });
  candidates.sort((a,b)=>n(b?.liquidity?.usd)-n(a?.liquidity?.usd));
  const pair=candidates[0];if(!pair)return null;
  const finiteOrNull=value=>Number.isFinite(Number(value))?Number(value):null;
  return Object.freeze({source:'dexscreener-token-pairs',observedAt,pairAddress:EVM_ADDRESS_RE.test(s(pair.pairAddress))?s(pair.pairAddress).toLowerCase():null,dexId:s(pair.dexId)||null,url:s(pair.url).slice(0,600)||null,symbol:s(pair.baseToken?.symbol).slice(0,32)||null,name:s(pair.baseToken?.name).slice(0,120)||null,priceUsd:finiteOrNull(pair.priceUsd),liquidityUsd:finiteOrNull(pair.liquidity?.usd),volumeH24:finiteOrNull(pair.volume?.h24),priceChangeH24:finiteOrNull(pair.priceChange?.h24),buysH24:finiteOrNull(pair.txns?.h24?.buys),sellsH24:finiteOrNull(pair.txns?.h24?.sells)});
}

async function enrichPonsMarkets(env,db,tokens=[],now=Date.now()){
  if(!bool(env.PONS_MARKET_ENRICH_ENABLED))return 0;
  const limit=Math.max(1,Math.min(8,Math.trunc(n(env.PONS_MARKET_ENRICH_LIMIT)||4)));
  let enriched=0;
  for(const token of [...new Set(tokens)].slice(0,limit)){
    try{
      const response=await fetch(`https://api.dexscreener.com/token-pairs/v1/robinhood/${encodeURIComponent(token)}`,{headers:{accept:'application/json'}});
      if(!response.ok)continue;
      const market=normalizePonsMarketPairs(token,await response.json(),now);
      if(!market)continue;
      await db.prepare('UPDATE pons_launches SET market_json=?,updated_at=? WHERE token=?').bind(JSON.stringify(market),Math.floor(now/1000),token).run();
      enriched+=1;
    }catch{/* Market enrichment is optional; verified origin indexing continues. */}
  }
  return enriched;
}

export async function maintainPonsIndex(env={},now=Math.floor(Date.now()/1000)){
  if(!bool(env.PONS_INDEX_ENABLED))return Object.freeze({enabled:false});
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const head=hexNumber(await rpc(env,'eth_blockNumber'));
  const confirmations=Math.max(1,Math.min(500,Math.trunc(n(env.PONS_CONFIRMATIONS)||64)));
  const finalHead=Math.max(0,head-confirmations);
  const startBlock=Math.max(0,Math.trunc(n(env.PONS_START_BLOCK)));
  if(!startBlock)return Object.freeze({enabled:true,indexed:0,head,finalHead,waitingFor:'PONS_START_BLOCK'});
  const chunk=Math.max(10,Math.min(2000,Math.trunc(n(env.PONS_BLOCK_CHUNK)||500)));
  const rewind=Math.max(2,Math.min(1000,Math.trunc(n(env.PONS_REORG_REWIND)||32)));
  let indexed=0,enriched=0;
  for(const definition of PONS_FACTORIES){
    const state=await db.prepare('SELECT last_scanned_block FROM pons_index_state WHERE factory=?').bind(definition.address).first();
    const from=Math.max(startBlock,(Math.trunc(n(state?.last_scanned_block))||startBlock)-rewind);
    const to=Math.min(finalHead,from+chunk-1);
    if(to<from)continue;
    const logs=await rpc(env,'eth_getLogs',[{address:definition.address,fromBlock:`0x${from.toString(16)}`,toBlock:`0x${to.toString(16)}`,topics:[definition.topic]}]);
    const previous=(await db.prepare('SELECT token,market_json FROM pons_launches WHERE factory=? AND block_number BETWEEN ? AND ?').bind(definition.address,from,to).all())?.results||[];
    const previousMarket=new Map(previous.map(row=>[s(row.token).toLowerCase(),s(row.market_json)]));
    await db.prepare('DELETE FROM pons_launches WHERE factory=? AND block_number BETWEEN ? AND ?').bind(definition.address,from,to).run();
    const restored=[];
    for(const raw of(Array.isArray(logs)?logs:[])){
      const launch=decodePonsLaunchLog(raw);if(!launch)continue;
      const block=await rpc(env,'eth_getBlockByNumber',[`0x${launch.blockNumber.toString(16)}`,false]);
      const blockTime=hexNumber(block?.timestamp)||null;
      await persistLaunch(db,launch,{blockTime,finality:'confirmation-buffered',now});
      const market=previousMarket.get(launch.token);if(market&&market!=='{}')await db.prepare('UPDATE pons_launches SET market_json=? WHERE token=?').bind(market,launch.token).run();
      indexed+=1;restored.push(launch.token);
    }
    const restoredSet=new Set(restored);
    for(const row of previous){const token=s(row.token).toLowerCase();if(!restoredSet.has(token))await db.prepare(`UPDATE intelligence_universe_membership SET active=0,last_exited_at=?,last_seen_at=? WHERE universe_id='pons' AND entity_kind='token' AND entity_id=?`).bind(now,now,token).run();}
    enriched+=await enrichPonsMarkets(env,db,restored,now*1000);
    const block=await rpc(env,'eth_getBlockByNumber',[`0x${to.toString(16)}`,false]);
    await db.prepare(`INSERT INTO pons_index_state(factory,factory_version,last_scanned_block,last_scanned_hash,last_success_at,last_error,updated_at) VALUES(?,?,?,?,?,NULL,?) ON CONFLICT(factory) DO UPDATE SET factory_version=excluded.factory_version,last_scanned_block=excluded.last_scanned_block,last_scanned_hash=excluded.last_scanned_hash,last_success_at=excluded.last_success_at,last_error=NULL,updated_at=excluded.updated_at`).bind(definition.address,definition.version,to,s(block?.hash)||null,now,now).run();
  }
  return Object.freeze({enabled:true,indexed,enriched,head,finalHead,confirmations});
}

async function galaxyPayload(env,limit){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const rows=(await db.prepare(`SELECT token,factory,factory_version,curve,deployer,dex_factory,pair_token,pool,launch_config_id,graduation_threshold,position_id,restrictions_end_block,initial_buy_amount,transaction_hash,log_index,block_number,block_hash,block_time,finality,launch_state,market_json,updated_at FROM pons_launches ORDER BY COALESCE(block_time,0) DESC,block_number DESC,log_index DESC LIMIT ?`).bind(limit).all())?.results||[];
  const states=(await db.prepare('SELECT factory,factory_version,last_scanned_block,last_scanned_hash,last_success_at,last_error FROM pons_index_state ORDER BY factory_version').all())?.results||[];
  return {schemaVersion:'pons-galaxy-v1',generatedAt:Date.now(),readOnly:true,chain:{id:PONS_CHAIN_ID,name:'Robinhood Chain'},coverage:{complete:false,statement:'Membership requires a decoded TokenLaunched event from an allowlisted PONS V1 or V2 factory. Blocks use a configurable confirmation buffer; this does not claim Ethereum finality. Missing data is unavailable.',factories:PONS_FACTORIES,indexState:states},launches:rows.map(row=>({token:s(row.token),factory:s(row.factory),factoryVersion:s(row.factory_version),curve:s(row.curve)||null,deployer:s(row.deployer),dexFactory:s(row.dex_factory)||null,pairToken:s(row.pair_token),pool:s(row.pool)||null,launchConfigId:row.launch_config_id==null?null:s(row.launch_config_id),graduationThreshold:row.graduation_threshold==null?null:s(row.graduation_threshold),positionId:row.position_id==null?null:s(row.position_id),restrictionsEndBlock:row.restrictions_end_block==null?null:s(row.restrictions_end_block),initialBuyAmount:row.initial_buy_amount==null?null:s(row.initial_buy_amount),transactionHash:s(row.transaction_hash),logIndex:n(row.log_index),blockNumber:n(row.block_number),blockHash:s(row.block_hash),blockTime:row.block_time==null?null:n(row.block_time)*1000,finality:s(row.finality),state:s(row.launch_state)||'launched',market:(()=>{try{return JSON.parse(s(row.market_json)||'{}');}catch{return{};}})(),updatedAt:n(row.updated_at)*1000}))};
}

export async function handlePonsGalaxyRequest(request,env={}){
  const url=new URL(request.url),path=url.pathname;
  if(!path.startsWith('/api/intelligence/pons/'))return null;
  if(!bool(env.PONS_GALAXY_ENABLED))return json({ok:false,error:'feature_disabled'},404);
  if(path==='/api/intelligence/pons/index'){
    if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
    const expected=s(env.PONS_INDEX_SECRET),provided=s(request.headers.get('authorization')).replace(/^Bearer\s+/i,'');
    if(!expected||provided!==expected)return json({ok:false,error:'unauthorized'},401);
    try{return json({ok:true,result:await maintainPonsIndex(env)},202);}catch(error){return json({ok:false,error:s(error?.message||error)},503);}
  }
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  if(path==='/api/intelligence/pons/galaxy'){
    const limit=Math.max(1,Math.min(500,Math.trunc(n(url.searchParams.get('limit'))||250)));
    try{return json({ok:true,data:await galaxyPayload(env,limit)},200,'public, max-age=15, stale-while-revalidate=60');}catch(error){return json({ok:false,error:s(error?.message||error)},503);}
  }
  return json({ok:false,error:'not_found'},404);
}

export const __ponsGalaxyContract=Object.freeze({chainId:PONS_CHAIN_ID,factories:PONS_FACTORIES,readOnly:true,publicPath:'/api/intelligence/pons/galaxy',internalPath:'/api/intelligence/pons/index'});
