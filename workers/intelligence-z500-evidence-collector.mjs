import { intelligenceDb } from './intelligence-indexer.mjs';
import {
  Z500_REFERENCE,
  evaluateZ500Identity,
  seedZ500IdentityRegistry,
  normalizeZ500Name,
  normalizeZ500Ticker,
  validZ500Mint
} from './intelligence-z500-identity-registry.mjs';

const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function cfg(env={}){
  return Object.freeze({
    timeoutMs:Math.max(1500,Math.min(15000,Math.trunc(n(env.Z500_SOURCE_TIMEOUT_MS)||7000))),
    ansemUrl:s(env.Z500_ANSEM_URL)||'https://ansem.io/z500',
    sourceUrl:s(env.Z500_SOURCE_URL),
    allowReferenceFallback:String(env.Z500_ALLOW_REFERENCE_FALLBACK||'false').toLowerCase()==='true',
    maxSearchHits:Math.max(3,Math.min(20,Math.trunc(n(env.Z500_IDENTITY_SEARCH_LIMIT)||10)))
  });
}

function cgHeaders(env={}){
  const key=s(env.COINGECKO_API_KEY);
  return key?{'x-cg-demo-api-key':key}:{};
}

async function fetchResponse(url,{headers={},timeoutMs=7000}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{headers,signal:controller.signal});
    if(!response.ok)throw new Error(`upstream_http_${response.status}`);
    return response;
  }finally{clearTimeout(timer);}
}

async function fetchJson(url,options={}){
  const response=await fetchResponse(url,{...options,headers:{accept:'application/json',...(options.headers||{})}});
  return response.json();
}

function compactHtmlText(html){
  return String(html||'')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&#36;/g,'$')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&quot;/gi,'"')
    .replace(/\s+/g,' ')
    .trim();
}

function canonicalIdFor(row,index){
  const ticker=normalizeZ500Ticker(row?.ticker||row?.symbol);
  const name=normalizeZ500Name(row?.name);
  return `z500:${(ticker||name||String(index+1)).toLowerCase()}`;
}

function normalizedReference(row,index){
  return Object.freeze({
    canonicalId:s(row?.canonicalId)||canonicalIdFor(row,index),
    rank:Math.max(1,Math.trunc(n(row?.rank)||index+1)),
    name:s(row?.name),
    ticker:normalizeZ500Ticker(row?.ticker||row?.symbol),
    tier:s(row?.tier).toUpperCase()||null
  });
}

function referencesFromJson(json){
  const rows=Array.isArray(json)?json:Array.isArray(json?.tokens)?json.tokens:Array.isArray(json?.data)?json.data:[];
  return rows.map(normalizedReference).filter(row=>row.name&&row.ticker).slice(0,10);
}

function referencesFromHtml(html){
  const rows=[];
  for(const match of String(html||'').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const text=compactHtmlText(match[1]);
    const tierMatch=text.match(/\b(GOLD|DIAMOND)\b/i);
    const tickerMatch=text.match(/(\$[A-Z0-9_]{1,20})/i);
    if(!tickerMatch)continue;
    const ticker=tickerMatch[1];
    const beforeTicker=text.slice(0,text.indexOf(ticker))
      .replace(/^\s*\d+\s*/,'')
      .replace(/\s+/g,' ')
      .trim();
    if(!beforeTicker)continue;
    rows.push(normalizedReference({name:beforeTicker.slice(0,120),ticker,tier:tierMatch?.[1]||null,rank:rows.length+1},rows.length));
    if(rows.length>=10)break;
  }
  return rows;
}

export async function loadLiveZ500References(env={}){
  const c=cfg(env);
  if(c.sourceUrl){
    const json=await fetchJson(c.sourceUrl,{timeoutMs:c.timeoutMs});
    const rows=referencesFromJson(json);
    if(rows.length===10)return{ok:true,live:true,source:c.sourceUrl,rows};
    throw new Error(`z500_source_incomplete_${rows.length}`);
  }

  try{
    const response=await fetchResponse(c.ansemUrl,{timeoutMs:c.timeoutMs,headers:{accept:'text/html,application/xhtml+xml','user-agent':'A-Bulls-App-Z500-Identity/1.0'}});
    const rows=referencesFromHtml(await response.text());
    if(rows.length===10)return{ok:true,live:true,source:c.ansemUrl,rows};
    throw new Error(`z500_ansem_incomplete_${rows.length}`);
  }catch(error){
    if(!c.allowReferenceFallback)throw error;
    return{ok:true,live:false,source:'embedded-reference-fallback',rows:Z500_REFERENCE};
  }
}

