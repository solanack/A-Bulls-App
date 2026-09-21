import { intelligenceDb } from './intelligence-indexer.mjs';
import { aggregateTraderHoldings, HOLDINGS_LIMIT, HOLDINGS_METHOD, holdingsDisclosure } from './intelligence-research-holdings.mjs';

const KINDS=new Set(['planet','star','trade','matched_round','research_thread','replay','evidence','cut','thesis','resolution','ghost','sequence','comparison']);
const ROUND_STATUS=new Set(['closed','open','unmatched']);
const WALLET_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_WALLET_RE=/^0x[a-fA-F0-9]{40}$/;
const s=value=>String(value??'').trim();
const json=(body,status=200,cache='public, max-age=10, stale-while-revalidate=30')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const parse=value=>{try{return JSON.parse(String(value||'{}'));}catch{return{};}};
const refs=value=>{const parsed=parse(value);return Array.isArray(parsed)?parsed:[];};
const ms=value=>{const n=Number(value);return Number.isInteger(n)&&n>=1_000_000_000_000?n:null;};
const finite=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;

export function mapResearchIndexRow(row={}){return Object.freeze({id:s(row.id),kind:s(row.kind),mint:s(row.mint)||null,wallet:s(row.wallet)||null,galaxyId:s(row.galaxy_id)||null,title:s(row.title),summary:s(row.summary)||null,sourceKind:s(row.source_kind),sourceRef:s(row.source_ref)||null,observedTs:ms(row.observed_ts),coverage:s(row.coverage)||null,visibility:s(row.visibility)||'public',payload:Object.freeze(parse(row.payload_json)),createdAt:ms(row.created_at),updatedAt:ms(row.updated_at)});}
export function mapMatchedRoundRow(row={}){return Object.freeze({id:s(row.id),wallet:s(row.wallet),mint:s(row.mint),status:s(row.status),entrySignature:s(row.entry_signature)||null,exitSignature:s(row.exit_signature)||null,entryTs:ms(row.entry_ts),exitTs:ms(row.exit_ts),buySol:finite(row.buy_sol),sellSol:finite(row.sell_sol),matchedRealizedSol:finite(row.matched_realized_sol),observedInventory:finite(row.observed_inventory),method:s(row.method),evidenceIds:Object.freeze(refs(row.evidence_ids_json).map(String)),coverage:s(row.coverage)||'partial',createdAt:ms(row.created_at),updatedAt:ms(row.updated_at)});}

async function listIndex(request,env={}){
  const db=intelligenceDb(env);if(!db)return json({ok:false,coverage:'degraded',items:[],error:'database_unavailable',disclosure:'The Intelligence D1 binding is unavailable. No live fallback was attempted.'},503,'no-store');
  const url=new URL(request.url),kind=s(url.searchParams.get('kind')),mint=s(url.searchParams.get('mint')),wallet=s(url.searchParams.get('wallet')),galaxy=s(url.searchParams.get('galaxy')),sourceKind=s(url.searchParams.get('sourceKind')),query=s(url.searchParams.get('q')).slice(0,120),limit=Math.max(1,Math.min(100,Math.trunc(Number(url.searchParams.get('limit'))||30)));
  if(kind&&!KINDS.has(kind))return json({ok:false,coverage:'empty',items:[],error:'invalid_kind'},400,'no-store');
  const where=["visibility='public'"],bindings=[];
  if(kind){where.push('kind=?');bindings.push(kind);}if(mint){where.push('mint=?');bindings.push(mint);}if(wallet){where.push('wallet=?');bindings.push(wallet);}if(galaxy){where.push('galaxy_id=?');bindings.push(galaxy);}if(sourceKind){where.push('source_kind=?');bindings.push(sourceKind);}if(query){where.push('(title LIKE ? OR summary LIKE ? OR mint LIKE ? OR wallet LIKE ?)');const q=`%${query.replaceAll('%','')}%`;bindings.push(q,q,q,q);}
  try{const result=await db.prepare(`SELECT id,kind,mint,wallet,galaxy_id,title,summary,source_kind,source_ref,observed_ts,coverage,visibility,payload_json,created_at,updated_at FROM research_index_objects WHERE ${where.join(' AND ')} ORDER BY COALESCE(observed_ts,updated_at) DESC,id DESC LIMIT ?`).bind(...bindings,limit).all();const items=(result?.results||[]).map(mapResearchIndexRow);return json({ok:true,coverage:items.length?'fresh':'empty',items,disclosure:items.length?'Indexed research objects only. Provider-reported context, user claims, and derived calculations retain their source labels.':'No retained public research objects match this query.'});}catch{return json({ok:false,coverage:'degraded',items:[],error:'research_index_unavailable',disclosure:'The research Index could not be read. No provider fallback was attempted.'},503,'no-store');}
}

