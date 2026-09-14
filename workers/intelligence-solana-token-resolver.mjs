/* Read-only Solana token trader snapshot.
 * Market data is observed from DexScreener with GeckoTerminal as a bounded
 * fallback; authority and concentration data come from standard Solana RPC;
 * holder count uses Helius DAS when configured.
 */
const DEXSCREENER_PAIRS_ENDPOINT='https://api.dexscreener.com/token-pairs/v1/solana';
const DEXSCREENER_LOOKUP_ENDPOINT='https://api.dexscreener.com/tokens/v1/solana';
const GECKOTERMINAL_TOKEN_ENDPOINT='https://api.geckoterminal.com/api/v2/networks/solana/tokens';
import { providerFetch } from './intelligence-fetch.mjs';
const ADDRESS_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=value=>String(value??'').trim();
const n=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;

async function rpc(source,method,params,fetchImpl){
  const response=await fetchImpl(source.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  if(!response.ok)throw new Error(`solana_${method}_http_${response.status}`);
  const body=await response.json();
  if(body?.error)throw new Error(`solana_${method}_${s(body.error.code)||'rpc'}`);
  return body?.result;
}

function periods(source={}){
  return Object.fromEntries(['m5','h1','h6','h24'].map(key=>[key,n(source?.[key])]));
}

export function normalizeSolanaDexPairs(mint,rows=[]){
  const target=s(mint);
  const pairs=(Array.isArray(rows)?rows:[]).filter(row=>s(row?.chainId).toLowerCase()==='solana'&&s(row?.baseToken?.address)===target)
    .sort((a,b)=>(n(b?.liquidity?.usd)||0)-(n(a?.liquidity?.usd)||0));
  const pair=pairs[0];if(!pair)return null;
  const transactions=Object.fromEntries(['m5','h1','h6','h24'].map(key=>[key,{buys:n(pair?.txns?.[key]?.buys),sells:n(pair?.txns?.[key]?.sells)}]));
  const liquidityUsd=n(pair?.liquidity?.usd),marketCapUsd=n(pair?.marketCap),fdvUsd=n(pair?.fdv);
  return Object.freeze({
    symbol:s(pair?.baseToken?.symbol).slice(0,32)||null,name:s(pair?.baseToken?.name).slice(0,120)||null,
    priceUsd:n(pair?.priceUsd),marketCapUsd,fdvUsd,liquidityUsd,
    liquidityToMarketCapPct:liquidityUsd!=null&&marketCapUsd>0?liquidityUsd/marketCapUsd*100:null,
    volumeUsd:periods(pair?.volume),priceChangePct:periods(pair?.priceChange),transactions,
    pairAddress:s(pair?.pairAddress)||null,dexId:s(pair?.dexId)||null,pairCreatedAt:n(pair?.pairCreatedAt),
    labels:Array.isArray(pair?.labels)?pair.labels.map(s).filter(Boolean).slice(0,12):[],
    url:s(pair?.url).slice(0,600)||null,source:'dexscreener-token-pairs'
  });
}

function dexRows(payload){
  if(Array.isArray(payload))return payload;
  if(Array.isArray(payload?.pairs))return payload.pairs;
  return [];
}

function logDexFailure(kind,details={}){
  try{console.warn('[dexscreener-market]',JSON.stringify({kind,...details}));}catch{}
}

export function normalizeGeckoTerminalToken(mint,payload={}){
  const target=s(mint),attributes=payload?.data?.attributes&&typeof payload.data.attributes==='object'?payload.data.attributes:{};
  const address=s(attributes.address||payload?.data?.id).replace(/^solana_/,''),priceUsd=n(attributes.price_usd);
  if(!ADDRESS_RE.test(target)||address!==target||priceUsd==null)return null;
  const marketCapUsd=n(attributes.market_cap_usd),fdvUsd=n(attributes.fdv_usd),liquidityUsd=n(attributes.total_reserve_in_usd??attributes.reserve_in_usd);
  const volumeUsd=periods(attributes.volume_usd),priceChangePct=periods(attributes.price_change_percentage),transactions=Object.fromEntries(['m5','h1','h6','h24'].map(key=>[key,{buys:null,sells:null}]));
  return Object.freeze({
    symbol:s(attributes.symbol).slice(0,32)||null,name:s(attributes.name).slice(0,120)||null,
    priceUsd,marketCapUsd,fdvUsd,liquidityUsd,
    liquidityToMarketCapPct:liquidityUsd!=null&&marketCapUsd>0?liquidityUsd/marketCapUsd*100:null,
    volumeUsd,priceChangePct,transactions,
    pairAddress:null,dexId:null,pairCreatedAt:null,labels:[],url:null,source:'geckoterminal-token'
  });
}

export async function fetchSolanaDexMarket(address,fetchImpl=providerFetch){
  const target=s(address);if(!ADDRESS_RE.test(target))return null;
  const dexHeaders={accept:'application/json','user-agent':'A-Bulls-App/1.0 (+https://abullsapp.com)'};
  const dexAttempts=[
    {url:`${DEXSCREENER_PAIRS_ENDPOINT}/${encodeURIComponent(target)}`,source:'dexscreener-token-pairs'},
    {url:`${DEXSCREENER_LOOKUP_ENDPOINT}/${encodeURIComponent(target)}`,source:'dexscreener-token-lookup'}
  ];
  for(const attempt of dexAttempts){
    const startedAt=Date.now();
    try{
      const response=await fetchImpl(attempt.url,{headers:dexHeaders,signal:AbortSignal.timeout(3500)});
      const elapsedMs=Date.now()-startedAt;
      if(!response.ok){
        logDexFailure('http',{source:attempt.source,status:response.status,elapsedMs,retryAfter:response.headers.get('retry-after'),cfRay:response.headers.get('cf-ray'),contentType:response.headers.get('content-type')});
        continue;
      }
      const payload=await response.json(),rows=dexRows(payload),market=normalizeSolanaDexPairs(target,rows);
      if(market)return Object.freeze({...market,source:attempt.source});
      logDexFailure('no-matching-pair',{source:attempt.source,status:response.status,elapsedMs,rowCount:rows.length,cfRay:response.headers.get('cf-ray')});
    }catch(error){
      logDexFailure('exception',{source:attempt.source,elapsedMs:Date.now()-startedAt,name:s(error?.name),message:s(error?.message).slice(0,180)});
    }
  }
  try{
    const response=await fetchImpl(`${GECKOTERMINAL_TOKEN_ENDPOINT}/${encodeURIComponent(target)}`,{headers:{accept:'application/json;version=20230203','user-agent':'A-Bulls-App/1.0 (+https://abullsapp.com)'},signal:AbortSignal.timeout(3500)});
    if(response.ok){const market=normalizeGeckoTerminalToken(target,await response.json());if(market)return market;}
  }catch{}
  return null;
}

export function summarizeTradingPressure(transactions={}){
  const summarize=value=>{
    const buys=n(value?.buys),sells=n(value?.sells);
    if(buys==null||sells==null)return{buys,sells,buySharePct:null,buySellRatio:null};
    const total=buys+sells;
    return {buys,sells,buySharePct:total>0?buys/total*100:null,buySellRatio:sells>0?buys/sells:(buys>0?null:0)};
  };
  return Object.fromEntries(['m5','h1','h6','h24'].map(key=>[key,summarize(transactions?.[key])]));
}

export function normalizeLargestAccounts(result,totalSupply){
  const rows=Array.isArray(result?.value)?result.value:[];
  const balances=rows.map(row=>n(row?.uiAmountString??row?.uiAmount)).filter(value=>value!=null&&value>=0);
  const supply=n(totalSupply);
  const share=count=>supply>0?balances.slice(0,count).reduce((sum,value)=>sum+value,0)/supply*100:null;
  return Object.freeze({top10Pct:share(10),top20Pct:share(20),sampledAccounts:balances.length,method:'raw largest token accounts; pools and contracts are not excluded'});
}

async function pumpRecord(env,mint){
  const db=env.INTELLIGENCE_DB;if(!db?.prepare)return null;
  try{return await db.prepare(`SELECT t.first_seen,t.last_seen,t.pair_address,a.rank_24h,a.rank_1h,a.active_since FROM pump_tokens t LEFT JOIN pump_active_tokens a ON a.mint=t.mint WHERE t.mint=? LIMIT 1`).bind(mint).first();}catch{return null;}
}

function launchpadSnapshot(dex,pump){
  const dexId=s(dex?.dexId).toLowerCase();
  const associated=Boolean(pump)||dexId.includes('pump');
  let status='unknown';
  if(dexId.includes('pumpswap'))status='graduated/open-market';
  else if(dexId.includes('pump'))status='bonding-curve market';
  return Object.freeze({name:associated?'Pump.fun':null,associated,status,rank24h:n(pump?.rank_24h),rank1h:n(pump?.rank_1h),firstObservedAt:n(pump?.first_seen)?Number(pump.first_seen)*1000:(dex?.pairCreatedAt??null),evidence:pump?'locally observed Pump activity':dexId.includes('pump')?'observed Pump market venue':'unavailable'});
}

export async function resolveSolanaToken(mint,{env={},source,account,fetchImpl=providerFetch}={}){
  const address=s(mint);if(!ADDRESS_RE.test(address))throw new Error('invalid_solana_mint');
  const info=account?.data?.parsed?.info||{};
  const tokenAmount=info?.supply;
  const decimals=n(info?.decimals);
  const totalSupply=tokenAmount!=null&&decimals!=null?Number(tokenAmount)/10**decimals:null;
  const [dex,largest,pump,holderData]=await Promise.all([
    fetchSolanaDexMarket(address,fetchImpl),
    rpc(source,'getTokenLargestAccounts',[address,{commitment:'confirmed'}],fetchImpl).then(result=>normalizeLargestAccounts(result,totalSupply)).catch(()=>({top10Pct:null,top20Pct:null,sampledAccounts:0,method:'unavailable'})),
    pumpRecord(env,address),
    source?.name==='helius-standard-rpc'?rpc(source,'getTokenAccounts',[{mint:address,limit:1,options:{showZeroBalance:false}}],fetchImpl).catch(()=>null):null
  ]);
  const launchpad=launchpadSnapshot(dex,pump);
  const pressure=summarizeTradingPressure(dex?.transactions);
  const holderCount=n(holderData?.total);
  const flags=[];
  if(info?.mintAuthority)flags.push('mint authority active');
  if(info?.freezeAuthority)flags.push('freeze authority active');
  if(dex?.liquidityToMarketCapPct!=null&&dex.liquidityToMarketCapPct<1)flags.push('liquidity below 1 percent of market cap');
  if(largest?.top10Pct!=null&&largest.top10Pct>=50)flags.push('raw top ten concentration at or above 50 percent');
  const market={...(dex||{}),circulatingSupply:null,totalSupply};
  return Object.freeze({
    ok:true,kind:'solana-token',address,state:'resolved',label:'token-mint',owner:s(account?.owner)||null,executable:false,parsedType:'mint',lamports:Number(account?.lamports||0),network:'Solana',readOnly:true,
    source:[dex?.source,source?.name,holderData&&'helius-das',pump&&'pump-index'].filter(Boolean).join('+'),
    coverage:dex?'fresh':'partial',market,activity:{pressure},launchpad,
    token:{decimals,mintAuthority:s(info?.mintAuthority)||null,freezeAuthority:s(info?.freezeAuthority)||null,mintAuthorityRevoked:!info?.mintAuthority,freezeAuthorityRevoked:!info?.freezeAuthority},
    holders:{count:holderCount,top10Pct:largest?.top10Pct??null,top20Pct:largest?.top20Pct??null,method:largest?.method||'unavailable',coverage:holderCount!=null||largest?.top10Pct!=null?'partial':'unavailable'},
    creator:{coverage:'unavailable',statement:'Creator identity and holdings are not asserted without verified launch evidence.'},
    bundles:{coverage:'unavailable',statement:'Bundled and linked-wallet ownership is not inferred from balances alone.'},
    smartMoney:{coverage:'unavailable',statement:'Wallets are not labeled smart money without a verified performance methodology.'},
    risk:{level:flags.length?'observed-flags':'no-authority-flags-observed',flags,statement:'Observed facts only. This is not a safety rating or price prediction.'},
    disclosure:'Market and transaction fields are provider observations. DexScreener is primary and GeckoTerminal is a bounded fallback. Holder concentration is raw and may include pools or program accounts.'
  });
}

export const __solanaTokenResolverContract=Object.freeze({readOnly:true,marketSource:'dexscreener-primary-geckoterminal-fallback',holderSource:'solana-rpc-plus-helius'});
