/* Chain evidence adapters for Replay reconstruction.
 * All methods are read-only. Provider discovery never upgrades a claim to
 * observed fact until a chain receipt/signature is independently resolved.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { providerFetch } from './intelligence-fetch.mjs';
import { backfillHistoryPass } from './intelligence-history-engine.mjs';
import { canonicalChainAddress,normalizeChainKey,providerChainConfig,resolveChain,rpcCandidatesForChain } from './intelligence-chain-registry.mjs';

const TRANSFER_TOPIC='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const EVM_TX=/^0x[a-fA-F0-9]{64}$/;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const bool=value=>['1','true','yes','on'].includes(s(value).toLowerCase());
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const hex=value=>{const raw=s(value);if(!/^0x[0-9a-f]+$/i.test(raw))return null;const parsed=Number.parseInt(raw,16);return Number.isSafeInteger(parsed)?parsed:null;};

export function chainAdapterCapabilities(env={},chain='solana',address=''){
  const key=normalizeChainKey(chain),definition=resolveChain(key,{address}),rpc=definition?.kind==='evm'?rpcCandidatesForChain(env,key,address):[],helius=key==='solana'&&Boolean(s(env.HELIUS_API_KEY)),goldrush=Boolean(s(env.GOLDRUSH_API_KEY));
  const wsKey=key.toUpperCase().replace(/-/g,'_')+'_WS_URL';
  const stream=key==='solana'
    ?(bool(env.HELIUS_LASERSTREAM_ENABLED)&&helius?'helius-laserstream':bool(env.FULL_CHAIN_STREAM_ENABLED)?'external-stream':'none')
    :(goldrush&&bool(env.GOLDRUSH_WALLET_STREAM_ENABLED)?'goldrush-wallet-stream':s(env[wsKey])?'chain-websocket':'none');
  return Object.freeze({
    chain:key,kind:definition?.kind??'unknown',chainId:definition?.chainId??null,
    history:key==='solana'?(helius?'helius-getTransactionsForAddress':'standard-solana-rpc'):(goldrush?'goldrush+rpc-verification':rpc.length?'rpc-log-reconciliation':'unconfigured'),
    rpcConfigured:definition?.kind==='svm'?helius||Boolean(s(env.SOLANA_RPC_URL)):rpc.some(item=>item.source.startsWith('env:')),
    rpcFallbackAvailable:definition?.kind==='evm'&&rpc.some(item=>item.source.startsWith('public:')),
    stream,market:providerChainConfig(key,address,env)?.geckoNetworks?.length?'coingecko/geckoterminal':'unconfigured',
    canReconcile:Boolean(definition?.kind==='svm'?helius||s(env.SOLANA_RPC_URL):rpc.length),
    readOnly:true
  });
}

export function erc20TopicAddress(address=''){
  const value=canonicalChainAddress('ethereum',address);return value?'0x'+value.slice(2).padStart(64,'0'):null;
}

async function evmRpc(url,method,params,fetchImpl=providerFetch){
  const response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json','user-agent':'A-Bulls-App/1.0'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  if(!response?.ok)throw new Error('rpc_http_'+String(response?.status||0));const body=await response.json();if(body?.error)throw new Error('rpc_'+(s(body.error.code)||'error')+':'+s(body.error.message));return body?.result??null;
}

async function blockByNumber(url,number,fetchImpl,cache){
  const key=Math.max(0,Math.trunc(number));if(cache.has(key))return cache.get(key);
  const block=await evmRpc(url,'eth_getBlockByNumber',['0x'+key.toString(16),false],fetchImpl),row=block?{number:hex(block.number)??key,timestamp:hex(block.timestamp)??0}:null;cache.set(key,row);return row;
}

async function blockRangeForTime(url,from,to,fetchImpl){
  const latestHex=await evmRpc(url,'eth_blockNumber',[],fetchImpl),latest=hex(latestHex);if(!(latest>=0))throw new Error('rpc_latest_block_unavailable');
  const cache=new Map(),latestRow=await blockByNumber(url,latest,fetchImpl,cache);if(!latestRow?.timestamp)throw new Error('rpc_latest_block_time_unavailable');
  async function locate(target){
    let low=0,high=latest,best=latest;
    for(let step=0;step<24&&low<=high;step+=1){const mid=Math.floor((low+high)/2),row=await blockByNumber(url,mid,fetchImpl,cache);if(!row){low=mid+1;continue;}if(row.timestamp>=target){best=mid;high=mid-1;}else low=mid+1;}
    return Math.max(0,best);
  }
  const fromBlock=await locate(Math.max(0,Math.trunc(from))),toBlock=await locate(Math.max(0,Math.trunc(to))+1);
  return Object.freeze({fromBlock:Math.max(0,Math.min(fromBlock,toBlock)),toBlock:Math.max(fromBlock,Math.min(latest,toBlock+1)),cache});
}

function parseTransferAmount(data=''){const raw=s(data);if(!/^0x[0-9a-f]*$/i.test(raw))return 0n;try{return BigInt(raw);}catch{return 0n;}}
function sideForTransfers(incoming,outgoing){const net=incoming-outgoing;if(net>0n)return'buy';if(net<0n)return'sell';return null;}


const GOLDRUSH_CHAIN=Object.freeze({ethereum:'eth-mainnet',base:'base-mainnet',bsc:'bsc-mainnet',monad:'monad-mainnet',robinhood:'robinhood-mainnet'});
function decodedParam(event,name){const params=Array.isArray(event?.decoded?.params)?event.decoded.params:[],row=params.find(item=>s(item?.name).toLowerCase()===name.toLowerCase());return s(row?.value);}
function goldRushTransferSide(event,wallet){
  if(s(event?.decoded?.name).toLowerCase()!=='transfer')return null;const from=decodedParam(event,'from').toLowerCase(),to=decodedParam(event,'to').toLowerCase(),wanted=s(wallet).toLowerCase();if(to===wanted&&from!==wanted)return'buy';if(from===wanted&&to!==wanted)return'sell';return null;
}
export async function discoverGoldRushWalletTokenActivity(env={},input={}, {fetchImpl=providerFetch}={}){
  const key=s(env.GOLDRUSH_API_KEY),chain=normalizeChainKey(input.chain),slug=GOLDRUSH_CHAIN[chain],wallet=canonicalChainAddress(chain,input.wallet),token=canonicalChainAddress(chain,input.token??input.mint),at=Math.max(0,Math.trunc(n(input.at))),windowSeconds=clamp(Math.trunc(n(input.windowSeconds)||900),60,3600);if(!key||!slug||!wallet||!token||!at)return Object.freeze({ok:false,state:'unavailable',reason:key?'goldrush_chain_unsupported':'goldrush_unconfigured'});
  const firstBucket=Math.floor((at-windowSeconds)/900),lastBucket=Math.floor((at+windowSeconds)/900),buckets=[];for(let bucket=firstBucket;bucket<=lastBucket&&buckets.length<9;bucket+=1)buckets.push(bucket);
  const candidates=[];
  for(const bucket of buckets){const url='https://api.covalenthq.com/v1/'+encodeURIComponent(slug)+'/bulk/transactions/'+encodeURIComponent(wallet)+'/'+String(bucket)+'/',response=await fetchImpl(url,{headers:{accept:'application/json',authorization:'Bearer '+key,'user-agent':'A-Bulls-App/1.0'}}).catch(()=>null);if(!response?.ok)continue;const body=await response.json().catch(()=>null),items=Array.isArray(body?.data?.items)?body.data.items:Array.isArray(body?.items)?body.items:[];
    for(const tx of items){const txId=s(tx?.tx_hash).toLowerCase();if(!EVM_TX.test(txId))continue;const blockTime=Math.floor(Date.parse(s(tx?.block_signed_at))/1000);if(!Number.isFinite(blockTime)||Math.abs(blockTime-at)>windowSeconds)continue;const events=Array.isArray(tx?.log_events)?tx.log_events:[],tokenEvents=events.filter(event=>canonicalChainAddress(chain,event?.sender_address)===token);if(!tokenEvents.length)continue;const sides=tokenEvents.map(event=>goldRushTransferSide(event,wallet)).filter(Boolean),side=sides.includes('buy')&&!sides.includes('sell')?'buy':sides.includes('sell')&&!sides.includes('buy')?'sell':null;candidates.push({txId,blockTime,blockNumber:Math.trunc(n(tx?.block_height))||null,side,receiptSuccess:tx?.successful!==false,source:'goldrush-transactions-v3',discoveryOnly:true});}
  }
  const selected=selectReconciliationCandidate(candidates,{at,side:input.side,maxWindowSeconds:windowSeconds});return selected?Object.freeze({ok:true,state:'matched',chain,wallet,token,...selected}):Object.freeze({ok:true,state:candidates.length?'ambiguous-or-direction-mismatch':'unmatched',chain,wallet,token,candidates:candidates.length,source:'goldrush-transactions-v3'});
}

export function selectReconciliationCandidate(candidates=[],{at=0,side='',maxWindowSeconds=900}={}){
  const expected=s(side).toLowerCase()==='entry'?'buy':s(side).toLowerCase()==='exit'?'sell':s(side).toLowerCase(),target=Math.max(0,Math.trunc(n(at))),window=Math.max(30,Math.trunc(n(maxWindowSeconds)||900));
  const ranked=(Array.isArray(candidates)?candidates:[]).map(row=>{const delta=Math.abs(Math.trunc(n(row.blockTime))-target),sideMatch=!expected||row.side===expected,score=(sideMatch?60:0)+Math.max(0,40-Math.min(40,delta/window*40))+(row.receiptSuccess===true?8:0);return{...row,timeDeltaSeconds:delta,sideMatch,score};}).filter(row=>row.sideMatch&&row.timeDeltaSeconds<=window&&EVM_TX.test(s(row.txId))).sort((a,b)=>b.score-a.score||a.timeDeltaSeconds-b.timeDeltaSeconds||s(a.txId).localeCompare(s(b.txId)));
  if(!ranked.length)return null;const best=ranked[0],runner=ranked[1],margin=runner?best.score-runner.score:100,confidence=best.timeDeltaSeconds<=30&&margin>=8?.94:best.timeDeltaSeconds<=120&&margin>=5?.88:best.timeDeltaSeconds<=300&&margin>=3?.82:.74;
  if(runner&&margin<2)return null;
  return Object.freeze({...best,confidence});
}

export async function findEvmWalletTokenActivity(env={},input={}, {fetchImpl=providerFetch}={}){
  const chain=normalizeChainKey(input.chain),wallet=canonicalChainAddress(chain,input.wallet),token=canonicalChainAddress(chain,input.token??input.mint),at=Math.max(0,Math.trunc(n(input.at))),windowSeconds=clamp(Math.trunc(n(input.windowSeconds)||900),60,3600),definition=resolveChain(chain,{address:token});
  if(definition?.kind!=='evm'||!wallet||!token||!at)return Object.freeze({ok:false,state:'unavailable',reason:'invalid_evm_reconciliation_subject'});
  const walletTopic=erc20TopicAddress(wallet),rpc=rpcCandidatesForChain(env,chain,token);if(!walletTopic||!rpc.length)return Object.freeze({ok:false,state:'unavailable',reason:'evm_rpc_unconfigured',chain});
  const goldrush=await discoverGoldRushWalletTokenActivity(env,{chain,wallet,token,at,side:input.side,windowSeconds},{fetchImpl}).catch(()=>null);
  if(goldrush?.state==='matched'){for(const candidate of rpc){try{const receipt=await evmRpc(candidate.url,'eth_getTransactionReceipt',[goldrush.txId],fetchImpl),receiptSuccess=s(receipt?.status).toLowerCase()==='0x1';if(!receiptSuccess)continue;return Object.freeze({...goldrush,receipt,receiptSuccess:true,source:goldrush.source+' + '+candidate.source,verifiedBy:candidate.source});}catch{}}}
  const errors=[];
  for(const candidate of rpc){try{
    const range=await blockRangeForTime(candidate.url,at-windowSeconds,at+windowSeconds,fetchImpl),fromBlock='0x'+range.fromBlock.toString(16),toBlock='0x'+range.toBlock.toString(16),base={address:token,fromBlock,toBlock},responses=await Promise.all([
      evmRpc(candidate.url,'eth_getLogs',[{...base,topics:[TRANSFER_TOPIC,null,walletTopic]}],fetchImpl),
      evmRpc(candidate.url,'eth_getLogs',[{...base,topics:[TRANSFER_TOPIC,walletTopic]}],fetchImpl)
    ]),incomingLogs=responses[0],outgoingLogs=responses[1],byTx=new Map();
    for(const pair of [['in',incomingLogs],['out',outgoingLogs]]){const direction=pair[0],logs=pair[1];for(const log of Array.isArray(logs)?logs:[]){const txId=s(log.transactionHash).toLowerCase();if(!EVM_TX.test(txId))continue;const current=byTx.get(txId)||{txId,blockNumber:hex(log.blockNumber),incoming:0n,outgoing:0n};const amount=parseTransferAmount(log.data);if(direction==='in')current.incoming+=amount;else current.outgoing+=amount;byTx.set(txId,current);}}
    const rows=[];for(const row of byTx.values()){const block=row.blockNumber!=null?await blockByNumber(candidate.url,row.blockNumber,fetchImpl,range.cache):null,receipt=await evmRpc(candidate.url,'eth_getTransactionReceipt',[row.txId],fetchImpl).catch(()=>null),receiptSuccess=s(receipt?.status).toLowerCase()==='0x1';rows.push({...row,blockTime:block?.timestamp||0,side:sideForTransfers(row.incoming,row.outgoing),receiptSuccess,receipt,source:candidate.source});}
    const selected=selectReconciliationCandidate(rows,{at,side:input.side,maxWindowSeconds:windowSeconds});if(selected)return Object.freeze({ok:true,state:'matched',chain,wallet,token,...selected});
    return Object.freeze({ok:true,state:'unmatched',chain,wallet,token,candidates:rows.length,source:candidate.source});
  }catch(error){errors.push(candidate.source+':'+s(error?.message||error));}}
  return Object.freeze({ok:false,state:'unavailable',chain,wallet,token,reason:'evm_reconciliation_failed',errors:Object.freeze(errors)});
}

export async function findSolanaWalletTokenActivity(env={},input={}){
  const chain='solana',wallet=canonicalChainAddress(chain,input.wallet),mint=canonicalChainAddress(chain,input.token??input.mint),at=Math.max(0,Math.trunc(n(input.at))),windowSeconds=clamp(Math.trunc(n(input.windowSeconds)||900),60,3600);if(!wallet||!mint||!at)return Object.freeze({ok:false,state:'unavailable',reason:'invalid_solana_reconciliation_subject'});
  await backfillHistoryPass(env,wallet,{from:at-windowSeconds,to:at+windowSeconds,pageSize:100}).catch(()=>null);
  const db=intelligenceDb(env);if(!db)return Object.freeze({ok:false,state:'unavailable',reason:'intelligence_db_unavailable'});
  const expected=s(input.side).toLowerCase()==='entry'?'buy':s(input.side).toLowerCase()==='exit'?'sell':s(input.side).toLowerCase(),query=['SELECT signature,slot,block_time,token_delta,sol_delta,event_class,source,confidence','FROM bull_wallet_events','WHERE wallet=? AND mint=? AND block_time BETWEEN ? AND ?','ORDER BY ABS(block_time-?) ASC LIMIT 50'].join(' '),result=await db.prepare(query).bind(wallet,mint,at-windowSeconds,at+windowSeconds,at).all().catch(()=>({results:[]})),rows=result?.results||[];
  const candidates=rows.map(row=>{const delta=n(row.token_delta),side=delta>0?'buy':delta<0?'sell':null,timeDeltaSeconds=Math.abs(Math.trunc(n(row.block_time))-at),score=(side===expected?70:0)+Math.max(0,30-timeDeltaSeconds/windowSeconds*30);return{signature:s(row.signature),slot:Math.trunc(n(row.slot)),blockTime:Math.trunc(n(row.block_time)),side,timeDeltaSeconds,score,source:s(row.source),confidence:Number(row.confidence)||.8};}).filter(row=>row.signature&&row.side===expected&&row.timeDeltaSeconds<=windowSeconds).sort((a,b)=>b.score-a.score||a.timeDeltaSeconds-b.timeDeltaSeconds);
  if(!candidates.length)return Object.freeze({ok:true,state:'unmatched',chain,wallet,token,candidates:0});const best=candidates[0],runner=candidates[1];if(runner&&best.score-runner.score<2)return Object.freeze({ok:true,state:'ambiguous',chain,wallet,token,candidates:candidates.length});
  return Object.freeze({ok:true,state:'matched',chain,wallet,token,...best,confidence:Math.max(.82,Math.min(.98,best.confidence))});
}

export async function findWalletTokenActivity(env={},input={},options={}){
  const chain=normalizeChainKey(input.chain??'solana'),definition=resolveChain(chain,{address:input.token??input.mint??''});
  return definition?.kind==='svm'?findSolanaWalletTokenActivity(env,{...input,chain},options):findEvmWalletTokenActivity(env,{...input,chain},options);
}

export function matchDexScreenerPairFromReceipt(chain,token,receipt,pairs=[]){
  const chainKey=normalizeChainKey(chain),asset=canonicalChainAddress(chainKey,token),addresses=new Set((Array.isArray(receipt?.logs)?receipt.logs:[]).map(log=>s(log?.address).toLowerCase()).filter(Boolean));if(!asset||!addresses.size)return null;
  const matches=(Array.isArray(pairs)?pairs:[]).filter(pair=>normalizeChainKey(pair?.chainId)===chainKey&&addresses.has(s(pair?.pairAddress).toLowerCase())&&(canonicalChainAddress(chainKey,pair?.baseToken?.address)===asset||canonicalChainAddress(chainKey,pair?.quoteToken?.address)===asset)).sort((a,b)=>n(b?.liquidity?.usd)-n(a?.liquidity?.usd));
  const pair=matches[0];if(!pair)return null;const base=canonicalChainAddress(chainKey,pair?.baseToken?.address),quote=canonicalChainAddress(chainKey,pair?.quoteToken?.address),quoteAsset=base===asset?quote:base;
  return Object.freeze({chain:chainKey,poolAddress:s(pair.pairAddress).toLowerCase(),dexId:s(pair.dexId)||null,assetAddress:asset,quoteAssetAddress:quoteAsset||null,liquidityUsd:Number(pair?.liquidity?.usd)||null,source:'dexscreener-receipt-pool-match'});
}

export async function resolveEvmVenuePool(env={},input={}, {fetchImpl=providerFetch}={}){
  const chain=normalizeChainKey(input.chain),token=canonicalChainAddress(chain,input.token??input.mint),receipt=input.receipt,provider=providerChainConfig(chain,token,env);if(!token||!provider||!receipt)return null;
  const response=await fetchImpl('https://api.dexscreener.com/tokens/v1/'+encodeURIComponent(provider.dexScreenerId)+'/'+encodeURIComponent(token),{headers:{accept:'application/json','user-agent':'A-Bulls-App/1.0'}}).catch(()=>null);if(!response?.ok)return null;const pairs=await response.json().catch(()=>[]);return matchDexScreenerPairFromReceipt(chain,token,receipt,pairs);
}

export const __chainAdapterContract=Object.freeze({
  version:'chain-evidence-adapter-v1',readOnly:true,
  methods:Object.freeze(['discoverGoldRushWalletTokenActivity','findWalletTokenActivity','resolveEvmVenuePool']),
  solanaHistory:'helius-getTransactionsForAddress-when-configured',
  evmReconciliation:'goldrush-time-bucket-discovery-optional+erc20-transfer-log+receipt',
  exactPool:'receipt-log-address+dexscreener-pair-match',
  noExecution:true
});
