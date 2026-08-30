import { intelligenceDb } from './intelligence-indexer.mjs';

const BASE58_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EXCLUDED=new Set([
  'So11111111111111111111111111111111111111111',
  'So11111111111111111111111111111111111111112',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Es9vMFrzaCERmJfrF4H2FYDqfCMx1j8dYKVKJQmuayNX'
]);

const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;

export const normalizeZ500Name=value=>s(value)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g,'')
  .trim();

export const normalizeZ500Ticker=value=>s(value)
  .replace(/^\$/,'')
  .toUpperCase()
  .replace(/[^A-Z0-9_]/g,'');

export const validZ500Mint=value=>{
  const mint=s(value);
  return BASE58_RE.test(mint)&&!EXCLUDED.has(mint);
};

export const Z500_REFERENCE=Object.freeze([
  Object.freeze({canonicalId:'z500:bullshit',rank:1,name:'Bullshit Coin',ticker:'BULLSHIT',tier:'GOLD'}),
  Object.freeze({canonicalId:'z500:pants',rank:2,name:'dogwifpants',ticker:'PANTS',tier:'DIAMOND'}),
  Object.freeze({canonicalId:'z500:eye',rank:3,name:"BULLS'S EYE",ticker:'EYE',tier:'DIAMOND'}),
  Object.freeze({canonicalId:'z500:rtm',rank:4,name:'RETURN TO MEMES',ticker:'RTM',tier:'GOLD'}),
  Object.freeze({canonicalId:'z500:z',rank:5,name:'Z',ticker:'Z',tier:'DIAMOND'}),
  Object.freeze({canonicalId:'z500:yesdog',rank:6,name:'Yes, This is Dog',ticker:'YESDOG',tier:'GOLD'}),
  Object.freeze({canonicalId:'z500:mim',rank:7,name:'Magic Internet Money',ticker:'MIM',tier:'GOLD'}),
  Object.freeze({canonicalId:'z500:babyansem',rank:8,name:'The Black Baby Bull',ticker:'BABYANSEM',tier:'GOLD'}),
  Object.freeze({canonicalId:'z500:kimichi',rank:9,name:'kimchi',ticker:'KIMICHI',tier:'GOLD'}),
  Object.freeze({canonicalId:'z500:ansem6900',rank:10,name:'ANSEM6900',ticker:'ANSEM6900',tier:'GOLD'})
]);

export async function seedZ500IdentityRegistry(env={},rows=Z500_REFERENCE){
  const db=intelligenceDb(env);
  if(!db)return{ok:false,error:'database_unavailable'};
  let seeded=0;

  for(const row of rows){
    const canonicalId=s(row.canonicalId);
    const name=s(row.name);
    const ticker=normalizeZ500Ticker(row.ticker);
    const tier=s(row.tier).toUpperCase()||null;
    const rank=Math.max(1,Math.trunc(n(row.rank)||1));
    if(!canonicalId||!name||!ticker)continue;

    await db.prepare(`
      INSERT INTO intelligence_z500_token_registry(
        canonical_id,ansem_name,ansem_ticker,ansem_tier,ansem_rank,
        verification_state,first_seen_at,last_seen_at,updated_at
      ) VALUES(?,?,?,?,?,'unverified',unixepoch(),unixepoch(),unixepoch())
      ON CONFLICT(canonical_id) DO UPDATE SET
        ansem_name=excluded.ansem_name,
        ansem_ticker=excluded.ansem_ticker,
        ansem_tier=excluded.ansem_tier,
        ansem_rank=excluded.ansem_rank,
        last_seen_at=unixepoch(),
        updated_at=unixepoch()
    `).bind(canonicalId,name,ticker,tier,rank).run();
    seeded++;
  }
  return{ok:true,seeded};
}

function marketSupport(item={}){
  const marketCap=Math.max(0,n(item.marketCapUsd));
  const volume=Math.max(0,n(item.volume24hUsd));
  const liquidity=Math.max(0,n(item.liquidityUsd));
  const ageDays=item.pairCreatedAt?Math.max(0,(Date.now()-n(item.pairCreatedAt))/86400000):0;
  const mcapScore=Math.min(8,Math.log10(1+marketCap)*1.15);
  const volumeScore=Math.min(6,Math.log10(1+volume));
  const liquidityScore=Math.min(6,Math.log10(1+liquidity));
  const ageScore=Math.min(2,Math.log10(1+ageDays));
  return Math.max(0,mcapScore+volumeScore+liquidityScore+ageScore);
}

