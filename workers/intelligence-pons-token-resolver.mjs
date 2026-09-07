/* Read-only, on-demand token intelligence for Robinhood Chain contracts.
 * This route is independent of PONS Top-25 membership. It never signs a
 * wallet and never upgrades an unavailable signal into a safety claim.
 */
const BITQUERY_ENDPOINT='https://streaming.bitquery.io/graphql';
const DEXSCREENER_ENDPOINT='https://api.dexscreener.com/token-pairs/v1/robinhood';
const EVM_ADDRESS_RE=/^0x[0-9a-fA-F]{40}$/;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):null;
import { ponsRpc } from './intelligence-pons-rpc.mjs';

export function isRobinhoodContractAddress(value){return EVM_ADDRESS_RE.test(s(value));}

export function buildRobinhoodTokenMarketQuery(address){
  const token=s(address).toLowerCase();
  if(!isRobinhoodContractAddress(token))throw new Error('invalid_robinhood_contract');
  return `query RobinhoodTokenSnapshot {\n  Trading {\n    Tokens(\n      limit: {count: 1}\n      orderBy: {descending: Interval_Time_Start}\n      where: {Token: {Address: {is: "${token}"}, NetworkBid: {is: "bid:robinhood"}}, Interval: {Time: {Duration: {eq: 1}}}}\n    ) {\n      Block { Time }\n      Token { Address Symbol Name }\n      Price { Ohlc { Close } }\n      Supply { MarketCap FullyDilutedValuationUsd CirculatingSupply TotalSupply }\n    }\n  }\n}`;
}

export function buildRobinhoodHoldersQuery(address){
  const token=s(address).toLowerCase();
  if(!isRobinhoodContractAddress(token))throw new Error('invalid_robinhood_contract');
  return `query RobinhoodTokenHolders {\n  EVM(dataset: archive, network: robinhood) {\n    Top: Holders(\n      where: {Currency: {SmartContract: {is: "${token}"}}, Balance: {Amount: {gt: "0"}}}\n      limit: {count: 20}\n      orderBy: {descending: Balance_Amount}\n    ) { Holder { Address } Balance { Amount } }\n    Stats: Holders(\n      where: {Currency: {SmartContract: {is: "${token}"}}, Balance: {Amount: {gt: "0"}}}\n    ) { holders: count total: sum(of: Balance_Amount) }\n  }\n}`;
}

async function graphql(env,query,fetchImpl){
  const token=s(env.PONS_BITQUERY_TOKEN||env.BITQUERY_API_TOKEN);
  if(!token)throw new Error('pons_bitquery_unconfigured');
  const response=await fetchImpl(BITQUERY_ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({query})});
  if(!response.ok)throw new Error(`pons_bitquery_http_${response.status}`);
  const body=await response.json();
  if(body?.errors?.length)throw new Error(`pons_bitquery_graphql_${s(body.errors[0]?.message)||'error'}`);
  return body?.data||{};
}

const rpc=(env,method,params,fetchImpl)=>ponsRpc(env,method,params,fetchImpl);

async function cachedRecord(env,address){
  const db=env.INTELLIGENCE_DB;
  if(!db?.prepare)return null;
  try{
    return await db.prepare(`SELECT r.current_rank,r.symbol,r.name,r.market_cap_usd,r.fdv_usd,r.circulating_supply,r.total_supply,r.price_usd,r.market_observed_at,r.market_source,l.factory,l.factory_version,l.deployer,l.pool,l.transaction_hash,l.block_number,l.block_time,l.finality FROM pons_launches l LEFT JOIN pons_rank_candidates r ON r.token=l.token WHERE l.token=? LIMIT 1`).bind(address).first();
  }catch{return null;}
}

function normalizeDexPairs(address,rows){
  const target=address.toLowerCase();
  const pairs=(Array.isArray(rows)?rows:[]).filter(row=>s(row?.baseToken?.address).toLowerCase()===target).sort((a,b)=>(n(b?.liquidity?.usd)||0)-(n(a?.liquidity?.usd)||0));
  const pair=pairs[0];
  if(!pair)return null;
  const periods=['m5','h1','h6','h24'];
  const record=source=>Object.fromEntries(periods.map(period=>[period,n(source?.[period])]));
  return {pairAddress:s(pair.pairAddress).toLowerCase()||null,dexId:s(pair.dexId)||null,url:s(pair.url).slice(0,600)||null,symbol:s(pair.baseToken?.symbol).slice(0,32)||null,name:s(pair.baseToken?.name).slice(0,120)||null,priceUsd:n(pair.priceUsd),liquidityUsd:n(pair.liquidity?.usd),marketCapUsd:n(pair.marketCap),fdvUsd:n(pair.fdv),volumeUsd:record(pair.volume),priceChangePct:record(pair.priceChange),transactions:Object.fromEntries(periods.map(period=>[period,{buys:n(pair.txns?.[period]?.buys),sells:n(pair.txns?.[period]?.sells)}])),source:'dexscreener-token-pairs'};
}

