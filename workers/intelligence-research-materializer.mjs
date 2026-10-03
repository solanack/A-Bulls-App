import { intelligenceDb } from './intelligence-indexer.mjs';

const WSOL='So11111111111111111111111111111111111111112';
const s=value=>String(value??'').trim();
const finite=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const nowMs=()=>Date.now();
const secToMs=value=>{const n=finite(value);return n==null?null:Math.trunc(n*1000);};
const clamp=(value,fallback,min,max)=>Math.max(min,Math.min(max,Math.trunc(Number(value)||fallback)));
const short=(value,size=18)=>{const text=s(value);return text.length>size?`${text.slice(0,8)}…${text.slice(-6)}`:text;};
const jsonText=value=>JSON.stringify(value??{});

const METHOD='bounded-fifo-observed-swaps-v1';
const TRADE_PAGE=200;
const TRADE_CEILING=5000;
const CHAIN_WALLET_PAGE=4;
const CHAIN_MINT_LIMIT=8;
const BASIS_PAIR_PAGE=4;
const BASIS_TRADE_PAGE=25;
const PUMP_PAIR_PAGE_DEFAULT=6;

function evidenceKey(row){return s(row.event_id)||s(row.signature)||`${s(row.wallet)}:${s(row.mint)}:${s(row.block_time)}`;}
function amount(value){const n=finite(value);return n!=null&&n>0?n:null;}
function roundId(wallet,mint,entryId,exitId,status){return `round:${wallet}:${mint}:${entryId||status}:${exitId||status}`;}
function solOf(row){
  if(row?.sol_amount==null||row.sol_amount==='')return null;
  const n=Number(row.sol_amount);
  return Number.isFinite(n)?Math.abs(n):null;
}
function freezeRound(round){return Object.freeze({...round,evidenceIds:Object.freeze([...new Set((round.evidenceIds||[]).map(String).filter(Boolean))])});}
function normalizeOpeningLot(lot={}){
  const remaining=amount(lot.remaining??lot.token_remaining);
  if(remaining==null)return null;
  const costRaw=lot.cost!==undefined?lot.cost:lot.cost_sol;
  const cost=costRaw==null||costRaw===''?null:(Number.isFinite(Number(costRaw))?Math.abs(Number(costRaw)):null);
  return {remaining,cost,evidenceId:s(lot.evidenceId||lot.evidence_id)||'opening-lot',signature:s(lot.signature||lot.entry_signature)||null,openedAt:finite(lot.openedAt??lot.opened_at),wallet:s(lot.wallet),mint:s(lot.mint)};
}

/** Open rows from a previous run that this complete recompute no longer emits. */
export function staleOpenIds(existing=[],next=[],{complete=true}={}){
  if(!complete)return Object.freeze([]);
  const keep=new Set((Array.isArray(next)?next:[]).filter(row=>s(row?.status)==='open').map(row=>s(row?.id)).filter(Boolean));
  return Object.freeze((Array.isArray(existing)?existing:[]).filter(row=>s(row?.status)==='open'&&!keep.has(s(row?.id))).map(row=>s(row?.id)).filter(Boolean));
}

/** Fomo and Afterbell chain rounds stay on their own galaxy. Pump is not a label here. */
export function chainRoundGalaxy(sources=[],{fomoWallet=false}={}){
  const list=(Array.isArray(sources)?sources:[sources]).map(value=>s(value).toLowerCase());
  if(list.some(source=>source.includes('afterbell')))return 'afterbell';
  if(fomoWallet)return 'fomo';
  return null;
}

/**
 * Build FIFO trades from retained wallet events and wSOL route legs.
 * Provider USD PnL is ignored. Non-wSOL quotes are not converted into SOL.
 * Signatures still present in pump_trades are left to the pump materializer.
 */
export function tradesFromWalletEvidence(events=[],routes=[],{pumpSignatures}={}){
  const blocked=pumpSignatures instanceof Set?pumpSignatures:new Set(pumpSignatures||[]);
  const bySig=new Map();
  for(const route of Array.isArray(routes)?routes:[]){
    const sig=s(route.signature);
    if(!sig)continue;
    if(!bySig.has(sig))bySig.set(sig,[]);
    bySig.get(sig).push(route);
  }
  const trades=[];
  const seen=new Set();
  const push=(trade)=>{
    const sig=s(trade.signature);
    if(sig&&blocked.has(sig))return;
    const key=`${sig}:${s(trade.mint)}:${s(trade.side)}`;
    if(seen.has(key))return;
    seen.add(key);
    trades.push(trade);
  };
  for(const event of Array.isArray(events)?events:[]){
    const token=Math.abs(Number(event.token_delta??event.token_amount)||0);
    if(!(token>0))continue;
    const side=Number(event.token_delta??event.token_amount)>0?'buy':'sell';
    const sig=s(event.signature);
    let sol=null;
    const solDelta=Number(event.sol_delta);
    if(Number.isFinite(solDelta)&&solDelta!==0)sol=Math.abs(solDelta);
    const hop=(bySig.get(sig)||[]).find(route=>{
      const ends=new Set([s(route.input_mint),s(route.output_mint)]);
      return ends.has(WSOL)&&ends.has(s(event.mint));
    });
    if(hop){
      const wsolAmount=s(hop.input_mint)===WSOL?Number(hop.input_amount):Number(hop.output_amount);
      if(Number.isFinite(wsolAmount)&&wsolAmount>0)sol=wsolAmount;
    }
    push({event_id:sig||`event:${s(event.id)}`,signature:sig||null,event_index:0,wallet:s(event.wallet),mint:s(event.mint),side,token_amount:token,sol_amount:sol,block_time:event.block_time});
  }
  for(const route of Array.isArray(routes)?routes:[]){
    const input=s(route.input_mint),output=s(route.output_mint);
    if(input!==WSOL&&output!==WSOL)continue;
    const mint=input===WSOL?output:input;
    if(!mint||mint===WSOL)continue;
    const sig=s(route.signature);
    const side=output===mint?'buy':'sell';
    const token=input===WSOL?Number(route.output_amount):Number(route.input_amount);
    const sol=input===WSOL?Number(route.input_amount):Number(route.output_amount);
    if(!(token>0))continue;
    push({event_id:sig||`route:${mint}:${s(route.hop_index)}`,signature:sig||null,event_index:Number(route.hop_index)||0,wallet:s(route.wallet),mint,side,token_amount:token,sol_amount:Number.isFinite(sol)&&sol>0?sol:null,block_time:route.block_time});
  }
  return trades;
}