async function writeEvidence(db,canonicalId,evidence){
  await db.prepare(`
    INSERT INTO intelligence_z500_identity_evidence(
      canonical_id,source,source_identifier,candidate_mint,evidence_type,
      evidence_strength,payload_json,observed_at,created_at
    ) VALUES(?,?,?,?,?,?,?,unixepoch(),unixepoch())
  `).bind(
    canonicalId,s(evidence.source),s(evidence.sourceIdentifier)||null,s(evidence.mint)||null,
    s(evidence.evidenceType),n(evidence.evidenceStrength),JSON.stringify(evidence.payload||{})
  ).run();
}

async function coinGeckoSearch(env,reference){
  const query=encodeURIComponent(`${reference.name} ${reference.ticker}`);
  const data=await fetchJson(`https://api.coingecko.com/api/v3/search?query=${query}`,{headers:cgHeaders(env),timeoutMs:cfg(env).timeoutMs});
  const expectedTicker=normalizeZ500Ticker(reference.ticker),expectedName=normalizeZ500Name(reference.name);
  return (Array.isArray(data?.coins)?data.coins:[])
    .filter(row=>normalizeZ500Ticker(row?.symbol)===expectedTicker||normalizeZ500Name(row?.name)===expectedName)
    .slice(0,cfg(env).maxSearchHits);
}

async function coinGeckoCoin(env,id){
  const url=new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`);
  url.search=new URLSearchParams({localization:'false',tickers:'false',market_data:'true',community_data:'false',developer_data:'false',sparkline:'false'}).toString();
  return fetchJson(url,{headers:cgHeaders(env),timeoutMs:cfg(env).timeoutMs});
}

export async function collectZ500CoinGeckoEvidence(env={},reference){
  const db=intelligenceDb(env);if(!db)return{ok:false,error:'database_unavailable'};
  const canonicalId=s(reference.canonicalId);if(!canonicalId)return{ok:false,error:'canonical_id_required'};
  let hits=[];try{hits=await coinGeckoSearch(env,reference);}catch(error){return{ok:false,canonicalId,error:s(error?.message||error),evidence:[]};}
  const evidence=[];
  for(const hit of hits){
    const id=s(hit?.id);if(!id)continue;
    let detail;try{detail=await coinGeckoCoin(env,id);}catch{continue;}
    const mint=s(detail?.platforms?.solana);if(!validZ500Mint(mint))continue;
    const item={
      source:'coingecko',sourceIdentifier:id,mint,
      name:s(detail?.name||hit?.name),ticker:s(detail?.symbol||hit?.symbol),directMint:true,authoritativeLink:false,
      marketCapUsd:n(detail?.market_data?.market_cap?.usd),volume24hUsd:n(detail?.market_data?.total_volume?.usd),liquidityUsd:0,pairCreatedAt:0,
      evidenceType:'coingecko-solana-platform',evidenceStrength:0.72,
      payload:{coingeckoId:id,name:s(detail?.name||hit?.name),symbol:s(detail?.symbol||hit?.symbol),marketCapUsd:n(detail?.market_data?.market_cap?.usd),volume24hUsd:n(detail?.market_data?.total_volume?.usd)}
    };
    evidence.push(item);await writeEvidence(db,canonicalId,item);
    await sleep(80);
  }
  return{ok:true,canonicalId,evidence};
}

export async function collectZ500DexScreenerEvidence(env={},reference){
  const db=intelligenceDb(env);if(!db)return{ok:false,error:'database_unavailable'};
  const canonicalId=s(reference.canonicalId);if(!canonicalId)return{ok:false,error:'canonical_id_required'};
  const query=encodeURIComponent(`${reference.name} ${reference.ticker}`);
  let data;try{data=await fetchJson(`https://api.dexscreener.com/latest/dex/search/?q=${query}`,{timeoutMs:cfg(env).timeoutMs});}catch(error){return{ok:false,canonicalId,error:s(error?.message||error),evidence:[]};}
  const expectedTicker=normalizeZ500Ticker(reference.ticker),expectedName=normalizeZ500Name(reference.name);
  const bestByMint=new Map();
  for(const pair of Array.isArray(data?.pairs)?data.pairs:[]){
    if(s(pair?.chainId).toLowerCase()!=='solana')continue;
    const mint=s(pair?.baseToken?.address);if(!validZ500Mint(mint))continue;
    const name=s(pair?.baseToken?.name),ticker=s(pair?.baseToken?.symbol);
    if(normalizeZ500Ticker(ticker)!==expectedTicker&&normalizeZ500Name(name)!==expectedName)continue;
    const candidate={
      source:'dexscreener',sourceIdentifier:s(pair?.pairAddress),mint,name,ticker,directMint:true,authoritativeLink:false,
      marketCapUsd:n(pair?.marketCap)||n(pair?.fdv),volume24hUsd:n(pair?.volume?.h24),liquidityUsd:n(pair?.liquidity?.usd),pairCreatedAt:n(pair?.pairCreatedAt),
      evidenceType:'dexscreener-solana-pair',evidenceStrength:0.68,
      payload:{pairAddress:s(pair?.pairAddress),dexId:s(pair?.dexId),url:s(pair?.url),name,ticker,marketCapUsd:n(pair?.marketCap)||n(pair?.fdv),fdvUsd:n(pair?.fdv),volume24hUsd:n(pair?.volume?.h24),liquidityUsd:n(pair?.liquidity?.usd),pairCreatedAt:n(pair?.pairCreatedAt),buys24h:n(pair?.txns?.h24?.buys),sells24h:n(pair?.txns?.h24?.sells)}
    };
    const old=bestByMint.get(mint);
    if(!old||candidate.liquidityUsd+candidate.volume24hUsd>old.liquidityUsd+old.volume24hUsd)bestByMint.set(mint,candidate);
  }
  const evidence=[...bestByMint.values()].sort((a,b)=>(b.liquidityUsd+b.volume24hUsd)-(a.liquidityUsd+a.volume24hUsd)).slice(0,cfg(env).maxSearchHits);
  for(const item of evidence)await writeEvidence(db,canonicalId,item);
  return{ok:true,canonicalId,evidence};
}

