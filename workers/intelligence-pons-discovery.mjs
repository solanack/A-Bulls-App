/* A Bulls App — verified PONS launch discovery backfill.
 *
 * The forward RPC cursor intentionally stays narrow for cost/reorg control. This
 * companion backfill walks historical ranges newest-to-oldest using either the
 * authenticated Blockscout multichain API or bounded Robinhood RPC eth_getLogs.
 * Both paths filter by the allowlisted factory + exact TokenLaunched topic.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { providerFetch } from './intelligence-fetch.mjs';
import { ponsRpc } from './intelligence-pons-rpc.mjs';
import { PONS_FACTORIES, decodePonsLaunchLog } from './intelligence-pons-galaxy.mjs';

const BLOCKSCOUT_LEGACY='https://robinhoodchain.blockscout.com/api';
const BLOCKSCOUT_PRO='https://api.blockscout.com/v2/api';
const RESULT_LIMIT=1000;
const MAX_RPC_SPLIT_DEPTH=12;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,fallback,min,max)=>Math.max(min,Math.min(max,Math.trunc(n(value)||fallback)));
const hexInt=value=>{const text=s(value);if(!text)return 0;const parsed=text.startsWith('0x')?Number.parseInt(text,16):Number(text);return Number.isFinite(parsed)?Math.max(0,Math.trunc(parsed)):0;};
const unix=value=>{if(value==null||value==='')return null;const numeric=hexInt(value);if(numeric>0)return numeric;const ms=Date.parse(s(value));return Number.isFinite(ms)?Math.floor(ms/1000):null;};

// Conservative lower bounds. V1's published start block is 8,991,118. V2 is
// observed after block 26m; starting earlier is safe and preserves provenance.
export const PONS_DISCOVERY_SPECS=Object.freeze({
  v1:Object.freeze({startBlock:8_900_000}),
  v2:Object.freeze({startBlock:26_000_000})
});

export function buildFilteredPonsLogsUrl(factory,fromBlock,toBlock){
  const url=new URL(BLOCKSCOUT_LEGACY);
  url.searchParams.set('module','logs');
  url.searchParams.set('action','getLogs');
  url.searchParams.set('fromBlock',String(Math.max(0,Math.trunc(fromBlock))));
  url.searchParams.set('toBlock',String(Math.max(0,Math.trunc(toBlock))));
  url.searchParams.set('address',factory.address);
  url.searchParams.set('topic0',factory.topic);
  return url.toString();
}

export function buildPonsProLogsUrl(factory,fromBlock,toBlock,apiKey){
  const url=new URL(BLOCKSCOUT_PRO);
  url.searchParams.set('chain_id','4663');
  url.searchParams.set('module','logs');
  url.searchParams.set('action','getLogs');
  url.searchParams.set('fromBlock',String(Math.max(0,Math.trunc(fromBlock))));
  url.searchParams.set('toBlock',String(Math.max(0,Math.trunc(toBlock))));
  url.searchParams.set('address',factory.address);
  url.searchParams.set('topic0',factory.topic);
  url.searchParams.set('apikey',s(apiKey));
  return url.toString();
}

function normalizeLog(factory,row={}){
  return {
    address:s(row.address||factory.address).toLowerCase(),
    topics:Array.isArray(row.topics)?row.topics.map(value=>s(value).toLowerCase()):[],
    data:s(row.data)||'0x',
    transactionHash:s(row.transactionHash??row.transaction_hash).toLowerCase(),
    blockHash:s(row.blockHash??row.block_hash).toLowerCase(),
    blockNumber:`0x${hexInt(row.blockNumber??row.block_number).toString(16)}`,
    logIndex:`0x${hexInt(row.logIndex??row.log_index??row.index).toString(16)}`,
    timestamp:row.timeStamp??row.timestamp??row.block_timestamp??null
  };
}

export function parseBlockscoutLogsPayload(payload){
  if(Array.isArray(payload))return payload;
  if(Array.isArray(payload?.result))return payload.result;
  const result=s(payload?.result),message=s(payload?.message).toLowerCase();
  if(!result||/no records|no logs|not found/i.test(result)||message.includes('no records'))return [];
  throw new Error(`pons_blockscout_logs_${s(payload?.message)||result||'invalid_response'}`);
}

async function fetchBlockscoutRange(factory,fromBlock,toBlock,apiKey,fetchImpl=providerFetch,depth=0){
  const response=await fetchImpl(buildPonsProLogsUrl(factory,fromBlock,toBlock,apiKey),{headers:{accept:'application/json','user-agent':'A-Bulls-App/1.0 (+https://abullsapp.com)'},signal:AbortSignal.timeout(10_000)});
  if(!response.ok)throw new Error(`pons_blockscout_http_${response.status}`);
  const rows=parseBlockscoutLogsPayload(await response.json());
  if(rows.length<RESULT_LIMIT)return rows;
  if(fromBlock>=toBlock||depth>=10)throw new Error('pons_blockscout_range_truncated');
  const middle=Math.floor((fromBlock+toBlock)/2);
  const [left,right]=await Promise.all([
    fetchBlockscoutRange(factory,fromBlock,middle,apiKey,fetchImpl,depth+1),
    fetchBlockscoutRange(factory,middle+1,toBlock,apiKey,fetchImpl,depth+1)
  ]);
  return [...left,...right];
}

async function fetchRpcRange(env,factory,fromBlock,toBlock,rpcImpl=ponsRpc,depth=0){
  try{
    const rows=await rpcImpl(env,'eth_getLogs',[{address:factory.address,fromBlock:`0x${fromBlock.toString(16)}`,toBlock:`0x${toBlock.toString(16)}`,topics:[factory.topic]}]);
    if(!Array.isArray(rows))throw new Error('pons_rpc_invalid_logs');
    return rows;
  }catch(error){
    if(fromBlock>=toBlock||depth>=MAX_RPC_SPLIT_DEPTH)throw error;
    const middle=Math.floor((fromBlock+toBlock)/2);
    const left=await fetchRpcRange(env,factory,fromBlock,middle,rpcImpl,depth+1);
    const right=await fetchRpcRange(env,factory,middle+1,toBlock,rpcImpl,depth+1);
    return [...left,...right];
  }
}

export async function fetchPonsDiscoveryRange(env,factory,fromBlock,toBlock,options={}){
  const apiKey=s(env.PONS_BLOCKSCOUT_API_KEY||env.BLOCKSCOUT_API_KEY);
  if(apiKey){
    try{return Object.freeze({rows:await fetchBlockscoutRange(factory,fromBlock,toBlock,apiKey,options.fetchImpl||providerFetch),source:'blockscout-pro-topic-filtered'});}
    catch(error){console.warn('[pons-discovery-blockscout]',s(error?.message||error));}
  }
  const rows=await fetchRpcRange(env,factory,fromBlock,toBlock,options.rpcImpl||ponsRpc);
  return Object.freeze({rows,source:'robinhood-rpc-topic-filtered'});
}

async function persistLaunch(db,factory,row,now,source){
  const raw=normalizeLog(factory,row),launch=decodePonsLaunchLog(raw);
  if(!launch)return false;
  const blockTime=unix(raw.timestamp);
  await db.prepare(`INSERT INTO pons_launches(token,factory,factory_version,curve,deployer,dex_factory,pair_token,pool,launch_config_id,graduation_threshold,position_id,restrictions_end_block,initial_buy_amount,transaction_hash,log_index,block_number,block_hash,block_time,finality,launch_state,observed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'launched',?,?) ON CONFLICT(token) DO UPDATE SET factory=excluded.factory,factory_version=excluded.factory_version,curve=excluded.curve,deployer=excluded.deployer,dex_factory=excluded.dex_factory,pair_token=excluded.pair_token,pool=COALESCE(excluded.pool,pons_launches.pool),launch_config_id=COALESCE(excluded.launch_config_id,pons_launches.launch_config_id),graduation_threshold=COALESCE(excluded.graduation_threshold,pons_launches.graduation_threshold),position_id=COALESCE(excluded.position_id,pons_launches.position_id),restrictions_end_block=COALESCE(excluded.restrictions_end_block,pons_launches.restrictions_end_block),initial_buy_amount=COALESCE(excluded.initial_buy_amount,pons_launches.initial_buy_amount),transaction_hash=excluded.transaction_hash,log_index=excluded.log_index,block_number=excluded.block_number,block_hash=excluded.block_hash,block_time=COALESCE(excluded.block_time,pons_launches.block_time),finality=excluded.finality,updated_at=excluded.updated_at`).bind(launch.token,launch.factory,launch.factoryVersion,launch.curve,launch.deployer,launch.dexFactory,launch.pairToken,launch.pool,launch.launchConfigId,launch.graduationThreshold,launch.positionId,launch.restrictionsEndBlock,launch.initialBuyAmount,launch.transactionHash,launch.logIndex,launch.blockNumber,launch.blockHash,blockTime,source,now,now).run();
  return true;
}

async function stateFor(db,factory,startBlock,head){
  const existing=await db.prepare('SELECT * FROM pons_discovery_state WHERE factory=?').bind(factory.address).first();
  if(existing)return existing;
  await db.prepare(`INSERT INTO pons_discovery_state(factory,factory_version,start_block,next_to_block,complete,discovered_launches,last_success_at,last_error,updated_at) VALUES(?,?,?,?,0,0,NULL,NULL,unixepoch())`).bind(factory.address,factory.version,startBlock,head).run();
  return {factory:factory.address,factory_version:factory.version,start_block:startBlock,next_to_block:head,complete:0,discovered_launches:0};
}

async function patchState(db,factory,patch={}){
  await db.prepare(`UPDATE pons_discovery_state SET next_to_block=?,complete=?,discovered_launches=discovered_launches+?,last_success_at=?,last_error=?,updated_at=unixepoch() WHERE factory=?`).bind(patch.nextToBlock??null,patch.complete?1:0,Math.max(0,Math.trunc(n(patch.discovered))),patch.lastSuccessAt??null,patch.error??null,factory.address).run();
}

export async function backfillPonsLaunchDiscovery(env={},options={}){
  if(s(env.PONS_GALAXY_ENABLED).toLowerCase()!=='true'||s(env.PONS_INDEX_ENABLED).toLowerCase()!=='true')return Object.freeze({enabled:false});
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const head=hexInt(await ponsRpc(env,'eth_blockNumber'));
  const confirmations=clamp(env.PONS_CONFIRMATIONS,64,1,500),finalHead=Math.max(0,head-confirmations);
  const hasBlockscoutKey=Boolean(s(env.PONS_BLOCKSCOUT_API_KEY||env.BLOCKSCOUT_API_KEY));
  const chunkDefault=hasBlockscoutKey?2_000_000:100_000;
  const chunksDefault=hasBlockscoutKey?4:2;
  const chunkSize=clamp(options.chunkSize??env.PONS_DISCOVERY_CHUNK_BLOCKS,chunkDefault,2_000,5_000_000);
  const chunksPerFactory=clamp(options.chunksPerFactory??env.PONS_DISCOVERY_CHUNKS_PER_RUN,chunksDefault,1,8);
  const now=Math.floor(Date.now()/1000),factories=[];

  for(const factory of PONS_FACTORIES){
    const startBlock=PONS_DISCOVERY_SPECS[factory.version]?.startBlock??0;
    let state;
    try{state=await stateFor(db,factory,startBlock,finalHead);}catch(error){factories.push({factory:factory.address,version:factory.version,error:s(error?.message||error),migrationRequired:true});continue;}
    if(n(state.complete)===1){factories.push({factory:factory.address,version:factory.version,complete:true,discovered:0,nextToBlock:null});continue;}
    let to=Math.min(finalHead,Math.max(startBlock,n(state.next_to_block)||finalHead)),discovered=0,processed=0,error=null,lastSource=null;
    for(let pass=0;pass<chunksPerFactory&&to>=startBlock;pass+=1){
      const from=Math.max(startBlock,to-chunkSize+1);
      try{
        const result=await fetchPonsDiscoveryRange(env,factory,from,to,options);
        lastSource=result.source;
        for(const row of result.rows)if(await persistLaunch(db,factory,row,now,result.source))discovered+=1;
        processed+=1;
        to=from-1;
        await patchState(db,factory,{nextToBlock:to>=startBlock?to:null,complete:to<startBlock,discovered,lastSuccessAt:now,error:null});
        discovered=0;
      }catch(cause){error=s(cause?.message||cause);await patchState(db,factory,{nextToBlock:to,complete:false,discovered:0,lastSuccessAt:state.last_success_at??null,error});break;}
    }
    const latest=await db.prepare('SELECT next_to_block,complete,discovered_launches,last_error FROM pons_discovery_state WHERE factory=?').bind(factory.address).first();
    factories.push({factory:factory.address,version:factory.version,processed,complete:n(latest?.complete)===1,nextToBlock:latest?.next_to_block??null,discovered:n(latest?.discovered_launches),source:lastSource,error:error||latest?.last_error||null});
  }
  const total=n((await db.prepare('SELECT COUNT(*) count FROM pons_launches').first())?.count);
  return Object.freeze({enabled:true,head,finalHead,chunkSize,chunksPerFactory,sourceMode:hasBlockscoutKey?'blockscout-pro-with-rpc-fallback':'bounded-rpc',totalLaunches:total,factories});
}

export const __ponsDiscoveryContract=Object.freeze({readOnly:true,source:'blockscout-pro-or-bounded-rpc',direction:'newest-to-oldest',resultLimit:RESULT_LIMIT,chainId:4663});