export function derivePosition(rows=[],{openingLots=[]}={}){
  const ordered=[...rows].sort((a,b)=>Number(a.block_time||0)-Number(b.block_time||0)||Number(a.event_index||0)-Number(b.event_index||0)||s(a.event_id).localeCompare(s(b.event_id)));
  const rounds=[];
  let lots=(Array.isArray(openingLots)?openingLots:[]).map(normalizeOpeningLot).filter(Boolean);
  const consume=(lot,take)=>{
    const takeCost=lot.cost==null?null:lot.cost*(take/lot.remaining);
    lot.remaining-=take;
    if(lot.cost!=null&&takeCost!=null)lot.cost=Math.max(0,lot.cost-takeCost);
    return takeCost;
  };
  for(const row of ordered){
    const side=s(row.side).toLowerCase(),token=amount(row.token_amount);
    if((side!=='buy'&&side!=='sell')||token==null)continue;
    const wallet=s(row.wallet),mint=s(row.mint),sol=solOf(row);
    if(side==='buy'){
      lots.push({remaining:token,cost:sol,evidenceId:evidenceKey(row),signature:s(row.signature)||null,openedAt:secToMs(row.block_time),wallet,mint});
      continue;
    }
    let remaining=token,pricedBuy=0,pricedSell=0,pricedTokens=0,entryLot=null;
    const pricedEvidence=[];
    while(remaining>1e-12&&lots.length){
      const lot=lots[0],take=Math.min(remaining,lot.remaining),takeCost=consume(lot,take);
      const takeProceeds=sol==null?null:sol*(take/token);
      if(takeCost!=null&&takeProceeds!=null){
        if(!entryLot)entryLot={evidenceId:lot.evidenceId,signature:lot.signature,openedAt:lot.openedAt};
        pricedBuy+=takeCost;pricedSell+=takeProceeds;pricedTokens+=take;
        if(lot.evidenceId)pricedEvidence.push(lot.evidenceId);
      }
      remaining-=take;
      if(lot.remaining<=1e-12)lots.shift();
    }
    const sellKey=evidenceKey(row);
    if(pricedTokens>1e-12&&entryLot)rounds.push(freezeRound({id:roundId(wallet,mint,entryLot.evidenceId,sellKey,'closed'),wallet,mint,status:'closed',entrySignature:entryLot.signature,exitSignature:s(row.signature)||null,entryTs:entryLot.openedAt,exitTs:secToMs(row.block_time),buySol:pricedBuy,sellSol:pricedSell,matchedRealizedSol:pricedSell-pricedBuy,observedInventory:0,method:METHOD,evidenceIds:[...pricedEvidence,sellKey],coverage:'complete'}));
    const unsupported=token-pricedTokens;
    if(unsupported>1e-9)rounds.push(freezeRound({id:roundId(wallet,mint,null,sellKey,'unmatched'),wallet,mint,status:'unmatched',entrySignature:null,exitSignature:s(row.signature)||null,entryTs:null,exitTs:secToMs(row.block_time),buySol:null,sellSol:sol==null?null:sol*(unsupported/token),matchedRealizedSol:null,observedInventory:0,method:METHOD,evidenceIds:[sellKey],coverage:'partial'}));
  }
  lots=lots.filter(lot=>lot.remaining>1e-12);
  if(lots.length){
    const entry=lots[0],unknown=lots.some(lot=>lot.cost==null),wallet=entry.wallet||s(ordered[0]?.wallet),mint=entry.mint||s(ordered[0]?.mint);
    rounds.push(freezeRound({id:roundId(wallet,mint,entry.evidenceId,null,'open'),wallet,mint,status:'open',entrySignature:entry.signature,exitSignature:null,entryTs:entry.openedAt,exitTs:null,buySol:unknown?null:lots.reduce((sum,lot)=>sum+(lot.cost||0),0),sellSol:unknown?null:0,matchedRealizedSol:null,observedInventory:lots.reduce((sum,lot)=>sum+lot.remaining,0),method:METHOD,evidenceIds:lots.map(lot=>lot.evidenceId),coverage:'partial'}));
  }
  return {rounds:Object.freeze(rounds),openLots:Object.freeze(lots.map(lot=>Object.freeze({...lot})))};
}

export function deriveMatchedRounds(rows=[],options={}){return derivePosition(rows,options).rounds;}

export function replayObjectForRound(round,{galaxyId='pump-fun',lastTs=nowMs(),symbol=''}={}){
  const entryTs=finite(round?.entryTs);if(!round||round.status==='unmatched'||entryTs==null)return null;
  const exitTs=finite(round.exitTs),boundedEnd=exitTs??Math.max(entryTs,finite(lastTs)??entryTs),mint=s(round.mint),wallet=s(round.wallet),label=s(symbol)||short(mint);
  return Object.freeze({id:`replay:${s(round.id)}`,kind:'replay',mint,wallet,galaxyId,title:`Replay · ${label}`,summary:round.status==='closed'?'Deterministic bounded Replay for a matched observed trade round':'Deterministic bounded Replay for currently open observed inventory',sourceKind:'derived',sourceRef:s(round.id),observedTs:exitTs??entryTs,coverage:s(round.coverage)||'partial',payload:Object.freeze({matchedRoundId:s(round.id),status:s(round.status),fromTs:entryTs,toTs:boundedEnd,entrySignature:s(round.entrySignature)||null,exitSignature:s(round.exitSignature)||null,evidenceIds:Object.freeze([...(round.evidenceIds||[])].map(String)),quoteMint:WSOL,bucketSeconds:60})});
}

