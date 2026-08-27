import { intelligenceDb } from './intelligence-indexer.mjs';
import {
  Z500_REFERENCE,
  evaluateZ500Identity
} from './intelligence-z500-identity-registry.mjs';

const BASE58_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;

function normalizeTicker(v){
  return s(v).replace(/^\$/,'').toUpperCase().replace(/[^A-Z0-9_]/g,'');
}

function normalizeName(v){
  return s(v).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'');
}

function cgHeaders(env={}){
  const key=s(env.COINGECKO_API_KEY);
  return key?{'x-cg-demo-api-key':key}:{};
}

async function fetchJson(url,{headers={},timeoutMs=7000}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{
      headers:{accept:'application/json',...headers},
      signal:controller.signal
    });
    if(!response.ok)throw new Error(`upstream_http_${response.status}`);
    return await response.json();
  }finally{
    clearTimeout(timer);
  }
}

async function coinGeckoSearch(env,reference){
  const query=encodeURIComponent(reference.name);
  const url=`https://api.coingecko.com/api/v3/search?query=${query}`;
  const data=await fetchJson(url,{headers:cgHeaders(env)});
  const expectedTicker=normalizeTicker(reference.ticker);
  const expectedName=normalizeName(reference.name);

  const hits=(Array.isArray(data?.coins)?data.coins:[])
    .filter(row=>{
      const ticker=normalizeTicker(row?.symbol);
      const name=normalizeName(row?.name);
      return ticker===expectedTicker || name===expectedName;
    })
    .slice(0,10);

  return hits;
}

async function coinGeckoCoin(env,id){
  const url=new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`);
  url.search=new URLSearchParams({
    localization:'false',
    tickers:'false',
    market_data:'false',
    community_data:'false',
    developer_data:'false',
    sparkline:'false'
  }).toString();

  return fetchJson(url,{headers:cgHeaders(env)});
}

async function writeEvidence(db,canonicalId,evidence){
  await db.prepare(`
    INSERT INTO intelligence_z500_identity_evidence(
      canonical_id,
      source,
      source_identifier,
      candidate_mint,
      evidence_type,
      evidence_strength,
      payload_json,
      observed_at,
      created_at
    )
    VALUES(?,?,?,?,?,?,?,unixepoch(),unixepoch())
  `).bind(
    canonicalId,
    s(evidence.source),
    s(evidence.sourceIdentifier)||null,
    s(evidence.mint)||null,
    s(evidence.evidenceType),
    n(evidence.evidenceStrength),
    JSON.stringify(evidence.payload||{})
  ).run();
}

export async function collectZ500CoinGeckoEvidence(env={},reference){
  const db=intelligenceDb(env);
  if(!db)return{ok:false,error:'database_unavailable'};

  const canonicalId=s(reference.canonicalId);
  if(!canonicalId)return{ok:false,error:'canonical_id_required'};

  let hits=[];
  try{
    hits=await coinGeckoSearch(env,reference);
  }catch(error){
    return{
      ok:false,
      canonicalId,
      error:s(error?.message||error)
    };
  }

  const evidence=[];

  for(const hit of hits){
    const id=s(hit?.id);
    if(!id)continue;

    let detail;
    try{
      detail=await coinGeckoCoin(env,id);
    }catch{
      continue;
    }

    const mint=s(detail?.platforms?.solana);
    if(!BASE58_RE.test(mint))continue;

    const item={
      source:'coingecko',
      sourceIdentifier:id,
      mint,
      name:s(detail?.name||hit?.name),
      ticker:s(detail?.symbol||hit?.symbol),
      directMint:true,
      authoritativeLink:false,
      evidenceType:'coingecko-solana-platform',
      evidenceStrength:0.55,
      payload:{
        coingeckoId:id,
        name:s(detail?.name||hit?.name),
        symbol:s(detail?.symbol||hit?.symbol)
      }
    };

    evidence.push(item);
    await writeEvidence(db,canonicalId,item);
  }

  return{
    ok:true,
    canonicalId,
    evidence
  };
}

export async function collectAllZ500CoinGeckoEvidence(env={}){
  const results=[];

  for(const reference of Z500_REFERENCE){
    results.push(
      await collectZ500CoinGeckoEvidence(env,reference)
    );
  }

  return{
    ok:true,
    count:results.length,
    results
  };
}

export async function evaluateStoredZ500Evidence(env={},canonicalId=''){
  const db=intelligenceDb(env);
  if(!db)return{ok:false,error:'database_unavailable'};

  const registry=await db.prepare(`
    SELECT *
    FROM intelligence_z500_token_registry
    WHERE canonical_id=?
  `).bind(canonicalId).first();

  if(!registry)return{ok:false,error:'registry_row_not_found'};

  const rows=await db.prepare(`
    SELECT source,source_identifier,candidate_mint,evidence_type,
           evidence_strength,payload_json,observed_at
    FROM intelligence_z500_identity_evidence
    WHERE canonical_id=?
    ORDER BY observed_at DESC,evidence_id DESC
    LIMIT 100
  `).bind(canonicalId).all();

  const evidence=(rows?.results||[]).map(row=>{
    let payload={};
    try{payload=JSON.parse(row.payload_json||'{}');}catch{}

    return{
      source:s(row.source),
      sourceIdentifier:s(row.source_identifier),
      mint:s(row.candidate_mint),
      name:s(payload.name),
      ticker:s(payload.symbol),
      directMint:true,
      authoritativeLink:false
    };
  });

  const decision=evaluateZ500Identity({
    ansemName:registry.ansem_name,
    ansemTicker:registry.ansem_ticker
  },evidence);

  return{
    ok:true,
    canonicalId,
    decision,
    evidence
  };
}