export function summarizeRobinhoodPressure(transactions={}){
  const summarize=value=>{
    const buys=n(value?.buys),sells=n(value?.sells);
    if(buys==null||sells==null)return{buys,sells,buySharePct:null,buySellRatio:null};
    const total=buys+sells;
    return {buys,sells,buySharePct:total>0?buys/total*100:null,buySellRatio:sells>0?buys/sells:(buys>0?null:0)};
  };
  return Object.fromEntries(['m5','h1','h6','h24'].map(key=>[key,summarize(transactions?.[key])]));
}

function normalizeBitqueryMarket(data){
  const row=data?.Trading?.Tokens?.[0];
  if(!row)return null;
  return {symbol:s(row?.Token?.Symbol).slice(0,32)||null,name:s(row?.Token?.Name).slice(0,120)||null,priceUsd:n(row?.Price?.Ohlc?.Close),marketCapUsd:n(row?.Supply?.MarketCap),fdvUsd:n(row?.Supply?.FullyDilutedValuationUsd),circulatingSupply:n(row?.Supply?.CirculatingSupply),totalSupply:n(row?.Supply?.TotalSupply),observedAt:s(row?.Block?.Time)||null,source:'bitquery-trading-tokens'};
}

function normalizeHolders(data,totalSupply){
  const top=Array.isArray(data?.EVM?.Top)?data.EVM.Top:[];
  const stats=Array.isArray(data?.EVM?.Stats)?data.EVM.Stats[0]:null;
  const balances=top.map(row=>n(row?.Balance?.Amount)||0);
  const supply=(n(totalSupply)||n(stats?.total)||0);
  const share=count=>supply>0?balances.slice(0,count).reduce((sum,value)=>sum+value,0)/supply*100:null;
  return {count:n(stats?.holders),top10Pct:share(10),top20Pct:share(20),method:'raw current balances; contracts and pools are not excluded',coverage:stats||top.length?'available':'empty'};
}