async function objectDetail(env,id){
  const db=intelligenceDb(env);if(!db)return json({ok:false,error:'database_unavailable'},503,'no-store');
  try{const row=await db.prepare(`SELECT id,kind,mint,wallet,galaxy_id,title,summary,source_kind,source_ref,observed_ts,coverage,visibility,payload_json,created_at,updated_at FROM research_index_objects WHERE id=? AND visibility='public' LIMIT 1`).bind(id).first();if(!row)return json({ok:false,error:'not_found'},404,'public, max-age=15');const [outbound,inbound]=await Promise.all([db.prepare('SELECT id,from_id,to_id,relation,observed_ts,evidence_id,source_kind,created_at FROM research_graph_edges WHERE from_id=? ORDER BY COALESCE(observed_ts,created_at) DESC LIMIT 100').bind(id).all(),db.prepare('SELECT id,from_id,to_id,relation,observed_ts,evidence_id,source_kind,created_at FROM research_graph_edges WHERE to_id=? ORDER BY COALESCE(observed_ts,created_at) DESC LIMIT 100').bind(id).all()]);return json({ok:true,item:mapResearchIndexRow(row),graph:{outbound:outbound?.results||[],inbound:inbound?.results||[]},disclosure:'Graph edges describe retained evidence relationships. They do not imply identity, causation, skill, or recommendation.'});}catch{return json({ok:false,error:'research_object_unavailable'},503,'no-store');}
}

async function listRounds(request,env={}){
  const db=intelligenceDb(env);if(!db)return json({ok:false,coverage:'degraded',items:[],error:'database_unavailable'},503,'no-store');const url=new URL(request.url),wallet=s(url.searchParams.get('wallet')),mint=s(url.searchParams.get('mint')),status=s(url.searchParams.get('status')),limit=Math.max(1,Math.min(100,Math.trunc(Number(url.searchParams.get('limit'))||30)));if(!wallet&&!mint)return json({ok:false,coverage:'empty',items:[],error:'wallet_or_mint_required'},400,'no-store');if(status&&!ROUND_STATUS.has(status))return json({ok:false,coverage:'empty',items:[],error:'invalid_status'},400,'no-store');const where=[],bindings=[];if(wallet){where.push('wallet=?');bindings.push(wallet);}if(mint){where.push('mint=?');bindings.push(mint);}if(status){where.push('status=?');bindings.push(status);}try{const result=await db.prepare(`SELECT id,wallet,mint,status,entry_signature,exit_signature,entry_ts,exit_ts,buy_sol,sell_sol,matched_realized_sol,observed_inventory,method,evidence_ids_json,coverage,created_at,updated_at FROM matched_trade_rounds WHERE ${where.join(' AND ')} ORDER BY COALESCE(exit_ts,entry_ts,updated_at) DESC,id DESC LIMIT ?`).bind(...bindings,limit).all();const items=(result?.results||[]).map(mapMatchedRoundRow);return json({ok:true,coverage:items.length?'fresh':'empty',items,disclosure:'Closed rounds use deterministic bounded FIFO matching against retained observed swaps. Open rounds have no realized result. Unmatched sells never receive invented cost basis.'});}catch{return json({ok:false,coverage:'degraded',items:[],error:'matched_round_store_unavailable'},503,'no-store');}
}

async function tokenNames(db,mints){
  const unique=[...new Set(mints.map(s).filter(Boolean))];
  if(!unique.length)return [];
  const placeholders=unique.map(()=>'?').join(',');
  const names=[];
  try{
    const pump=await db.prepare(`SELECT mint,symbol,name FROM pump_tokens WHERE mint IN (${placeholders})`).bind(...unique).all();
    for(const row of pump?.results||[])names.push({mint:s(row.mint),name:s(row.name)||null,symbol:s(row.symbol)||null});
  }catch{/* pump_tokens may be empty or unavailable; names stay unknown */}
  try{
    const pons=await db.prepare(`SELECT token AS mint,symbol,name FROM pons_rank_candidates WHERE token IN (${placeholders})`).bind(...unique).all();
    for(const row of pons?.results||[])names.push({mint:s(row.mint),name:s(row.name)||null,symbol:s(row.symbol)||null});
  }catch{/* PONS names are optional indexed labels, never a PnL source */}
  return names;
}

