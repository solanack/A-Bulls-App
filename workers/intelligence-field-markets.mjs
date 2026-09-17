import { intelligenceDb } from './intelligence-indexer.mjs';
import { providerFetch } from './intelligence-fetch.mjs';
import { canonicalChainAddress,chainQualifiedId,normalizeChainKey,providerChainConfig,resolveChain } from './intelligence-chain-registry.mjs';
import { marketSnapshotFields,normalizeDexScreenerPairs } from './intelligence-market-normalizer.mjs';

const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const bool=value=>['1','true','yes','on'].includes(s(value).toLowerCase());
const clamp=(value,fallback,min,max)=>Math.max(min,Math.min(max,Math.trunc(n(value)||fallback)));
const all=async stmt=>{try{return(await stmt.all())?.results||[];}catch{return[];}};

function parseSubject(value){
  const legacy=typeof value==='string';
  const chain=normalizeChainKey(legacy?'solana':value?.chain??value?.chainKey??value?.networkId??value?.network_id??'solana');
  const rawAddress=s(legacy?value:value?.address??value?.mint??value?.tokenAddress??value?.token_address??value?.token);
  const address=canonicalChainAddress(chain,rawAddress);if(!address)return null;
  const definition=resolveChain(chain,{address});if(!definition)return null;
  return {chain,address,assetId:chainQualifiedId(chain,address),resultKey:legacy?rawAddress:`${chain}:${address}`,legacy};
}

function uniqueSubjects(input=[]){
  const byId=new Map();
  for(const value of Array.isArray(input)?input:[]){const subject=parseSubject(value);if(!subject)continue;const prior=byId.get(subject.assetId);if(prior)prior.resultKeys.add(subject.resultKey);else byId.set(subject.assetId,{...subject,resultKeys:new Set([subject.resultKey])});if(byId.size>=30)break;}
  return [...byId.values()];
}

function publish(markets,subject,market){if(!market)return;for(const key of subject.resultKeys)markets[key]=market;}
function cacheKey(subject){return`field:market:v2:${subject.chain}:${subject.address}`;}
function observedAtMs(row){const seconds=Number(row?.observed_at);return Number.isFinite(seconds)&&seconds>0?seconds*1000:0;}

async function retainedSnapshots(db,subjects){
  if(!db?.prepare||!subjects.length)return new Map();
  const clauses=subjects.map(()=>'(chain_key=? AND asset_address=?)').join(' OR '),binds=subjects.flatMap(subject=>[subject.chain,subject.address]);
  const rows=await all(db.prepare(`SELECT chain_key,asset_address,payload_json,observed_at FROM intelligence_market_snapshots_v2 WHERE ${clauses}`).bind(...binds));
  const out=new Map();for(const row of rows){try{const payload=JSON.parse(s(row.payload_json));if(payload)out.set(`${s(row.chain_key)}:${s(row.asset_address)}`,{market:payload,observedAt:observedAtMs(row)});}catch{}}
  return out;
}

function snapshotStatement(db,subject,market,now){
  const fields=marketSnapshotFields(market),nowSec=Math.floor(now/1000);
  return db.prepare(`INSERT INTO intelligence_market_snapshots_v2(chain_key,asset_address,price_usd,market_cap_usd,fdv_usd,liquidity_usd,volume_m5_usd,volume_h1_usd,volume_h6_usd,volume_h24_usd,pair_address,dex_id,pair_created_at,source,payload_json,observed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(chain_key,asset_address) DO UPDATE SET price_usd=excluded.price_usd,market_cap_usd=excluded.market_cap_usd,fdv_usd=excluded.fdv_usd,liquidity_usd=excluded.liquidity_usd,volume_m5_usd=excluded.volume_m5_usd,volume_h1_usd=excluded.volume_h1_usd,volume_h6_usd=excluded.volume_h6_usd,volume_h24_usd=excluded.volume_h24_usd,pair_address=excluded.pair_address,dex_id=excluded.dex_id,pair_created_at=excluded.pair_created_at,source=excluded.source,payload_json=excluded.payload_json,observed_at=excluded.observed_at,updated_at=excluded.updated_at`).bind(subject.chain,subject.address,fields.priceUsd,fields.marketCapUsd,fields.fdvUsd,fields.liquidityUsd,fields.volumeM5Usd,fields.volumeH1Usd,fields.volumeH6Usd,fields.volumeH24Usd,fields.pairAddress,fields.dexId,fields.pairCreatedAt,fields.source,JSON.stringify(market),nowSec,nowSec);
}