export async function resolveRobinhoodToken(address,{env={},fetchImpl=fetch}={}){
  const token=s(address).toLowerCase();
  if(!isRobinhoodContractAddress(token))return Object.freeze({ok:false,kind:'search-text',error:'invalid_robinhood_contract',query:s(address),readOnly:true});
  let code=null,rpcAvailable=true,rpcError=null;
  try{code=await rpc(env,'eth_getCode',[token,'latest'],fetchImpl);}
  catch(error){rpcAvailable=false;rpcError=s(error?.message||error);}
  const codeObserved=rpcAvailable&&Boolean(code&&code!=='0x'&&code!=='0x0');

  const cached=await cachedRecord(env,token);
  const marketPromise=graphql(env,buildRobinhoodTokenMarketQuery(token),fetchImpl).then(normalizeBitqueryMarket).catch(()=>null);
  const dexPromise=fetchImpl(`${DEXSCREENER_ENDPOINT}/${token}`,{headers:{accept:'application/json'}}).then(async response=>response.ok?normalizeDexPairs(token,await response.json()):null).catch(()=>null);
  const [bitqueryMarket,dex]=await Promise.all([marketPromise,dexPromise]);
  const totalSupply=bitqueryMarket?.totalSupply??n(cached?.total_supply);
  const holders=await graphql(env,buildRobinhoodHoldersQuery(token),fetchImpl).then(data=>normalizeHolders(data,totalSupply)).catch(()=>({count:null,top10Pct:null,top20Pct:null,method:'unavailable',coverage:'unavailable'}));
  const ponsVerified=Boolean(cached?.factory);
  const marketCapUsd=bitqueryMarket?.marketCapUsd??dex?.marketCapUsd??n(cached?.market_cap_usd);
  const liquidityUsd=dex?.liquidityUsd??null;
  const market={symbol:bitqueryMarket?.symbol??dex?.symbol??(s(cached?.symbol)||null),name:bitqueryMarket?.name??dex?.name??(s(cached?.name)||null),priceUsd:bitqueryMarket?.priceUsd??dex?.priceUsd??n(cached?.price_usd),marketCapUsd,fdvUsd:bitqueryMarket?.fdvUsd??dex?.fdvUsd??n(cached?.fdv_usd),circulatingSupply:bitqueryMarket?.circulatingSupply??n(cached?.circulating_supply),totalSupply,liquidityUsd,liquidityToMarketCapPct:liquidityUsd!=null&&marketCapUsd>0?liquidityUsd/marketCapUsd*100:null,volumeUsd:dex?.volumeUsd??{m5:null,h1:null,h6:null,h24:null},priceChangePct:dex?.priceChangePct??{m5:null,h1:null,h6:null,h24:null},transactions:dex?.transactions??null,pairAddress:dex?.pairAddress??null,dexId:dex?.dexId??null,observedAt:bitqueryMarket?.observedAt??null};
  const pressure=summarizeRobinhoodPressure(market.transactions);
  const flags=[];
  if(!rpcAvailable)flags.push('contract-code verification temporarily unavailable');
  else if(!codeObserved)flags.push('contract code was not observed at the configured RPC');
  if(market.liquidityToMarketCapPct!=null&&market.liquidityToMarketCapPct<1)flags.push('liquidity below 1 percent of market cap');
  if(holders?.top10Pct!=null&&holders.top10Pct>=50)flags.push('raw top ten concentration at or above 50 percent');
  const hasMarket=Object.values(market).some(value=>value!=null&&typeof value!=='object')||Boolean(dex||bitqueryMarket||cached);
  if(!hasMarket&&!rpcAvailable)return Object.freeze({ok:false,kind:'evm-token',address:token,state:'not-found',error:'all_robinhood_sources_unavailable',message:rpcError,coverage:'degraded',readOnly:true});
  if(!hasMarket&&!codeObserved)return Object.freeze({ok:true,kind:'evm-token',address:token,state:'not-found',label:'unresolved-robinhood-address',chainId:4663,network:'Robinhood Chain',source:'robinhood-chain-rpc',coverage:'empty',readOnly:true});
  return Object.freeze({ok:true,kind:'evm-token',address:token,state:'resolved',label:ponsVerified?'pons-token':'robinhood-token',chainId:4663,network:'Robinhood Chain',readOnly:true,source:[bitqueryMarket&&'bitquery',dex&&'dexscreener',codeObserved&&'robinhood-chain-rpc'].filter(Boolean).join('+'),coverage:hasMarket&&codeObserved?'fresh':'partial',pons:{verified:ponsVerified,rank:n(cached?.current_rank),factory:s(cached?.factory)||null,factoryVersion:s(cached?.factory_version)||null,deployer:s(cached?.deployer)||null,pool:s(cached?.pool)||null,transactionHash:s(cached?.transaction_hash)||null},launchpad:{name:ponsVerified?'PONS':null,associated:ponsVerified,status:ponsVerified?(s(cached?.pool)?'graduated/open-market':'launched'):'unverified',evidence:ponsVerified?'allowlisted PONS factory record':'unavailable'},market,activity:{pressure},holders,creator:{coverage:ponsVerified&&cached?.deployer?'launch-deployer-only':'unavailable',address:s(cached?.deployer)||null,statement:'Deployer holdings are not asserted without current verified balance coverage.'},bundles:{coverage:'unavailable',statement:'Bundled and linked-wallet ownership is not inferred from balances alone.'},smartMoney:{coverage:'unavailable',statement:'Wallets are not labeled smart money without a verified performance methodology.'},risk:{level:flags.length?'observed-flags':'insufficient-evidence',flags,statement:'Observed facts only. This is not a safety rating or price prediction.'},disclosure:[ponsVerified?'PONS origin is verified from an allowlisted factory record.':'PONS origin is not yet verified, so the app does not claim PONS membership.',codeObserved?'Robinhood contract code was observed.':rpcAvailable?'The configured RPC did not return contract code; market data was cross-checked instead.':'Robinhood contract-code verification is temporarily unavailable.', 'Market fields are provider observations and may be delayed.'].join(' ')});
}

export const __ponsTokenResolverContract=Object.freeze({chainId:4663,readOnly:true,addressPattern:'0x + 40 hexadecimal characters'});
