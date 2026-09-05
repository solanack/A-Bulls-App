import { intelligenceDb } from './intelligence-indexer.mjs';
import { ingestIntelligenceBatch } from './intelligence-mesh-ingest.mjs';

const BASE58_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const uniq=v=>[...new Set(v.filter(Boolean))];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

function authorized(request,env={}){const expected=s(env.HELIUS_WEBHOOK_AUTH_SECRET||env.PUMP_INGEST_SECRET),header=s(request.headers.get('authorization')).replace(/^Bearer\s+/i,''),legacy=s(request.headers.get('x-pump-ingest-secret'));return Boolean(expected)&&(header===expected||legacy===expected);}
function eventClass(tx){const type=s(tx?.type||tx?.transactionType).toLowerCase();return tx?.events?.swap||/swap|trade|buy|sell/.test(type)?'swap-like':/nft.*sale|sale.*nft/.test(type)?'nft-sale':/nft.*transfer|transfer.*nft/.test(type)?'nft-transfer':/mint/.test(type)?'mint':/burn/.test(type)?'burn':'transfer';}
function transferMint(item){return s(item?.mint||item?.tokenMint||item?.assetId);}
function transferAmount(item){return Math.abs(n(item?.tokenAmount??item?.amount??item?.rawTokenAmount?.tokenAmount));}
function nativeAmount(item){const raw=n(item?.amount);return Math.abs(raw)>1000000?raw/1_000_000_000:raw;}

async function activeMintSet(db){const result=await db.prepare("SELECT DISTINCT entity_id FROM intelligence_universe_membership WHERE active=1 AND entity_kind='token'").all();return new Set((result?.results||[]).map(row=>s(row.entity_id)).filter(BASE58_RE.test.bind(BASE58_RE)));}

function rowsForTransaction(tx,activeMints,{captureCounterparties=false}={}){
  const signature=s(tx?.signature),blockTime=Math.max(0,Math.trunc(n(tx?.timestamp||tx?.blockTime||tx?.block_time))),slot=Math.max(0,Math.trunc(n(tx?.slot))),feePayer=s(tx?.feePayer||tx?.fee_payer),cls=eventClass(tx),feeLamports=Math.max(0,Math.trunc(n(tx?.fee))),tokenTransfers=Array.isArray(tx?.tokenTransfers)?tx.tokenTransfers:[],nativeTransfers=Array.isArray(tx?.nativeTransfers)?tx.nativeTransfers:[];
  if(!signature||!blockTime)return[];
  const wallets=new Set();if(BASE58_RE.test(feePayer))wallets.add(feePayer);
  if(captureCounterparties){for(const item of tokenTransfers){for(const value of[item?.fromUserAccount,item?.toUserAccount])if(BASE58_RE.test(s(value)))wallets.add(s(value));}}
  if(!wallets.size){for(const item of tokenTransfers){const candidate=s(item?.fromUserAccount||item?.toUserAccount);if(BASE58_RE.test(candidate)){wallets.add(candidate);break;}}}
  const rows=[];
  for(const wallet of wallets){
    const perMint=new Map();
    for(const item of tokenTransfers){const mint=transferMint(item);if(!activeMints.has(mint))continue;const amount=transferAmount(item);if(!amount)continue;const current=perMint.get(mint)||{tokenDelta:0,counterparties:new Set()};const from=s(item?.fromUserAccount),to=s(item?.toUserAccount);if(from===wallet){current.tokenDelta-=amount;if(BASE58_RE.test(to))current.counterparties.add(to);}if(to===wallet){current.tokenDelta+=amount;if(BASE58_RE.test(from))current.counterparties.add(from);}perMint.set(mint,current);}
    let solDelta=0;const nativePeers=new Set();for(const item of nativeTransfers){const from=s(item?.fromUserAccount),to=s(item?.toUserAccount),amount=nativeAmount(item);if(from===wallet){solDelta-=amount;if(BASE58_RE.test(to))nativePeers.add(to);}if(to===wallet){solDelta+=amount;if(BASE58_RE.test(from))nativePeers.add(from);}}
    for(const[mint,value]of perMint){const peers=uniq([...value.counterparties,...nativePeers]);rows.push({signature,slot,blockTime,wallet,counterparty:peers[0]||'',mint,eventClass:cls,solDelta,tokenDelta:value.tokenDelta,feeLamports:wallet===feePayer?feeLamports:0,source:'helius-universe-webhook',confidence:1,decoderVersion:'helius-universe-v2'});}
  }
  return rows;
}

export async function ingestHeliusUniversePayload(env={},payload=[]){
  const db=intelligenceDb(env);if(!db)throw new Error('database_unavailable');const txs=Array.isArray(payload)?payload:Array.isArray(payload?.events)?payload.events:[];if(txs.length>100)throw new Error('batch_too_large');
  const active=await activeMintSet(db),captureCounterparties=String(env.UNIVERSE_CAPTURE_COUNTERPARTIES||'false').toLowerCase()==='true',rows=txs.flatMap(tx=>rowsForTransaction(tx,active,{captureCounterparties}));
  const groups=new Map();for(const row of rows){if(!groups.has(row.wallet))groups.set(row.wallet,[]);groups.get(row.wallet).push(row);}
  let accepted=0,universeWritten=0,universeLinks=0,durableUniverseLinks=0;
  for(const[wallet,events]of groups){const result=await ingestIntelligenceBatch(env,{wallet,source:'helius-universe-webhook',sourceKind:'snapshot',events,verified:true,windowKey:'helius-live',bucketSeconds:300});accepted+=n(result.accepted);universeWritten+=n(result.universeWritten);universeLinks+=n(result.universeLinks);durableUniverseLinks+=n(result.durableUniverseLinks);}
  return{receivedTransactions:txs.length,decodedEvents:rows.length,accepted,activeMintCount:active.size,wallets:groups.size,universeWritten,universeLinks,durableUniverseLinks};
}

export async function handleHeliusUniverseWebhook(request,env={}){
  const url=new URL(request.url),path=url.pathname;if(path!=='/api/internal/intelligence/helius-universe-ingest')return null; // pump/ingest owned by pump-top10
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);if(!authorized(request,env))return json({ok:false,error:'unauthorized'},401);
  let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  try{return json({ok:true,result:await ingestHeliusUniversePayload(env,body)},202);}catch(error){return json({ok:false,error:s(error?.message||error)},400);}
}

export const __heliusUniverseIngestContract=Object.freeze({maxBatch:100,filtersAgainstActiveUniverseMints:true,legacyPumpIngestAlias:false,readOnly:true});