async function listHoldings(request,env={}){
  const db=intelligenceDb(env);if(!db)return json({ok:false,coverage:'degraded',items:[],error:'database_unavailable',disclosure:'The Intelligence D1 binding is unavailable. No PnL was invented.'},503,'no-store');
  const url=new URL(request.url),wallet=s(url.searchParams.get('wallet')),limit=Math.max(1,Math.min(HOLDINGS_LIMIT,Math.trunc(Number(url.searchParams.get('limit'))||HOLDINGS_LIMIT)));
  if(!WALLET_RE.test(wallet))return json({ok:false,coverage:'empty',wallet,items:[],error:'invalid_public_wallet',disclosure:'A valid public wallet is required. No holdings or PnL were invented.'},400,'no-store');
  try{
    const result=await db.prepare(`SELECT id,wallet,mint,status,entry_signature,exit_signature,entry_ts,exit_ts,buy_sol,sell_sol,matched_realized_sol,observed_inventory,method,evidence_ids_json,coverage,created_at,updated_at FROM matched_trade_rounds WHERE wallet=? AND status IN ('closed','open') ORDER BY COALESCE(exit_ts,entry_ts,updated_at) DESC,id DESC LIMIT 250`).bind(wallet).all();
    const rounds=(result?.results||[]).map(mapMatchedRoundRow);
    const items=aggregateTraderHoldings(rounds,await tokenNames(db,rounds.map(row=>row.mint)),{limit});
    return json({ok:true,coverage:items.length?'fresh':'empty',wallet,items,method:HOLDINGS_METHOD,disclosure:holdingsDisclosure(items.length)});
  }catch{
    return json({ok:false,coverage:'degraded',wallet,items:[],error:'holdings_store_unavailable',disclosure:'Indexed holdings could not be read. No PnL was invented.'},503,'no-store');
  }
}

export function walletAddressKind(value=''){
  const wallet=s(value);if(WALLET_RE.test(wallet))return'solana';if(EVM_WALLET_RE.test(wallet))return'evm';return null;
}
export function mapWalletSystemRows(rows=[],{walletKind='solana',limit=10}={}){
  const cap=Math.max(1,Math.min(50,Math.trunc(Number(limit)||10)));
  return Object.freeze((Array.isArray(rows)?rows:[]).map(row=>{
    const chainKey=s(row?.chain_key)||(walletKind==='solana'?'solana':'unknown'),mint=s(row?.asset_address||row?.mint),sourceKinds=s(row?.source_kinds).split(',').map(s).filter(Boolean),observed=walletKind==='solana'||sourceKinds.includes('observed-fact');
    return Object.freeze({chainKey,mint,eventCount:Math.max(0,Math.trunc(Number(row?.event_count)||0)),tradeCount:Math.max(0,Math.trunc(Number(row?.trade_count)||0)),firstObservedAt:Math.max(0,Math.trunc(Number(row?.first_event)||0))||null,lastObservedAt:Math.max(0,Math.trunc(Number(row?.last_event)||0))||null,observedTokenFlow:Math.abs(Number(row?.observed_token_flow)||0),confidence:Math.max(0,Math.min(1,Number(row?.max_confidence)||0)),sourceKind:observed?'observed':'provider-reported',sourceKinds:Object.freeze(sourceKinds)});
  }).filter(row=>row.mint&&row.chainKey!=='unknown').sort((a,b)=>b.tradeCount-a.tradeCount||b.eventCount-a.eventCount||(b.lastObservedAt||0)-(a.lastObservedAt||0)).slice(0,cap));
}