export async function collectZ500PumpEvidence(env={},reference,mints=[]){
  const db=intelligenceDb(env);if(!db)return{ok:false,error:'database_unavailable'};
  const canonicalId=s(reference.canonicalId),evidence=[];
  for(const mint of [...new Set(mints.map(s).filter(validZ500Mint))].slice(0,20)){
    let row=null;
    try{
      row=await db.prepare(`
        SELECT t.mint,t.symbol,t.name,t.first_seen,t.last_seen,t.pair_address,
          COALESCE(SUM(CASE WHEN b.bucket_start>=unixepoch()-86400 THEN b.volume_sol ELSE 0 END),0) volume_sol_24h,
          COALESCE(SUM(CASE WHEN b.bucket_start>=unixepoch()-86400 THEN b.trade_count ELSE 0 END),0) trades_24h
        FROM pump_tokens t LEFT JOIN pump_volume_buckets b ON b.mint=t.mint
        WHERE t.mint=? GROUP BY t.mint,t.symbol,t.name,t.first_seen,t.last_seen,t.pair_address
      `).bind(mint).first();
    }catch{row=null;}
    if(!row)continue;
    const item={
      source:'pump-local',sourceIdentifier:s(row.pair_address)||mint,mint:s(row.mint),name:s(row.name),ticker:s(row.symbol),directMint:true,authoritativeLink:false,
      marketCapUsd:0,volume24hUsd:0,liquidityUsd:0,pairCreatedAt:n(row.first_seen)*1000,
      evidenceType:'pump-observed-onchain',evidenceStrength:0.5,
      payload:{name:s(row.name),symbol:s(row.symbol),firstSeen:n(row.first_seen),lastSeen:n(row.last_seen),pairAddress:s(row.pair_address)||null,volumeSol24h:n(row.volume_sol_24h),trades24h:n(row.trades_24h)}
    };
    evidence.push(item);await writeEvidence(db,canonicalId,item);
  }
  return{ok:true,canonicalId,evidence};
}