function indexStatement(db,{id,kind,mint=null,wallet=null,galaxyId=null,title,summary=null,sourceKind,sourceRef=null,observedTs=null,coverage=null,visibility='public',payload={},createdAt=nowMs(),updatedAt=createdAt}){
  return db.prepare(`INSERT INTO research_index_objects(id,kind,mint,wallet,galaxy_id,title,summary,source_kind,source_ref,observed_ts,coverage,visibility,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET mint=excluded.mint,wallet=excluded.wallet,galaxy_id=excluded.galaxy_id,title=excluded.title,summary=excluded.summary,source_kind=excluded.source_kind,source_ref=excluded.source_ref,observed_ts=excluded.observed_ts,coverage=excluded.coverage,visibility=excluded.visibility,payload_json=excluded.payload_json,updated_at=excluded.updated_at`).bind(id,kind,mint,wallet,galaxyId,title,summary,sourceKind,sourceRef,observedTs,coverage,visibility,jsonText(payload),createdAt,updatedAt);
}
function edgeStatement(db,{fromId,toId,relation,observedTs=null,evidenceId=null,sourceKind='observed',createdAt=nowMs()}){const id=`${fromId}|${relation}|${toId}|${evidenceId||''}`;return db.prepare(`INSERT OR IGNORE INTO research_graph_edges(id,from_id,to_id,relation,observed_ts,evidence_id,source_kind,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(id,fromId,toId,relation,observedTs,evidenceId,sourceKind,createdAt);}
async function runStatements(db,statements,chunkSize=40){for(let i=0;i<statements.length;i+=chunkSize)await db.batch(statements.slice(i,i+chunkSize));}

async function readJsonCheckpoint(db,source){
  const row=await db.prepare('SELECT detail FROM index_coverage_checkpoints WHERE source=?').bind(source).first().catch(()=>null);
  try{const parsed=JSON.parse(s(row?.detail)||'{}');return parsed&&typeof parsed==='object'?parsed:{};}catch{return {};}
}
async function writeJsonCheckpoint(db,source,status,detail,now){
  await db.prepare(`INSERT INTO index_coverage_checkpoints(source,status,detail,updated_at) VALUES(?,?,?,?) ON CONFLICT(source) DO UPDATE SET status=excluded.status,detail=excluded.detail,updated_at=excluded.updated_at`).bind(source,status,jsonText(detail),now).run().catch(()=>{});
}
function roundNow(now){const value=Number(now)||Date.now();return value>10_000_000_000?Math.trunc(value):Math.trunc(value*1000);}
function evidenceList(row){
  const raw=row?.evidenceIds??row?.evidence_ids_json;
  if(Array.isArray(raw))return raw.map(s).filter(Boolean);
  try{const parsed=JSON.parse(s(raw)||'[]');return Array.isArray(parsed)?parsed.map(s).filter(Boolean):[];}catch{return [];}
}
async function loadOpeningLots(db,wallet,mint){
  const result=await db.prepare(`SELECT evidence_id,entry_signature,opened_at,token_remaining,cost_sol FROM matched_position_lots WHERE wallet=? AND mint=? AND source='pump_trades' AND token_remaining>0 ORDER BY lot_order ASC,evidence_id ASC`).bind(wallet,mint).all();
  return (result?.results||[]).map(row=>({evidenceId:row.evidence_id,signature:row.entry_signature,openedAt:finite(row.opened_at),remaining:row.token_remaining,cost:row.cost_sol,wallet,mint}));
}
/** Open rows whose entry buy is no longer in pump_trades. Do not invent a second lot when the buy is still in this page or already stored. */
export function lotsFromOpenRounds(opens=[],{trades=[],storedLots=[]}={}){
  const represented=new Set();
  for(const lot of storedLots){if(s(lot?.evidenceId))represented.add(s(lot.evidenceId));if(s(lot?.signature))represented.add(s(lot.signature));}
  for(const trade of trades){if(s(trade?.side).toLowerCase()!=='buy')continue;const key=evidenceKey(trade);if(key)represented.add(key);if(s(trade?.signature))represented.add(s(trade.signature));}
  const lots=[];
  for(const open of opens){
    if(s(open?.status||'open')!=='open')continue;
    const evidence=evidenceList(open),signature=s(open.entrySignature||open.entry_signature)||null,evidenceId=evidence[0]||signature||'';
    if(!evidenceId||represented.has(evidenceId)||(signature&&represented.has(signature)))continue;
    const remaining=amount(open.observedInventory??open.observed_inventory);
    if(remaining==null)continue;
    const costRaw=open.buySol!==undefined?open.buySol:open.buy_sol,cost=costRaw==null||costRaw===''?null:(Number.isFinite(Number(costRaw))?Math.abs(Number(costRaw)):null);
    represented.add(evidenceId);if(signature)represented.add(signature);
    for(const id of evidence)represented.add(id);
    lots.push({evidenceId,signature,openedAt:finite(open.entryTs??open.entry_ts),remaining,cost,wallet:s(open.wallet),mint:s(open.mint)});
  }
  return lots;
}
/**
 * Trades already inside a seeded open snapshot.
 * Evidence ids are skipped, including every id in evidence_ids_json, because the old writer recorded the buys and partial sells it folded.
 * That list is not sufficient: a retained sell can already be netted into observed_inventory without appearing in the list.
 * updated_at is the snapshot write, so a trade that is not strictly newer than every seeded row can already be inside it.
 * Only a trade absent from those evidence ids and strictly newer than the snapshot is applied on top. Anything else is marked applied and left out, so the open inventory is not shrunk by a second pass.
 */
export function partitionPumpSnapshot(opens=[],trades=[],{storedLots=[]}={}){
  const seeded=lotsFromOpenRounds(opens,{trades,storedLots});
  const list=Array.isArray(trades)?trades:[];
  if(!seeded.length)return {seeded,fresh:list,reflected:[],watermarkMs:null,evidenceIds:[]};
  const seededIds=new Set(seeded.map(lot=>s(lot.evidenceId)).filter(Boolean));
  const evidence=new Set();
  const evidenceIds=[];
  let watermarkMs=null,missingTime=false;
  for(const open of Array.isArray(opens)?opens:[]){
    const ids=evidenceList(open),signature=s(open.entrySignature||open.entry_signature)||'',evidenceId=ids[0]||signature;
    if(!evidenceId||!seededIds.has(evidenceId))continue;
    for(const id of ids){if(!evidence.has(id))evidenceIds.push(id);evidence.add(id);}
    if(signature)evidence.add(signature);
    const updated=finite(open.updatedAt??open.updated_at);
    if(updated==null)missingTime=true;
    else watermarkMs=watermarkMs==null?updated:Math.max(watermarkMs,updated);
  }
  if(missingTime)watermarkMs=null;
  const reflected=[],fresh=[];
  for(const trade of list){
    const key=evidenceKey(trade),sig=s(trade?.signature),ms=secToMs(trade?.block_time);
    const listed=(key&&evidence.has(key))||(sig&&evidence.has(sig));
    const notProvenNew=watermarkMs==null||ms==null||ms<=watermarkMs;
    if(listed||notProvenNew)reflected.push(trade);else fresh.push(trade);
  }
  return {seeded,fresh,reflected,watermarkMs,evidenceIds};
}
/** Stale open ids whose entry evidence is present on a round this recompute emits. An unmatched open with no replacement is kept. */
export function replaceableOpenIds(existing=[],next=[],{openingLots=[],trades=[]}={}){
  const hasBuy=(Array.isArray(trades)?trades:[]).some(trade=>s(trade?.side).toLowerCase()==='buy'&&amount(trade.token_amount??trade.tokenAmount)!=null);
  if(!(Array.isArray(openingLots)?openingLots:[]).length&&!hasBuy)return Object.freeze([]);
  const covered=new Set();
  for(const round of Array.isArray(next)?next:[]){if(s(round?.entrySignature))covered.add(s(round.entrySignature));if(s(round?.id))covered.add(s(round.id));for(const id of round?.evidenceIds||[])if(s(id))covered.add(s(id));}
  return Object.freeze(staleOpenIds(existing,next,{complete:true}).filter(id=>{
    const row=(Array.isArray(existing)?existing:[]).find(item=>s(item?.id)===id);
    if(!row)return false;
    return [s(row.entrySignature||row.entry_signature),s(row.id),...evidenceList(row)].some(key=>key&&covered.has(key));
  }));
}
async function unappliedPumpTrades(db,wallet,mint,{cutoff=null,limit=BASIS_TRADE_PAGE}={}){
  const sql=cutoff==null
    ?`SELECT event_id,signature,event_index,mint,wallet,side,token_amount,sol_amount,price_sol,slot,block_time,source,commitment FROM pump_trades WHERE wallet=? AND mint=? AND side IN ('buy','sell') AND NOT EXISTS (SELECT 1 FROM matched_basis_applied a WHERE a.source='pump_trades' AND a.evidence_id=pump_trades.event_id) ORDER BY block_time ASC,event_index ASC,event_id ASC LIMIT ?`
    :`SELECT event_id,signature,event_index,mint,wallet,side,token_amount,sol_amount,price_sol,slot,block_time,source,commitment FROM pump_trades WHERE wallet=? AND mint=? AND block_time<? AND side IN ('buy','sell') AND NOT EXISTS (SELECT 1 FROM matched_basis_applied a WHERE a.source='pump_trades' AND a.evidence_id=pump_trades.event_id) ORDER BY block_time ASC,event_index ASC,event_id ASC LIMIT ?`;
  const result=cutoff==null?await db.prepare(sql).bind(wallet,mint,limit).all():await db.prepare(sql).bind(wallet,mint,cutoff,limit).all();
  return result?.results||[];
}
async function tokenLabel(db,mint){
  const token=await db.prepare('SELECT symbol,name,metadata_source FROM pump_tokens WHERE mint=? LIMIT 1').bind(mint).first().catch(()=>null);
  return {symbol:s(token?.symbol),name:s(token?.name),source:s(token?.metadata_source)||'pump-index'};
}
function appendRoundStatements(statements,db,{rounds,wallet,mint,galaxyId,symbol,now,lastTs,tradePrefix}){
  const planetId=`planet:${galaxyId}:${mint}`,starId=`star:solana:${wallet}`;
  let replays=0;
  for(const round of rounds){
    const rid=round.id,matchedId=`matched:${rid}`,observedTs=round.exitTs??round.entryTs??lastTs;
    statements.push(db.prepare(`INSERT INTO matched_trade_rounds(id,wallet,mint,status,entry_signature,exit_signature,entry_ts,exit_ts,buy_sol,sell_sol,matched_realized_sol,observed_inventory,method,evidence_ids_json,coverage,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,exit_signature=excluded.exit_signature,exit_ts=excluded.exit_ts,buy_sol=excluded.buy_sol,sell_sol=excluded.sell_sol,matched_realized_sol=excluded.matched_realized_sol,observed_inventory=excluded.observed_inventory,evidence_ids_json=excluded.evidence_ids_json,coverage=excluded.coverage,updated_at=excluded.updated_at`).bind(rid,wallet,mint,round.status,round.entrySignature,round.exitSignature,round.entryTs,round.exitTs,round.buySol,round.sellSol,round.matchedRealizedSol,round.observedInventory,round.method,jsonText(round.evidenceIds),round.coverage,now,now));
    statements.push(indexStatement(db,{id:matchedId,kind:'matched_round',mint,wallet,galaxyId,title:`${round.status.toUpperCase()} round · ${symbol||short(mint)}`,summary:round.status==='closed'&&round.matchedRealizedSol!=null?`FIFO matched observed result ${round.matchedRealizedSol>=0?'+':''}${round.matchedRealizedSol.toFixed(4)} SOL`:`${round.status} observed inventory round; no unsupported realized result`,sourceKind:'derived',sourceRef:rid,observedTs,coverage:round.coverage,payload:round}));
    statements.push(edgeStatement(db,{fromId:starId,toId:matchedId,relation:'has_round',observedTs,sourceKind:'derived'}),edgeStatement(db,{fromId:matchedId,toId:planetId,relation:'round_on_planet',observedTs,sourceKind:'derived'}));
    for(const evidenceId of round.evidenceIds)statements.push(edgeStatement(db,{fromId:matchedId,toId:`${tradePrefix}${evidenceId}`,relation:'contains_trade',observedTs,evidenceId,sourceKind:'derived'}));
    const replay=replayObjectForRound(round,{galaxyId,lastTs,symbol});
    if(replay){statements.push(indexStatement(db,replay),edgeStatement(db,{fromId:matchedId,toId:replay.id,relation:'has_replay',observedTs,sourceKind:'derived'}),edgeStatement(db,{fromId:replay.id,toId:matchedId,relation:'replays_round',observedTs,sourceKind:'derived'}));for(const evidenceId of round.evidenceIds)statements.push(edgeStatement(db,{fromId:replay.id,toId:`${tradePrefix}${evidenceId}`,relation:'replay_receipt',observedTs,evidenceId,sourceKind:'derived'}));replays++;}
  }
  return replays;
}

async function applyPumpPairPage(db,{wallet,mint,cutoff=null,now,symbol,name,source}){
  const trades=await unappliedPumpTrades(db,wallet,mint,{cutoff});
  if(!trades.length)return {applied:0,rounds:0,replays:0,deleted:false};
  const openingLots=await loadOpeningLots(db,wallet,mint),stamped=roundNow(now);
  const existing=(await db.prepare(`SELECT id,wallet,mint,status,entry_signature,entry_ts,buy_sol,observed_inventory,evidence_ids_json,updated_at FROM matched_trade_rounds WHERE wallet=? AND mint=? AND status='open'`).bind(wallet,mint).all())?.results||[];
  const snapshot=partitionPumpSnapshot(existing,trades,{storedLots:openingLots});
  const seeded=snapshot.seeded.map(lot=>({...lot,wallet:lot.wallet||wallet,mint:lot.mint||mint})),actionable=snapshot.fresh;
  const position=derivePosition(actionable,{openingLots:[...openingLots,...seeded]});
  const basis=[db.prepare(`DELETE FROM matched_position_lots WHERE wallet=? AND mint=? AND source='pump_trades'`).bind(wallet,mint)];
  position.openLots.forEach((lot,lotOrder)=>basis.push(db.prepare(`INSERT INTO matched_position_lots(id,wallet,mint,evidence_id,entry_signature,opened_at,token_remaining,cost_sol,lot_order,source,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'pump_trades',?)`).bind(`lot:${wallet}:${mint}:${lot.evidenceId}`,wallet,mint,lot.evidenceId,lot.signature,lot.openedAt,lot.remaining,lot.cost,lotOrder,stamped)));
  for(const trade of trades)basis.push(db.prepare(`INSERT INTO matched_basis_applied(source,evidence_id,wallet,mint,applied_at) VALUES('pump_trades',?,?,?,?) ON CONFLICT(source,evidence_id) DO NOTHING`).bind(evidenceKey(trade),wallet,mint,stamped));
  if(seeded.length){
    const watermarkSec=snapshot.watermarkMs==null?null:Math.floor(snapshot.watermarkMs/1000);
    basis.push(db.prepare(`INSERT INTO matched_basis_applied(source,evidence_id,wallet,mint,applied_at) SELECT 'pump_trades',event_id,wallet,mint,? FROM pump_trades WHERE wallet=? AND mint=? AND side IN ('buy','sell') AND (block_time IS NULL OR block_time<=?) AND NOT EXISTS (SELECT 1 FROM matched_basis_applied a WHERE a.source='pump_trades' AND a.evidence_id=pump_trades.event_id) ON CONFLICT(source,evidence_id) DO NOTHING`).bind(stamped,wallet,mint,watermarkSec??9e15));
    for(const evidenceId of snapshot.evidenceIds)basis.push(db.prepare(`INSERT INTO matched_basis_applied(source,evidence_id,wallet,mint,applied_at) VALUES('pump_trades',?,?,?,?) ON CONFLICT(source,evidence_id) DO NOTHING`).bind(evidenceId,wallet,mint,stamped));
  }
  const lastTs=secToMs(trades.at(-1)?.block_time)??stamped,planetId=`planet:pump-fun:${mint}`,starId=`star:solana:${wallet}`,label=symbol||short(mint);
  const statements=[...basis];
  statements.push(indexStatement(db,{id:planetId,kind:'planet',mint,galaxyId:'pump-fun',title:label,summary:name||'Indexed pump.fun token planet',sourceKind:'observed',sourceRef:source||'pump-index',observedTs:lastTs,coverage:'partial',payload:{symbol:symbol||null,name:name||null,launchOrigin:'pump-fun'}}));
  statements.push(indexStatement(db,{id:starId,kind:'star',wallet,galaxyId:'pump-fun',title:`Wallet ${short(wallet)}`,summary:'Observed public wallet star with retained pump.fun swap evidence',sourceKind:'observed',sourceRef:'pump_trades',observedTs:lastTs,coverage:'partial',payload:{publicWallet:wallet}}));
  for(const trade of trades){const id=`trade:pump:${evidenceKey(trade)}`,ts=secToMs(trade.block_time);statements.push(indexStatement(db,{id,kind:'trade',mint,wallet,galaxyId:'pump-fun',title:`${s(trade.side).toUpperCase()} ${label}`,summary:`Observed public swap · ${short(trade.signature)}`,sourceKind:'observed',sourceRef:s(trade.source)||'pump_trades',observedTs:ts,coverage:s(trade.commitment)||'confirmed',payload:{signature:s(trade.signature)||null,side:s(trade.side),tokenAmount:finite(trade.token_amount),solAmount:finite(trade.sol_amount),priceSol:finite(trade.price_sol),slot:finite(trade.slot),commitment:s(trade.commitment)||null}}));statements.push(edgeStatement(db,{fromId:starId,toId:id,relation:'made_trade',observedTs:ts,evidenceId:evidenceKey(trade)}),edgeStatement(db,{fromId:id,toId:planetId,relation:'traded_planet',observedTs:ts,evidenceId:evidenceKey(trade)}));}
  for(const id of replaceableOpenIds(existing,position.rounds,{openingLots:[...openingLots,...seeded],trades:actionable}))statements.push(db.prepare(`DELETE FROM matched_trade_rounds WHERE id=? AND wallet=? AND mint=? AND status='open'`).bind(id,wallet,mint));
  const replays=appendRoundStatements(statements,db,{rounds:position.rounds,wallet,mint,galaxyId:'pump-fun',symbol:label,now:stamped,lastTs,tradePrefix:'trade:pump:'});
  if(typeof db.batch==='function')await db.batch(statements);else{for(const statement of statements)await statement.run();}
  let deleted=false;
  if(cutoff!=null){
    const left=await db.prepare(`SELECT event_id FROM pump_trades WHERE wallet=? AND mint=? AND block_time<? AND side IN ('buy','sell') AND NOT EXISTS (SELECT 1 FROM matched_basis_applied a WHERE a.source='pump_trades' AND a.evidence_id=pump_trades.event_id) LIMIT 1`).bind(wallet,mint,cutoff).first().catch(()=>({event_id:'unknown'}));
    if(!left){await db.prepare('DELETE FROM pump_trades WHERE wallet=? AND mint=? AND block_time<?').bind(wallet,mint,cutoff).run();deleted=true;}
  }
  return {applied:trades.length,rounds:position.rounds.length,replays,deleted};
}

async function materializePump(db,env,now){
  const pageSize=clamp(env.RESEARCH_INDEX_PAIR_PAGE,PUMP_PAIR_PAGE_DEFAULT,1,8),since=Math.floor(roundNow(now)/1000)-72*3600;
  const pairResult=await db.prepare(`SELECT wallet,mint,MAX(block_time) latest FROM pump_trades WHERE wallet IS NOT NULL AND wallet<>'' AND mint<>'' AND side IN ('buy','sell') AND NOT EXISTS (SELECT 1 FROM matched_basis_applied a WHERE a.source='pump_trades' AND a.evidence_id=pump_trades.event_id) GROUP BY wallet,mint ORDER BY latest DESC,wallet ASC,mint ASC LIMIT ?`).bind(pageSize).all();
  const pairs=pairResult?.results||[];let indexedTrades=0,indexedRounds=0,indexedReplays=0;
  for(const pair of pairs){const wallet=s(pair.wallet),mint=s(pair.mint);if(!wallet||!mint)continue;
    try{const token=await tokenLabel(db,mint);const wrote=await applyPumpPairPage(db,{wallet,mint,now,symbol:token.symbol,name:token.name,source:token.source});indexedTrades+=wrote.applied;indexedRounds+=wrote.rounds;indexedReplays+=wrote.replays;}
    catch(error){console.error('[research-index-pump-pair]',JSON.stringify({wallet,mint,error:s(error?.message||error)}));}
  }
  await writeJsonCheckpoint(db,'research_index_pair_cursor',pairs.length?'paging':'caught-up',{pairPage:pageSize,tradePage:BASIS_TRADE_PAGE,mode:'oldest-unapplied'},now);
  const head=await db.prepare(`SELECT MAX(slot) slot,MAX(block_time) block_time,COUNT(*) count FROM pump_trades WHERE block_time>=?`).bind(since).first().catch(()=>null);const lastSlot=finite(head?.slot),count=Math.max(0,Number(head?.count)||0);await db.prepare(`INSERT INTO index_coverage_checkpoints(source,last_observed_slot,last_verified_slot,gap_from_slot,gap_to_slot,status,detail,updated_at) VALUES('pump_trades',?,NULL,NULL,NULL,?,?,?) ON CONFLICT(source) DO UPDATE SET last_observed_slot=excluded.last_observed_slot,status=excluded.status,detail=excluded.detail,updated_at=excluded.updated_at`).bind(lastSlot,count?'observed':'empty',`Pump materializer applied up to ${BASIS_TRADE_PAGE} oldest unapplied trades on ${pairs.length} pairs. Already-applied trades stay in matched_position_lots. Confirmed observations are not promoted to verified-through slots.`,now).run();
  return {pairs:pairs.length,trades:indexedTrades,rounds:indexedRounds,replays:indexedReplays};
}

export async function foldExpiringPumpBasis(db,cutoff,now=Math.floor(Date.now()/1000)){
  if(!db)return {pairs:0,applied:0,deletedPairs:0};
  const pairResult=await db.prepare(`SELECT wallet,mint FROM pump_trades WHERE block_time<? AND wallet IS NOT NULL AND wallet<>'' AND mint<>'' AND side IN ('buy','sell') AND NOT EXISTS (SELECT 1 FROM matched_basis_applied a WHERE a.source='pump_trades' AND a.evidence_id=pump_trades.event_id) GROUP BY wallet,mint ORDER BY MIN(block_time) ASC,wallet ASC,mint ASC LIMIT ?`).bind(cutoff,BASIS_PAIR_PAGE).all();
  const pairs=pairResult?.results||[];let applied=0,deletedPairs=0;
  for(const pair of pairs){
    const wallet=s(pair.wallet),mint=s(pair.mint);if(!wallet||!mint)continue;
    try{const token=await tokenLabel(db,mint);const wrote=await applyPumpPairPage(db,{wallet,mint,cutoff,now,symbol:token.symbol,name:token.name,source:token.source});applied+=wrote.applied;if(wrote.deleted)deletedPairs++;}
    catch(error){console.error('[research-index-basis-pair]',JSON.stringify({wallet,mint,error:s(error?.message||error)}));}
  }
  await db.prepare(`DELETE FROM pump_trades WHERE rowid IN (SELECT rowid FROM pump_trades WHERE block_time<? AND (wallet IS NULL OR wallet='' OR ifnull(mint,'')='' OR ifnull(side,'') NOT IN ('buy','sell')) LIMIT 200)`).bind(cutoff).run().catch(()=>null);
  return {pairs:pairs.length,applied,deletedPairs};
}

async function pageAll(db,sql,binds,ceiling=TRADE_CEILING){
  const rows=[];let offset=0;
  while(rows.length<ceiling){
    const page=await db.prepare(sql).bind(...binds,TRADE_PAGE,offset).all();
    const batch=page?.results||[];rows.push(...batch);
    if(batch.length<TRADE_PAGE)return {rows,complete:true};
    offset+=batch.length;
  }
  return {rows,complete:false};
}

async function pumpSignatureSet(db,wallet,mint){
  const sigs=new Set();let offset=0;
  while(offset<TRADE_CEILING){
    const page=await db.prepare(`SELECT signature FROM pump_trades WHERE wallet=? AND mint=? AND ifnull(signature,'')<>'' ORDER BY block_time ASC,signature ASC LIMIT ? OFFSET ?`).bind(wallet,mint,TRADE_PAGE,offset).all().catch(()=>({results:[]}));
    const rows=page?.results||[];
    for(const row of rows){const sig=s(row.signature);if(sig)sigs.add(sig);}
    if(rows.length<TRADE_PAGE)return {sigs,complete:true};
    offset+=rows.length;
  }
  return {sigs,complete:false};
}

async function materializeChainWallet(db,wallet,{fomoWallet,now}){
  const mintResult=await db.prepare(`SELECT mint,MAX(block_time) latest FROM bull_wallet_events WHERE wallet=? AND mint<>'' AND token_delta<>0 AND ifnull(source,'') NOT LIKE '%pump%' GROUP BY mint ORDER BY latest DESC LIMIT ?`).bind(wallet,CHAIN_MINT_LIMIT).all().catch(()=>({results:[]}));
  const routeMints=await db.prepare(`SELECT CASE WHEN input_mint=? THEN output_mint ELSE input_mint END mint,MAX(block_time) latest FROM intelligence_trade_routes WHERE wallet=? AND (input_mint=? OR output_mint=?) GROUP BY mint ORDER BY latest DESC LIMIT ?`).bind(WSOL,wallet,WSOL,WSOL,CHAIN_MINT_LIMIT).all().catch(()=>({results:[]}));
  const mints=[...new Set([...(mintResult?.results||[]).map(row=>s(row.mint)),...(routeMints?.results||[]).map(row=>s(row.mint))].filter(mint=>mint&&mint!==WSOL))].slice(0,CHAIN_MINT_LIMIT);
  let roundsWritten=0;
  for(const mint of mints){
    try{
    const events=await pageAll(db,`SELECT id,signature,mint,token_delta,sol_delta,block_time,source FROM bull_wallet_events WHERE wallet=? AND mint=? AND token_delta<>0 AND ifnull(source,'') NOT LIKE '%pump%' ORDER BY block_time ASC,id ASC LIMIT ? OFFSET ?`,[wallet,mint]);
    const routes=await pageAll(db,`SELECT signature,wallet,input_mint,output_mint,input_amount,output_amount,block_time,source,hop_index FROM intelligence_trade_routes WHERE wallet=? AND ((input_mint=? AND output_mint=?) OR (output_mint=? AND input_mint=?)) ORDER BY block_time ASC,hop_index ASC LIMIT ? OFFSET ?`,[wallet,mint,WSOL,mint,WSOL]);
    if(!events.complete||!routes.complete)continue;
    const pumpSigs=await pumpSignatureSet(db,wallet,mint);
    if(!pumpSigs.complete)continue;
    const trades=tradesFromWalletEvidence(events.rows.map(row=>({...row,wallet})),routes.rows.map(row=>({...row,wallet})),{pumpSignatures:pumpSigs.sigs});
    if(!trades.length)continue;
    const galaxyId=chainRoundGalaxy([...(events.rows||[]).map(row=>row.source),...(routes.rows||[]).map(row=>row.source)],{fomoWallet});
    if(!galaxyId||galaxyId==='pump-fun')continue;
    const position=derivePosition(trades);
    const pumpOwns=pumpSigs.sigs.size>0;
    const existing=pumpOwns?[]:((await db.prepare(`SELECT id,status,entry_signature,evidence_ids_json FROM matched_trade_rounds WHERE wallet=? AND mint=? AND status='open'`).bind(wallet,mint).all())?.results||[]);
    const statements=[],lastTs=secToMs(trades.at(-1)?.block_time)??roundNow(now),symbol=short(mint);
    if(!pumpOwns)for(const id of replaceableOpenIds(existing,position.rounds,{openingLots:[],trades}))statements.push(db.prepare(`DELETE FROM matched_trade_rounds WHERE id=? AND wallet=? AND mint=? AND status='open'`).bind(id,wallet,mint));
    statements.push(indexStatement(db,{id:`planet:${galaxyId}:${mint}`,kind:'planet',mint,galaxyId,title:symbol,summary:galaxyId==='afterbell'?'Observed Afterbell token planet from retained wallet evidence':'Observed Fomo wallet token planet from retained chain evidence',sourceKind:'observed',sourceRef:galaxyId,observedTs:lastTs,coverage:'retained',payload:{launchOrigin:galaxyId}}));
    statements.push(indexStatement(db,{id:`star:solana:${wallet}`,kind:'star',wallet,galaxyId,title:`Wallet ${short(wallet)}`,summary:galaxyId==='afterbell'?'Observed public wallet from retained Afterbell evidence':'Observed public wallet from retained Fomo chain evidence',sourceKind:'observed',sourceRef:'bull_wallet_events',observedTs:lastTs,coverage:'retained',payload:{publicWallet:wallet}}));
    appendRoundStatements(statements,db,{rounds:position.rounds,wallet,mint,galaxyId,symbol,now:roundNow(now),lastTs,tradePrefix:'trade:observed:'});
    roundsWritten+=position.rounds.length;
    await runStatements(db,statements);
    }catch(error){console.error('[research-index-chain-wallet]',JSON.stringify({wallet,mint,error:s(error?.message||error)}));}
  }
  return {mints:mints.length,rounds:roundsWritten};
}

async function materializeChainRounds(db,env,now){
  const cursor=await readJsonCheckpoint(db,'research_index_chain_cursor');
  const fomoOffset=Math.max(0,Math.trunc(Number(cursor.fomoOffset)||0)),afterbellOffset=Math.max(0,Math.trunc(Number(cursor.afterbellOffset)||0));
  let wallets=0,rounds=0;
  const fomo=await db.prepare(`SELECT solana_wallet wallet FROM fomo_traders WHERE solana_wallet IS NOT NULL AND solana_wallet<>'' ORDER BY current_rank ASC,solana_wallet ASC LIMIT ? OFFSET ?`).bind(CHAIN_WALLET_PAGE,fomoOffset).all().catch(()=>({results:[]}));
  for(const row of fomo?.results||[]){const wallet=s(row.wallet);if(!wallet)continue;try{const wrote=await materializeChainWallet(db,wallet,{fomoWallet:true,now});wallets++;rounds+=wrote.rounds;}catch(error){console.error('[research-index-chain-wallet]',JSON.stringify({wallet,error:s(error?.message||error)}));}}
  const afterbell=await db.prepare(`SELECT wallet FROM bull_wallet_events WHERE source LIKE 'helius-afterbell-%' AND wallet IS NOT NULL AND wallet<>'' GROUP BY wallet ORDER BY MAX(block_time) DESC,wallet ASC LIMIT ? OFFSET ?`).bind(CHAIN_WALLET_PAGE,afterbellOffset).all().catch(()=>({results:[]}));
  for(const row of afterbell?.results||[]){const wallet=s(row.wallet);if(!wallet)continue;try{const wrote=await materializeChainWallet(db,wallet,{fomoWallet:false,now});wallets++;rounds+=wrote.rounds;}catch(error){console.error('[research-index-chain-wallet]',JSON.stringify({wallet,error:s(error?.message||error)}));}}
  const fomoRows=fomo?.results||[],afterbellRows=afterbell?.results||[];
  await writeJsonCheckpoint(db,'research_index_chain_cursor','paging',{fomoOffset:fomoRows.length<CHAIN_WALLET_PAGE?0:fomoOffset+fomoRows.length,afterbellOffset:afterbellRows.length<CHAIN_WALLET_PAGE?0:afterbellOffset+afterbellRows.length},now);
  return {wallets,rounds};
}

async function materializeFomo(db,now){let stars=0,trades=0;try{const result=await db.prepare(`SELECT handle,current_rank,display_name,reported_pnl_usd,reported_volume_usd,reported_trade_count,follower_count,solana_wallet,evm_wallet,captured_at,source FROM fomo_traders WHERE current_rank BETWEEN 1 AND 50 ORDER BY current_rank LIMIT 50`).all();for(const row of result?.results||[]){const handle=s(row.handle),wallet=s(row.solana_wallet)||s(row.evm_wallet)||null,id=`star:fomo:${handle.toLowerCase()}`;await indexStatement(db,{id,kind:'star',wallet,galaxyId:'fomo',title:s(row.display_name)||handle,summary:`Fomo-reported rank #${Number(row.current_rank)||'—'}; provider context only`,sourceKind:'provider-reported',sourceRef:s(row.source)||'fomoapi.io',observedTs:secToMs(row.captured_at),coverage:'provider-reported',payload:{handle,rank:finite(row.current_rank),reportedPnlUsd:finite(row.reported_pnl_usd),reportedVolumeUsd:finite(row.reported_volume_usd),reportedTradeCount:finite(row.reported_trade_count),followerCount:finite(row.follower_count)}}).run();stars++;}
    const tradeRows=await db.prepare(`SELECT t.handle,t.trade_id,t.token_address,t.symbol,t.chain,t.status,t.amount,t.avg_entry_price,t.avg_exit_price,t.realized_pnl_usd,t.unrealized_pnl_usd,t.created_at,t.closed_at,t.captured_at,t.source,f.solana_wallet,f.evm_wallet FROM fomo_trader_trades t LEFT JOIN fomo_traders f ON f.handle=t.handle ORDER BY t.captured_at DESC LIMIT 150`).all();const statements=[];for(const row of tradeRows?.results||[]){const handle=s(row.handle),wallet=s(row.solana_wallet)||s(row.evm_wallet)||null,mint=s(row.token_address)||null,ts=secToMs(row.closed_at??row.created_at??row.captured_at),id=`trade:fomo:${handle.toLowerCase()}:${s(row.trade_id)}`,starId=`star:fomo:${handle.toLowerCase()}`;statements.push(indexStatement(db,{id,kind:'trade',mint,wallet,galaxyId:'fomo',title:`Fomo-reported ${s(row.status)||'trade'} · ${s(row.symbol)||short(mint)}`,summary:'Provider-reported trade context; not independently verified performance',sourceKind:'provider-reported',sourceRef:s(row.source)||'fomoapi.io/trades',observedTs:ts,coverage:'provider-reported',payload:{handle,tradeId:s(row.trade_id),status:s(row.status),amount:finite(row.amount),avgEntryPrice:finite(row.avg_entry_price),avgExitPrice:finite(row.avg_exit_price),reportedRealizedPnlUsd:finite(row.realized_pnl_usd),reportedUnrealizedPnlUsd:finite(row.unrealized_pnl_usd),chain:s(row.chain)||null}}));statements.push(edgeStatement(db,{fromId:starId,toId:id,relation:'provider_reported_trade',observedTs:ts,sourceKind:'provider-reported'}));trades++;}await runStatements(db,statements);
  }catch{/* Older databases may not yet have live Fomo tables. */}return {stars,trades};}

async function materializeResearchObjects(db,now){let cuts=0,theses=0;try{const result=await db.prepare(`SELECT id,manifest_json,created_at,expires_at FROM trickster_share_manifests WHERE expires_at>unixepoch() ORDER BY created_at DESC LIMIT 100`).all();const statements=[];for(const row of result?.results||[]){let manifest={};try{manifest=JSON.parse(s(row.manifest_json)||'{}');}catch{continue;}const subject=manifest?.subject??{},coverage=manifest?.coverage??{},created=secToMs(row.created_at)??now;statements.push(indexStatement(db,{id:`cut:${s(row.id)}`,kind:'cut',title:`Trickster Cut · ${s(manifest.storyType)||'evidence story'}`,summary:'Frozen verifiable Trickster story manifest',sourceKind:'derived',sourceRef:s(row.id),observedTs:finite(coverage.to),coverage:s(coverage.statement)||null,payload:{shareId:s(row.id),storyType:s(manifest.storyType),subject,coverage,evidenceCount:Array.isArray(manifest.evidence)?manifest.evidence.length:0,claimCount:Array.isArray(manifest.claims)?manifest.claims.length:0},createdAt:created,updatedAt:created}));cuts++;}await runStatements(db,statements);}catch{}
  try{const result=await db.prepare(`SELECT id,target_kind,target_id,galaxy_id,claim,status,from_ts,to_ts,created_at,updated_at FROM theses WHERE status IN ('open','resolved') ORDER BY updated_at DESC LIMIT 150`).all();const statements=[];for(const row of result?.results||[]){statements.push(indexStatement(db,{id:`thesis:${s(row.id)}`,kind:'thesis',mint:s(row.target_id)||null,galaxyId:s(row.galaxy_id)||null,title:s(row.claim)||'Cited claim',summary:`User-authored cited claim · ${s(row.status)}`,sourceKind:'user-claim',sourceRef:s(row.id),observedTs:finite(row.to_ts),coverage:'cited',payload:{targetKind:s(row.target_kind),targetId:s(row.target_id),status:s(row.status),fromTs:finite(row.from_ts),toTs:finite(row.to_ts)},createdAt:finite(row.created_at)??now,updatedAt:finite(row.updated_at)??now}));theses++;}await runStatements(db,statements);}catch{}return {cuts,theses};}

export async function materializeResearchIndex(env={},now=nowMs()){
  const db=intelligenceDb(env);if(!db)return Object.freeze({ok:false,error:'database_unavailable'});
  const result={pump:{pairs:0,trades:0,rounds:0,replays:0},basis:{pairs:0,applied:0,deletedPairs:0},chain:{wallets:0,rounds:0},fomo:{stars:0,trades:0},research:{cuts:0,theses:0}};
  const retentionHours=clamp(env.PUMP_RAW_RETENTION_HOURS,72,1,720);
  try{result.basis=await foldExpiringPumpBasis(db,Math.floor(now/1000)-retentionHours*3600,Math.floor(now/1000));}catch(error){console.error('[research-index-basis]',s(error?.message||error));}
  try{result.pump=await materializePump(db,env,now);}catch(error){console.error('[research-index-pump]',s(error?.message||error));}
  try{result.chain=await materializeChainRounds(db,env,now);}catch(error){console.error('[research-index-chain]',s(error?.message||error));}
  try{result.fomo=await materializeFomo(db,now);}catch(error){console.error('[research-index-fomo]',s(error?.message||error));}
  try{result.research=await materializeResearchObjects(db,now);}catch(error){console.error('[research-index-objects]',s(error?.message||error));}
  try{await db.prepare(`INSERT INTO index_coverage_checkpoints(source,status,detail,updated_at) VALUES('research_index','materialized',?,?) ON CONFLICT(source) DO UPDATE SET status=excluded.status,detail=excluded.detail,updated_at=excluded.updated_at`).bind(`Materialized ${result.pump.trades} observed pump trades, ${result.pump.rounds} deterministic rounds, ${result.pump.replays} deterministic Replays, ${result.chain.rounds} chain rounds, ${result.basis.applied} folded basis trades, ${result.fomo.trades} provider-reported Fomo trades, ${result.research.cuts} Cuts, and ${result.research.theses} theses.`,now).run();}catch{}
  return Object.freeze({ok:true,...result,updatedAt:now});
}