async function listWalletSystem(request,env={}){
  const db=intelligenceDb(env);if(!db)return json({ok:false,coverage:'degraded',items:[],error:'database_unavailable',disclosure:'The Intelligence D1 binding is unavailable. No wallet activity was invented.'},503,'no-store');
  const url=new URL(request.url),wallet=s(url.searchParams.get('wallet')),walletKind=walletAddressKind(wallet),limit=Math.max(1,Math.min(50,Math.trunc(Number(url.searchParams.get('limit'))||10)));
  if(!walletKind)return json({ok:false,coverage:'empty',wallet,items:[],error:'invalid_public_wallet',disclosure:'A valid public Solana or EVM wallet is required. No activity was invented.'},400,'no-store');
  try{
    let rows=[];
    if(walletKind==='solana'){
      const result=await db.prepare(\`SELECT 'solana' chain_key,mint asset_address,COUNT(*) event_count,SUM(CASE WHEN event_class='swap-like' THEN 1 ELSE 0 END) trade_count,MIN(block_time) first_event,MAX(block_time) last_event,SUM(ABS(COALESCE(token_delta,0))) observed_token_flow,MAX(COALESCE(confidence,0)) max_confidence,'observed-fact' source_kinds FROM bull_wallet_events WHERE wallet=? AND mint IS NOT NULL AND mint<>'' GROUP BY mint ORDER BY trade_count DESC,event_count DESC,last_event DESC LIMIT ?\`).bind(wallet,limit).all();
      rows=result?.results||[];
    }
    if(!rows.length){
      const result=await db.prepare(\`SELECT chain_key,asset_address,COUNT(*) event_count,SUM(CASE WHEN event_class IN ('swap','swap-like','trade') OR side IN ('buy','sell') THEN 1 ELSE 0 END) trade_count,MIN(block_time) first_event,MAX(block_time) last_event,SUM(ABS(COALESCE(amount,0))) observed_token_flow,MAX(COALESCE(confidence,0)) max_confidence,GROUP_CONCAT(DISTINCT source_kind) source_kinds FROM intelligence_chain_events_v2 WHERE LOWER(wallet_address)=LOWER(?) AND asset_address IS NOT NULL AND asset_address<>'' GROUP BY chain_key,asset_address ORDER BY trade_count DESC,event_count DESC,last_event DESC LIMIT ?\`).bind(wallet,limit).all();
      rows=result?.results||[];
    }
    const items=mapWalletSystemRows(rows,{walletKind,limit}),coverage=items.length?'fresh':'empty';
    return json({ok:true,coverage,wallet,walletKind,items,disclosure:items.length?'PLANETS represent retained wallet/token observations only. Event and trade counts describe indexed evidence, not intent, identity, ownership, skill, or complete history. Provider-reported rows remain labeled separately.':'No retained wallet/token observations are indexed for this public address. The STAR remains empty rather than inventing holdings or activity.'});
  }catch{return json({ok:false,coverage:'degraded',wallet,walletKind,items:[],error:'wallet_system_unavailable',disclosure:'Indexed wallet activity could not be read. No holdings, trades, or PnL were invented.'},503,'no-store');}
}

async function coverage(env={}){
  const db=intelligenceDb(env);if(!db)return json({ok:false,coverage:'degraded',sources:[],error:'database_unavailable'},503,'no-store');
  try{const result=await db.prepare('SELECT source,last_observed_slot,last_verified_slot,gap_from_slot,gap_to_slot,status,detail,updated_at FROM index_coverage_checkpoints ORDER BY source ASC').all();return json({ok:true,coverage:'fresh',sources:result?.results||[],disclosure:'Observed-through and verified-through are different. Verified-through slots are shown only when an indexing process independently wrote verification evidence.'});}catch{return json({ok:false,coverage:'degraded',sources:[],error:'coverage_store_unavailable'},503,'no-store');}
}

export async function handleResearchIndexRequest(request,env={}){
  const url=new URL(request.url),detail=url.pathname.match(/^\/api\/intelligence\/research\/index\/(.+)$/);
  if(request.method==='GET'&&url.pathname==='/api/intelligence/research/index')return listIndex(request,env);
  if(request.method==='GET'&&detail)return objectDetail(env,decodeURIComponent(detail[1]));
  if(request.method==='GET'&&url.pathname==='/api/intelligence/research/rounds')return listRounds(request,env);
  if(request.method==='GET'&&url.pathname==='/api/intelligence/research/holdings')return listHoldings(request,env);
  if(request.method==='GET'&&url.pathname==='/api/intelligence/research/wallet-system')return listWalletSystem(request,env);
  if(request.method==='GET'&&url.pathname==='/api/intelligence/research/coverage')return coverage(env);
  return null;
}