async function persistDecision(db,reference,decision,evidence){
  const current=await db.prepare('SELECT verified_mint,verification_state FROM intelligence_z500_token_registry WHERE canonical_id=?').bind(reference.canonicalId).first();
  const oldMint=s(current?.verified_mint),newMint=s(decision?.mint);
  let state=s(decision?.state)||'unverified',method=s(decision?.method),confidence=n(decision?.confidence),verifiedMint=newMint||null,conflictReason=null;

  if(oldMint&&newMint&&oldMint!==newMint){
    state='conflict';method='verified-mint-change-blocked';confidence=0;verifiedMint=oldMint;conflictReason=`previous:${oldMint};candidate:${newMint}`;
  }else if(oldMint&&!newMint&&state!=='verified'){
    verifiedMint=oldMint;
    if(state==='unverified'||state==='candidate'||state==='ambiguous')state='stale';
    conflictReason=`previously_verified:${oldMint};current:${s(decision?.state)}`;
  }

  const cg=evidence.find(item=>item.source==='coingecko'&&(!verifiedMint||item.mint===verifiedMint));
  await db.prepare(`
    UPDATE intelligence_z500_token_registry SET
      verified_mint=?,verification_state=?,verification_method=?,verification_confidence=?,
      coingecko_id=?,coingecko_mint=?,candidate_mints_json=?,evidence_json=?,conflict_reason=?,
      verified_at=CASE WHEN ?='verified' AND verified_at IS NULL THEN unixepoch() ELSE verified_at END,
      last_verified_at=CASE WHEN ?='verified' THEN unixepoch() ELSE last_verified_at END,
      last_seen_at=unixepoch(),updated_at=unixepoch()
    WHERE canonical_id=?
  `).bind(
    verifiedMint,state,method,confidence,s(cg?.sourceIdentifier)||null,s(cg?.mint)||null,
    JSON.stringify((decision?.candidates||[]).map(item=>item.mint)),
    JSON.stringify((decision?.candidates||[]).map(item=>({mint:item.mint,sources:item.sources,score:item.score,marketSupport:item.marketSupport}))),
    conflictReason,state,state,reference.canonicalId
  ).run();
  return{...decision,state,mint:state==='verified'?verifiedMint:null,storedMint:verifiedMint,conflictReason};
}

export async function resolveZ500Reference(env={},reference){
  const db=intelligenceDb(env);if(!db)return{ok:false,error:'database_unavailable'};
  await seedZ500IdentityRegistry(env,[reference]);
  const cg=await collectZ500CoinGeckoEvidence(env,reference);
  const dex=await collectZ500DexScreenerEvidence(env,reference);
  const candidateMints=[...(cg.evidence||[]),...(dex.evidence||[])].map(item=>item.mint);
  const pump=await collectZ500PumpEvidence(env,reference,candidateMints);
  const evidence=[...(cg.evidence||[]),...(dex.evidence||[]),...(pump.evidence||[])];
  const decision=evaluateZ500Identity({ansemName:reference.name,ansemTicker:reference.ticker},evidence);
  const stored=await persistDecision(db,reference,decision,evidence);
  return{ok:true,canonicalId:reference.canonicalId,reference,decision:stored,evidence,sourceHealth:{coingecko:cg.ok!==false,dexscreener:dex.ok!==false,pump: pump.ok!==false}};
}

export async function refreshZ500IdentityEvidence(env={}){
  const live=await loadLiveZ500References(env);
  if(!live.live&&!cfg(env).allowReferenceFallback)return{ok:false,failClosed:true,error:'live_z500_source_required'};
  await seedZ500IdentityRegistry(env,live.rows);
  const results=[];
  for(const reference of live.rows)results.push(await resolveZ500Reference(env,reference));
  const verified=results.filter(row=>row?.decision?.state==='verified');
  return{ok:verified.length===live.rows.length,failClosed:verified.length<live.rows.length,live:live.live,source:live.source,total:live.rows.length,verified:verified.length,results};
}

export async function evaluateStoredZ500Evidence(env={},canonicalId=''){
  const db=intelligenceDb(env);if(!db)return{ok:false,error:'database_unavailable'};
  const registry=await db.prepare('SELECT * FROM intelligence_z500_token_registry WHERE canonical_id=?').bind(canonicalId).first();
  if(!registry)return{ok:false,error:'registry_row_not_found'};
  const rows=await db.prepare(`SELECT source,source_identifier,candidate_mint,evidence_type,evidence_strength,payload_json,observed_at FROM intelligence_z500_identity_evidence WHERE canonical_id=? ORDER BY observed_at DESC,evidence_id DESC LIMIT 100`).bind(canonicalId).all();
  const evidence=(rows?.results||[]).map(row=>{
    let payload={};try{payload=JSON.parse(row.payload_json||'{}');}catch{}
    return{source:s(row.source),sourceIdentifier:s(row.source_identifier),mint:s(row.candidate_mint),name:s(payload.name),ticker:s(payload.symbol||payload.ticker),directMint:true,authoritativeLink:false,marketCapUsd:n(payload.marketCapUsd),volume24hUsd:n(payload.volume24hUsd),liquidityUsd:n(payload.liquidityUsd),pairCreatedAt:n(payload.pairCreatedAt)};
  });
  return{ok:true,canonicalId,decision:evaluateZ500Identity({ansemName:registry.ansem_name,ansemTicker:registry.ansem_ticker},evidence),evidence};
}

export const __z500EvidenceContract=Object.freeze({
  liveAnsemRequiredByDefault:true,
  sources:Object.freeze(['coingecko','dexscreener','pump-local']),
  heliusUsedForIdentity:false,
  exactMintCrossCheck:true,
  marketCapVolumeLiquidityAreSupportingSignals:true
});
