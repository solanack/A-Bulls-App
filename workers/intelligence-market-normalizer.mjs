/* Provider market observations normalized into one chain-qualified contract. */
import { canonicalChainAddress,normalizeChainKey,providerChainConfig,sameChainAddress } from './intelligence-chain-registry.mjs';

const s=value=>String(value??'').trim();
const n=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const periods=source=>Object.fromEntries(['m5','h1','h6','h24'].map(key=>[key,n(source?.[key])]));

export function normalizeDexScreenerPairs(chain,address,rows=[]){
  const chainKey=normalizeChainKey(chain),target=canonicalChainAddress(chainKey,address),provider=providerChainConfig(chainKey,address);
  if(!target||!provider)return null;
  const pairs=(Array.isArray(rows)?rows:[]).filter(row=>normalizeChainKey(row?.chainId)===chainKey&&sameChainAddress(chainKey,row?.baseToken?.address,target))
    .sort((a,b)=>(n(b?.liquidity?.usd)||0)-(n(a?.liquidity?.usd)||0));
  const pair=pairs[0];if(!pair)return null;
  const liquidityUsd=n(pair?.liquidity?.usd),marketCapUsd=n(pair?.marketCap),fdvUsd=n(pair?.fdv);
  const transactions=Object.fromEntries(['m5','h1','h6','h24'].map(key=>[key,{buys:n(pair?.txns?.[key]?.buys),sells:n(pair?.txns?.[key]?.sells)}]));
  return Object.freeze({
    chainKey,
    assetAddress:target,
    symbol:s(pair?.baseToken?.symbol).slice(0,32)||null,
    name:s(pair?.baseToken?.name).slice(0,120)||null,
    priceUsd:n(pair?.priceUsd),marketCapUsd,fdvUsd,liquidityUsd,
    liquidityToMarketCapPct:liquidityUsd!=null&&marketCapUsd>0?liquidityUsd/marketCapUsd*100:null,
    volumeUsd:periods(pair?.volume),priceChangePct:periods(pair?.priceChange),transactions,
    pairAddress:s(pair?.pairAddress)||null,dexId:s(pair?.dexId)||null,pairCreatedAt:n(pair?.pairCreatedAt),
    labels:Array.isArray(pair?.labels)?pair.labels.map(s).filter(Boolean).slice(0,12):[],
    url:s(pair?.url).slice(0,600)||null,source:'dexscreener-token-lookup'
  });
}

export function marketSnapshotFields(market={}){
  return Object.freeze({
    priceUsd:n(market.priceUsd),marketCapUsd:n(market.marketCapUsd),fdvUsd:n(market.fdvUsd),liquidityUsd:n(market.liquidityUsd),
    volumeM5Usd:n(market?.volumeUsd?.m5),volumeH1Usd:n(market?.volumeUsd?.h1),volumeH6Usd:n(market?.volumeUsd?.h6),volumeH24Usd:n(market?.volumeUsd?.h24),
    pairAddress:s(market.pairAddress)||null,dexId:s(market.dexId)||null,pairCreatedAt:n(market.pairCreatedAt),source:s(market.source)||'dexscreener-token-lookup'
  });
}

export const __marketNormalizerContract=Object.freeze({source:'dexscreener',chainQualified:true,baseTokenOnly:true,readOnly:true});