export async function loadFieldMarkets(env,input,{fetchImpl=providerFetch,now=Date.now()}={}){
  const subjects=uniqueSubjects(input),db=intelligenceDb(env),markets={};if(!subjects.length)return markets;
  const ttl=clamp(env.FIELD_QUERY_CACHE_TTL_SECONDS,60,15,300),keys=subjects.map(cacheKey),cached=db?await all(db.prepare(`SELECT cache_key,payload_json,expires_at FROM bull_intelligence_cache WHERE cache_key IN (${keys.map(()=>'?').join(',')})`).bind(...keys)):[];
  const byCache=new Map(cached.map(row=>[s(row.cache_key),row])),stale=new Map(),missing=[];
  for(const subject of subjects){const row=byCache.get(cacheKey(subject));if(row){try{const market=JSON.parse(s(row.payload_json));if(Number(row.expires_at)*1000>now){if(market)publish(markets,subject,market);continue;}if(market)stale.set(subject.assetId,market);}catch{}}missing.push(subject);}
  if(!missing.length)return markets;

  const snapshots=await retainedSnapshots(db,missing);for(const subject of missing){if(stale.has(subject.assetId))continue;const retained=snapshots.get(subject.assetId);if(retained?.market)stale.set(subject.assetId,{...retained.market,coverage:'stale-retained',observedAt:retained.observedAt||retained.market.observedAt||null});}
  const allowMultichain=env.MULTICHAIN_MARKET_ENABLED==null||s(env.MULTICHAIN_MARKET_ENABLED)===''||bool(env.MULTICHAIN_MARKET_ENABLED);
  const groups=new Map();
  for(const subject of missing){if(subject.chain!=='solana'&&!allowMultichain){const fallback=stale.get(subject.assetId);if(fallback)publish(markets,subject,fallback);continue;}const list=groups.get(subject.chain)||[];list.push(subject);groups.set(subject.chain,list);}

  const writes=[],errors=[];
  await Promise.all([...groups.entries()].map(async([chain,items])=>{
    const provider=providerChainConfig(chain,items[0]?.address);if(!provider){errors.push(`field_market_chain_unavailable:${chain}`);return;}
    const url=`https://api.dexscreener.com/tokens/v1/${encodeURIComponent(provider.dexScreenerId)}/${items.map(item=>encodeURIComponent(item.address)).join(',')}`;
    try{
      const response=await fetchImpl(url,{headers:{accept:'application/json','user-agent':'A-Bulls-App/1.0'}});
      if(!response?.ok)throw new Error(`field_market_http_${chain}_${response?.status||0}`);
      const rows=await response.json();if(!Array.isArray(rows))throw new Error(`field_market_invalid_response:${chain}`);
      for(const subject of items){const normalized=normalizeDexScreenerPairs(chain,subject.address,rows),market=normalized?{...normalized,observedAt:now}:null;if(market)publish(markets,subject,market);else{const fallback=stale.get(subject.assetId);if(fallback)publish(markets,subject,fallback);}if(db?.prepare){writes.push(db.prepare("INSERT INTO bull_intelligence_cache(cache_key,payload_json,source,coverage,generated_at,expires_at) VALUES(?,?,?,'fresh',?,?) ON CONFLICT(cache_key) DO UPDATE SET payload_json=excluded.payload_json,source=excluded.source,coverage=excluded.coverage,generated_at=excluded.generated_at,expires_at=excluded.expires_at").bind(cacheKey(subject),JSON.stringify(market),'dexscreener',Math.floor(now/1000),Math.floor(now/1000)+ttl));if(market)writes.push(snapshotStatement(db,subject,market,now));}}
    }catch(error){errors.push(s(error?.message||error));for(const subject of items){const fallback=stale.get(subject.assetId);if(fallback)publish(markets,subject,{...fallback,coverage:'stale-provider-error'});}}
  }));
  if(writes.length&&db?.batch)await db.batch(writes);
  if(errors.length&&!Object.keys(markets).length)throw new Error(errors[0]);
  return markets;
}

export const __fieldMarketsContract=Object.freeze({legacySolanaInput:true,chainQualifiedInput:true,maxAssets:30,cacheFirst:true,provider:'dexscreener',retainedSnapshotFallback:true});
