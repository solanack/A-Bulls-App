import { intelligenceDb } from './intelligence-indexer.mjs';
import { normalizeSolanaDexPairs } from './intelligence-solana-token-resolver.mjs';
import { providerFetch } from './intelligence-fetch.mjs';

const MINT=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export async function loadFieldMarkets(env, input, {fetchImpl=providerFetch, now=Date.now()}={}) {
  const mints=[...new Set(input)].filter(mint=>MINT.test(mint)).slice(0,30);
  const db=intelligenceDb(env), markets={}, missing=[];
  if(!mints.length)return markets;
  const keys=mints.map(mint=>`field:market:v1:${mint}`);
  const cached=db?(await db.prepare(`SELECT cache_key,payload_json,expires_at FROM bull_intelligence_cache WHERE cache_key IN (${keys.map(()=>'?').join(',')})`).bind(...keys).all()).results||[]:[];
  const byKey=new Map(cached.map(row=>[row.cache_key,row]));
  for(const mint of mints){
    const row=byKey.get(`field:market:v1:${mint}`);
    if(row && Number(row.expires_at)*1000>now){
      try{const value=JSON.parse(row.payload_json);if(value)markets[mint]=value;continue;}catch{}
    }
    missing.push(mint);
  }
  if(!missing.length)return markets;
  // One bounded market request, no Helius credits and no change to indexed membership.
  const response=await fetchImpl(`https://api.dexscreener.com/tokens/v1/solana/${missing.join(',')}`,{headers:{accept:'application/json'}});
  if(!response.ok)throw new Error(`field_market_http_${response.status}`);
  const rows=await response.json();
  if(!Array.isArray(rows))throw new Error('field_market_invalid_response');
  const writes=[];
  for(const mint of missing){
    const pair=normalizeSolanaDexPairs(mint,rows);
    const market=pair?{...pair,observedAt:now}:null;
    if(market)markets[mint]=market;
    if(db)writes.push(db.prepare("INSERT INTO bull_intelligence_cache(cache_key,payload_json,source,coverage,generated_at,expires_at) VALUES(?,?,?,'fresh',?,?) ON CONFLICT(cache_key) DO UPDATE SET payload_json=excluded.payload_json,source=excluded.source,coverage=excluded.coverage,generated_at=excluded.generated_at,expires_at=excluded.expires_at").bind(`field:market:v1:${mint}`,JSON.stringify(market),'dexscreener',Math.floor(now/1000),Math.floor(now/1000)+60));
  }
  if(writes.length)await db.batch(writes);
  return markets;
}