function sourceWeight(source){
  switch(s(source).toLowerCase()){
    case 'ansem-direct': return 55;
    case 'coingecko': return 32;
    case 'dexscreener': return 24;
    case 'pump-local': return 14;
    default: return 5;
  }
}

export function evaluateZ500Identity(reference={},evidence=[]){
  const expectedName=normalizeZ500Name(reference.ansemName||reference.name);
  const expectedTicker=normalizeZ500Ticker(reference.ansemTicker||reference.ticker);

  const usable=(Array.isArray(evidence)?evidence:[])
    .filter(item=>validZ500Mint(item?.mint))
    .map(item=>({
      ...item,
      source:s(item.source).toLowerCase(),
      mint:s(item.mint),
      name:s(item.name),
      ticker:normalizeZ500Ticker(item.ticker||item.symbol),
      sourceIdentifier:s(item.sourceIdentifier),
      directMint:Boolean(item.directMint),
      authoritativeLink:Boolean(item.authoritativeLink),
      marketCapUsd:n(item.marketCapUsd),
      volume24hUsd:n(item.volume24hUsd),
      liquidityUsd:n(item.liquidityUsd),
      pairCreatedAt:n(item.pairCreatedAt)
    }));

  const byMint=new Map();
  for(const item of usable){
    const row=byMint.get(item.mint)||{
      mint:item.mint,
      sources:new Set(),exactNameSources:new Set(),exactTickerSources:new Set(),
      directSources:new Set(),authoritativeSources:new Set(),evidence:[]
    };
    if(item.source)row.sources.add(item.source);
    if(expectedName&&normalizeZ500Name(item.name)===expectedName)row.exactNameSources.add(item.source||'unknown');
    if(expectedTicker&&item.ticker===expectedTicker)row.exactTickerSources.add(item.source||'unknown');
    if(item.directMint)row.directSources.add(item.source||'unknown');
    if(item.authoritativeLink)row.authoritativeSources.add(item.source||'unknown');
    row.evidence.push(item);
    byMint.set(item.mint,row);
  }

  const candidates=[...byMint.values()].map(row=>{
    const sourceCount=row.sources.size;
    const nameMatch=row.exactNameSources.size>0;
    const tickerMatch=row.exactTickerSources.size>0;
    const direct=row.directSources.size>0;
    const authoritative=row.authoritativeSources.size>0;
    const market=Math.max(0,...row.evidence.map(marketSupport));
    const score=[...row.sources].reduce((sum,source)=>sum+sourceWeight(source),0)
      +(nameMatch?16:0)+(tickerMatch?16:0)+(direct?10:0)+(authoritative?30:0)+market;
    const stronglyVerified=authoritative||(sourceCount>=2&&nameMatch&&tickerMatch&&direct);
    return{
      mint:row.mint,sourceCount,nameMatch,tickerMatch,direct,authoritative,stronglyVerified,
      marketSupport:market,score,sources:[...row.sources],evidence:row.evidence
    };
  }).sort((a,b)=>b.score-a.score||b.marketSupport-a.marketSupport||a.mint.localeCompare(b.mint));

  const strong=candidates.filter(x=>x.stronglyVerified);
  if(strong.length===1){
    return{state:'verified',mint:strong[0].mint,confidence:strong[0].authoritative?1:0.95,method:strong[0].authoritative?'authoritative-direct-mint':'multi-source-exact-identity',candidates};
  }

  if(strong.length>1){
    const [best,runnerUp]=strong;
    const hasCanonicalCrossCheck=best.sources.includes('coingecko')&&best.sources.includes('dexscreener');
    const dominant=hasCanonicalCrossCheck&&best.marketSupport>=8&&best.score>=runnerUp.score+25;
    if(dominant){
      return{state:'verified',mint:best.mint,confidence:0.9,method:'multi-source-market-dominance',candidates};
    }
    return{state:'conflict',mint:null,confidence:0,method:'multiple-verified-mints',candidates};
  }

  if(candidates.length>1)return{state:'ambiguous',mint:null,confidence:0,method:'multiple-candidate-mints',candidates};
  if(candidates.length===1)return{state:'candidate',mint:null,confidence:0,method:'insufficient-independent-evidence',candidates};
  return{state:'unverified',mint:null,confidence:0,method:'no-valid-mint-evidence',candidates:[]};
}

export const __z500IdentityRegistryContract=Object.freeze({
  exactMintIdentity:true,
  tickerAloneNeverVerifies:true,
  nameAloneNeverVerifies:true,
  independentSourcesRequired:2,
  marketDataSupportingOnly:true,
  dominantMarketTieBreakRequiresCoinGeckoAndDexScreener:true,
  conflictingVerifiedMintsFailClosed:true,
  referenceCount:10
});


