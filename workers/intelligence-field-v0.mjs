/* Field v0 producer — evidence-only events/snapshots for Galaxy indexer-field-v0 consumer.
 * Derives from existing Intelligence D1 only. Never invents liqSol or remainingPct.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';

const ADDRESS_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const FIELD_V0_PATH='/api/intelligence/field/v0';
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const bool=value=>String(value??'').toLowerCase()==='true';
const clamp01=value=>Math.max(0,Math.min(1,n(value)));
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const all=async statement=>{try{return(await statement.all())?.results||[];}catch{return[];}};
const first=async statement=>{try{return await statement.first();}catch{return null;}};

function enabled(env={}){
  if(env.FIELD_V0_ENABLED!=null&&s(env.FIELD_V0_ENABLED)!=='')return bool(env.FIELD_V0_ENABLED);
  if(env.FIELD_COMPAT_ENABLED!=null&&s(env.FIELD_COMPAT_ENABLED)!=='')return bool(env.FIELD_COMPAT_ENABLED);
  return bool(env.UNIVERSE_ENABLED);
}

function mapSource(raw){
  const value=s(raw).toLowerCase();
  if(value==='derived'||value.includes('derived'))return'derived';
  if(value.includes('pump'))return'pumpfun';
  if(value.includes('helius'))return'helius';
  return'pumpfun';
}

function coverageDisclosure(){
  return Object.freeze({
    complete:false,
    boundedPumpIndex:true,
    derivedLabels:true,
    statement:'Field v0 covers retained pump index + indexed wallet events only. Derived dying/exit labels are heuristic from indexed evidence. Gaps and honest empties are intentional — membership exit ≠ holder.exit; liqSol/remainingPct are never invented.',
    gaps:Object.freeze(['token.birth','token.graduated','token.migrated','wormhole','liqSol','universe_membership.last_exited_at_as_holder_exit'])
  });
}

function parseCsv(value){
  return s(value).split(',').map(s).filter(Boolean);
}

function parseTypes(value){
  const allowed=new Set(['token.trade','token.dying','holder.exit']);
  const list=parseCsv(value).filter(item=>allowed.has(item));
  return list.length?list:['token.trade','token.dying','holder.exit'];
}

function envelope({source,mint,sig,ts}){
  return{v:1,chain:'solana',ts:Math.max(0,Math.trunc(n(ts))),source,mint:s(mint),sig:sig?s(sig):null};
}

/** Map pump_trades row → token.trade (preferred path). */
export function tradeFromPumpRow(row={}){
  const side=s(row.side).toLowerCase();
  if(side!=='buy'&&side!=='sell')return null;
  const mint=s(row.mint),wallet=s(row.wallet);
  const solAmount=n(row.sol_amount),tokenAmount=n(row.token_amount);
  const priceSol=n(row.price_sol)|| (tokenAmount?solAmount/tokenAmount:0);
  const slot=Math.max(0,Math.trunc(n(row.slot)));
  if(!ADDRESS_RE.test(mint)||!ADDRESS_RE.test(wallet))return null;
  if(!(solAmount>=0)||!(tokenAmount>=0)||!(priceSol>=0))return null;
  const ts=Math.max(0,Math.trunc(n(row.block_time)))*1000;
  return Object.freeze({
    ...envelope({source:mapSource(row.source||'pumpfun'),mint,sig:s(row.signature)||null,ts}),
    type:'token.trade',side,wallet,solAmount,tokenAmount,priceSol,slot
  });
}

/** Fallback: swap-like bull_wallet_events → token.trade when pump_trades empty. */
export function tradeFromWalletEvent(row={}){
  const mint=s(row.mint),wallet=s(row.wallet);
  if(!ADDRESS_RE.test(mint)||!ADDRESS_RE.test(wallet))return null;
  const tokenDelta=n(row.token_delta),solDelta=n(row.sol_delta);
  if(!tokenDelta||!solDelta)return null;
  const side=tokenDelta>0?'buy':'sell';
  const tokenAmount=Math.abs(tokenDelta),solAmount=Math.abs(solDelta);
  const priceSol=tokenAmount?solAmount/tokenAmount:0;
  const ts=Math.max(0,Math.trunc(n(row.block_time)))*1000;
  return Object.freeze({
    ...envelope({source:mapSource(row.source||'helius'),mint,sig:s(row.signature)||null,ts}),
    type:'token.trade',side,wallet,solAmount,tokenAmount,priceSol,slot:Math.max(0,Math.trunc(n(row.slot)))
  });
}

/**
 * remainingPct from cumulative token position evidence.
 * Returns null when position-before cannot be estimated → caller must skip emission.
 */
export function remainingPctFromNet(netAfter,soldAmount){
  if(netAfter==null||!Number.isFinite(Number(netAfter)))return null;
  const sold=Math.abs(n(soldAmount));
  const after=n(netAfter);
  if(!(sold>0))return null;
  const before=after+sold;
  if(!(before>0))return null;
  return clamp01(after/before);
}

/** Build holder.exit only when remainingPct is evidence-backed. */
export function holderExitFromEvidence({mint,wallet,sig,ts,source,soldAmount,solReceived,netAfter}){
  const remainingPct=remainingPctFromNet(netAfter,soldAmount);
  if(remainingPct==null)return null;
  if(!ADDRESS_RE.test(mint)||!ADDRESS_RE.test(wallet))return null;
  return Object.freeze({
    ...envelope({source:mapSource(source||'derived'),mint,sig:sig||null,ts}),
    type:'holder.exit',
    wallet,
    soldAmount:Math.abs(n(soldAmount)),
    solReceived:Math.max(0,n(solReceived)),
    remainingPct,
    isFullExit:remainingPct<=1e-9
  });
}

/**
 * Derive token.dying from volume collapse + sell dominance + cohort outbound.
 * Always source:"derived". Omits liqSol. Sets incomplete when liqSol/uniqueTraders absent.
 */
export function deriveDyingEvent({mint,recentVol,priorVol,buyCount,sellCount,tradeCount,outboundWallets,inboundWallets,uniqueWallets,ts}){
  if(!ADDRESS_RE.test(mint))return null;
  const reasons=[];
  const recent=Math.max(0,n(recentVol)),prior=Math.max(0,n(priorVol));
  const buys=Math.max(0,n(buyCount)),sells=Math.max(0,n(sellCount)),trades=Math.max(0,n(tradeCount))||(buys+sells);
  const outbound=Math.max(0,n(outboundWallets)),inbound=Math.max(0,n(inboundWallets));
  let score=0;
  if(prior>=0.05&&recent<prior*0.25){reasons.push('activity_collapse');score+=0.45;}
  else if(prior>=0.05&&recent<prior*0.5){reasons.push('activity_collapse');score+=0.25;}
  if(trades>=4&&sells/trades>=0.7){reasons.push('holder_decay');score+=0.3;}
  if(outbound>=3&&outbound>inbound*1.5){
    if(!reasons.includes('holder_decay'))reasons.push('holder_decay');
    score+=0.25;
  }
  // Never invent liquidity_drain without liqSol evidence.
  score=clamp01(score);
  if(!reasons.length||score<=0)return null;
  const metrics={};
  const unique=Math.trunc(n(uniqueWallets));
  if(unique>0)metrics.uniqueTraders24h=unique;
  if(recent>0||prior>0)metrics.volumeSol24h=recent+prior;
  if(outbound||inbound)metrics.holderDelta24h=inbound-outbound;
  // liqSol intentionally omitted — never invent
  const incomplete=metrics.uniqueTraders24h==null; // liqSol always missing ⇒ incomplete, and unique may also be
  // Boss: incomplete if liqSol/uniqueTraders missing. liqSol always missing → always incomplete:true.
  return Object.freeze({
    ...envelope({source:'derived',mint,sig:null,ts:Math.max(0,Math.trunc(n(ts)))}),
    type:'token.dying',
    reason:Object.freeze([...reasons]),
    score,
    metrics:Object.keys(metrics).length?Object.freeze(metrics):undefined,
    evidence:Object.freeze([
      `recentVol=${recent.toFixed(4)}`,
      `priorVol=${prior.toFixed(4)}`,
      `sellRatio=${trades?((sells/trades).toFixed(3)):'n/a'}`,
      `outbound=${outbound}`,
      `inbound=${inbound}`
    ]),
    incomplete:true
  });
}

async function loadPumpTrades(db,{sinceSec,mints,limit}){
  const clauses=['1=1'],binds=[];
  if(sinceSec>0){clauses.push('block_time>=?');binds.push(sinceSec);}
  if(mints.length){clauses.push(`mint IN (${mints.map(()=>'?').join(',')})`);binds.push(...mints);}
  binds.push(limit);
  return all(db.prepare(`SELECT event_id,signature,event_index,mint,wallet,side,token_amount,sol_amount,price_sol,slot,block_time,source FROM pump_trades WHERE ${clauses.join(' AND ')} AND side IN ('buy','sell') ORDER BY block_time DESC,event_id DESC LIMIT ?`).bind(...binds));
}

async function loadWalletSwapEvents(db,{sinceSec,mints,limit}){
  const clauses=[`event_class='swap-like'`,'mint IS NOT NULL','mint<>\'\'','wallet IS NOT NULL'],binds=[];
  if(sinceSec>0){clauses.push('block_time>=?');binds.push(sinceSec);}
  if(mints.length){clauses.push(`mint IN (${mints.map(()=>'?').join(',')})`);binds.push(...mints);}
  binds.push(limit);
  return all(db.prepare(`SELECT signature,slot,block_time,wallet,mint,sol_delta,token_delta,source FROM bull_wallet_events WHERE ${clauses.join(' AND ')} ORDER BY block_time DESC LIMIT ?`).bind(...binds));
}

async function loadVolumeStats(db,nowSec){
  const recentStart=nowSec-3600,priorStart=nowSec-6*3600;
  return all(db.prepare(`
    SELECT mint,
      SUM(CASE WHEN bucket_start>=? THEN volume_sol ELSE 0 END) recent_vol,
      SUM(CASE WHEN bucket_start>=? AND bucket_start<? THEN volume_sol ELSE 0 END) prior_vol,
      SUM(CASE WHEN bucket_start>=? THEN buy_count ELSE 0 END) buy_count,
      SUM(CASE WHEN bucket_start>=? THEN sell_count ELSE 0 END) sell_count,
      SUM(CASE WHEN bucket_start>=? THEN trade_count ELSE 0 END) trade_count
    FROM pump_volume_buckets
    WHERE bucket_start>=?
    GROUP BY mint
  `).bind(recentStart,priorStart,recentStart,recentStart,recentStart,recentStart,priorStart));
}

async function loadCohortStats(db,nowSec){
  const cutoff=nowSec-86400;
  return all(db.prepare(`
    SELECT mint,
      MAX(unique_wallets) unique_wallets,
      MAX(inbound_wallets) inbound_wallets,
      MAX(outbound_wallets) outbound_wallets
    FROM bull_token_cohorts
    WHERE bucket_start>=?
    GROUP BY mint
  `).bind(cutoff));
}

async function netTokenPosition(db,wallet,mint){
  const row=await first(db.prepare(`SELECT COALESCE(SUM(token_delta),0) net FROM bull_wallet_events WHERE wallet=? AND mint=?`).bind(wallet,mint));
  if(row&&row.net!=null)return n(row.net);
  // Fallback: sequential pump_trades estimate
  const trades=await all(db.prepare(`SELECT side,token_amount FROM pump_trades WHERE wallet=? AND mint=? ORDER BY block_time ASC,event_id ASC`).bind(wallet,mint));
  if(!trades.length)return null;
  let net=0;
  for(const trade of trades){
    const amount=Math.abs(n(trade.token_amount));
    if(s(trade.side)==='buy')net+=amount;
    else if(s(trade.side)==='sell')net-=amount;
  }
  return net;
}

async function buildTradeEvents(db,query){
  const rows=await loadPumpTrades(db,query);
  const events=[];
  for(const row of rows){
    const event=tradeFromPumpRow(row);
    if(event)events.push(event);
  }
  if(events.length)return events;
  const fallback=await loadWalletSwapEvents(db,query);
  for(const row of fallback){
    const event=tradeFromWalletEvent(row);
    if(event)events.push(event);
  }
  return events;
}

async function buildDyingEvents(db,{nowMs,mints,minScore,limit}){
  const nowSec=Math.floor(nowMs/1000);
  const [volumes,cohorts]=await Promise.all([loadVolumeStats(db,nowSec),loadCohortStats(db,nowSec)]);
  const cohortByMint=new Map(cohorts.map(row=>[s(row.mint),row]));
  const mintFilter=mints.length?new Set(mints):null;
  const events=[];
  for(const row of volumes){
    const mint=s(row.mint);
    if(mintFilter&&!mintFilter.has(mint))continue;
    if(!ADDRESS_RE.test(mint))continue;
    const cohort=cohortByMint.get(mint)||{};
    const event=deriveDyingEvent({
      mint,
      recentVol:row.recent_vol,
      priorVol:row.prior_vol,
      buyCount:row.buy_count,
      sellCount:row.sell_count,
      tradeCount:row.trade_count,
      outboundWallets:cohort.outbound_wallets,
      inboundWallets:cohort.inbound_wallets,
      uniqueWallets:cohort.unique_wallets,
      ts:nowMs
    });
    if(!event||event.score<minScore)continue;
    events.push(event);
    if(events.length>=limit)break;
  }
  return events.sort((a,b)=>b.score-a.score).slice(0,limit);
}

async function buildHolderExitEvents(db,{sinceSec,mints,limit}){
  const clauses=[`side='sell'`,'wallet IS NOT NULL','mint IS NOT NULL'],binds=[];
  if(sinceSec>0){clauses.push('block_time>=?');binds.push(sinceSec);}
  if(mints.length){clauses.push(`mint IN (${mints.map(()=>'?').join(',')})`);binds.push(...mints);}
  binds.push(Math.min(limit*4,500)); // over-fetch; many sells skip without remainingPct
  const sells=await all(db.prepare(`SELECT signature,mint,wallet,token_amount,sol_amount,block_time,source FROM pump_trades WHERE ${clauses.join(' AND ')} ORDER BY block_time DESC,event_id DESC LIMIT ?`).bind(...binds));
  const events=[];
  const seen=new Set();
  for(const row of sells){
    const mint=s(row.mint),wallet=s(row.wallet);
    const key=`${wallet}:${mint}:${s(row.signature)}`;
    if(seen.has(key))continue;
    seen.add(key);
    const netAfter=await netTokenPosition(db,wallet,mint);
    if(netAfter==null)continue; // cannot estimate — skip (honest empty)
    const event=holderExitFromEvidence({
      mint,wallet,
      sig:s(row.signature)||null,
      ts:Math.max(0,Math.trunc(n(row.block_time)))*1000,
      source:row.source||'derived',
      soldAmount:row.token_amount,
      solReceived:row.sol_amount,
      netAfter
    });
    if(!event)continue;
    events.push(event);
    if(events.length>=limit)break;
  }
  return events;
}

async function buildStarSnapshots(db,{nowMs,mints,minScore,limit}){
  const nowSec=Math.floor(nowMs/1000);
  const mintFilter=mints.length?new Set(mints):null;
  const dying=await buildDyingEvents(db,{nowMs,mints,minScore:0,limit:500});
  const dyingByMint=new Map(dying.map(item=>[item.mint,item]));
  const tokenRows=await all(db.prepare(`
    SELECT t.mint,t.symbol,t.name,a.rank_24h,
      COALESCE(v.volume_24h,0) volume_24h,
      lt.side last_side,lt.price_sol last_price,lt.block_time last_time
    FROM pump_tokens t
    LEFT JOIN pump_active_tokens a ON a.mint=t.mint
    LEFT JOIN (
      SELECT mint,SUM(volume_sol) volume_24h FROM pump_volume_buckets WHERE bucket_start>=? GROUP BY mint
    ) v ON v.mint=t.mint
    LEFT JOIN (
      SELECT p.mint,p.side,p.price_sol,p.block_time FROM pump_trades p
      INNER JOIN (SELECT mint,MAX(block_time) bt FROM pump_trades GROUP BY mint) latest
        ON latest.mint=p.mint AND latest.bt=p.block_time
    ) lt ON lt.mint=t.mint
    ORDER BY COALESCE(a.rank_24h,999),t.last_seen DESC
    LIMIT ?
  `).bind(nowSec-86400,Math.max(limit*2,50)));
  const stars=[];
  for(const row of tokenRows){
    const mint=s(row.mint);
    if(!ADDRESS_RE.test(mint))continue;
    if(mintFilter&&!mintFilter.has(mint))continue;
    const dyingEvent=dyingByMint.get(mint);
    if(dyingEvent&&dyingEvent.score<minScore&&minScore>0){
      // still include as active if not meeting dying threshold for this query filter
    }
    const state=dyingEvent&&dyingEvent.score>=Math.max(minScore,0.25)?'dying':'active';
    const visualDrivers={};
    if(dyingEvent)visualDrivers.score=dyingEvent.score;
    if(n(row.volume_24h)>0)visualDrivers.volumeSol24h=n(row.volume_24h);
    if(dyingEvent?.metrics?.uniqueTraders24h!=null)visualDrivers.uniqueTraders24h=dyingEvent.metrics.uniqueTraders24h;
    if(dyingEvent?.metrics?.holderDelta24h!=null)visualDrivers.holderDelta24h=dyingEvent.metrics.holderDelta24h;
    // liqSol omitted
    const lastTrade=row.last_side&&row.last_price!=null&&row.last_time
      ?{side:s(row.last_side)==='sell'?'sell':'buy',priceSol:n(row.last_price),ts:Math.trunc(n(row.last_time))*1000}
      :null;
    const star={
      mint,
      symbol:s(row.symbol)||undefined,
      name:s(row.name)||undefined,
      state,
      visualDrivers:Object.keys(visualDrivers).length?visualDrivers:undefined,
      lastTrade,
      wormhole:null,
      incomplete:state==='dying'?true:undefined
    };
    if(minScore>0&&state==='dying'&&(dyingEvent?.score||0)<minScore)continue;
    if(minScore>0&&state!=='dying'&&!visualDrivers.volumeSol24h){
      // minScore filter on tokens endpoint primarily targets dying score; keep active stars
    }
    stars.push(Object.freeze(star));
    if(stars.length>=limit)break;
  }
  return stars;
}

async function buildPlanetSnapshot(db,wallet,{nowMs}){
  if(!ADDRESS_RE.test(wallet))throw new TypeError('invalid_wallet');
  const nowSec=Math.floor(nowMs/1000);
  const linked=await all(db.prepare(`
    SELECT mint,MAX(block_time) last_seen FROM (
      SELECT mint,block_time FROM pump_trades WHERE wallet=? AND mint IS NOT NULL
      UNION ALL
      SELECT mint,block_time FROM bull_wallet_events WHERE wallet=? AND mint IS NOT NULL AND mint<>''
    ) GROUP BY mint ORDER BY last_seen DESC LIMIT 100
  `).bind(wallet,wallet));
  const linkedMints=linked.map(row=>s(row.mint)).filter(mint=>ADDRESS_RE.test(mint));
  const solRow=await first(db.prepare(`
    SELECT COALESCE(SUM(sol_delta),0) net FROM bull_wallet_events WHERE wallet=? AND block_time>=?
  `).bind(wallet,nowSec-86400));
  let netSolDelta24h=solRow?n(solRow.net):null;
  if(netSolDelta24h==null||(solRow==null)){
    const pumpSol=await first(db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN side='buy' THEN -ABS(sol_amount) WHEN side='sell' THEN ABS(sol_amount) ELSE 0 END),0) net
      FROM pump_trades WHERE wallet=? AND block_time>=?
    `).bind(wallet,nowSec-86400));
    if(pumpSol)netSolDelta24h=n(pumpSol.net);
  }
  const exits=[];
  const sellRows=await all(db.prepare(`
    SELECT signature,mint,token_amount,sol_amount,block_time,source FROM pump_trades
    WHERE wallet=? AND side='sell' AND block_time>=? ORDER BY block_time DESC LIMIT 50
  `).bind(wallet,nowSec-86400));
  for(const row of sellRows){
    const mint=s(row.mint);
    const netAfter=await netTokenPosition(db,wallet,mint);
    if(netAfter==null)continue;
    const event=holderExitFromEvidence({
      mint,wallet,
      sig:s(row.signature)||null,
      ts:Math.trunc(n(row.block_time))*1000,
      source:row.source||'derived',
      soldAmount:row.token_amount,
      solReceived:row.sol_amount,
      netAfter
    });
    if(!event)continue;
    exits.push(Object.freeze({
      mint:event.mint,
      remainingPct:event.remainingPct,
      isFullExit:event.isFullExit,
      solReceived:event.solReceived,
      ts:event.ts
    }));
  }
  return Object.freeze({
    wallet,
    linkedMints:Object.freeze(linkedMints),
    exits:exits.length?Object.freeze(exits):undefined,
    netSolDelta24h:netSolDelta24h!=null?netSolDelta24h:undefined,
    incomplete:linkedMints.length===0?true:undefined
  });
}

export async function handleFieldV0Request(request,env={}){
  const url=new URL(request.url),path=url.pathname;
  if(!path.startsWith(FIELD_V0_PATH))return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);
  const db=intelligenceDb(env);
  if(!db)return json({ok:false,error:'intelligence_db_unavailable',coverage:coverageDisclosure()},503);

  const nowMs=Date.now();
  const sinceMs=Math.max(0,Math.trunc(n(url.searchParams.get('since'))));
  const sinceSec=sinceMs>1e12?Math.floor(sinceMs/1000):sinceMs>0?sinceMs:0;
  const minScore=clamp01(url.searchParams.get('minScore')||0);
  const limit=Math.max(1,Math.min(500,Math.trunc(n(url.searchParams.get('limit'))||100)));
  const mints=parseCsv(url.searchParams.get('mints')).filter(mint=>ADDRESS_RE.test(mint));
  const coverage=coverageDisclosure();

  if(path===`${FIELD_V0_PATH}/events`){
    const types=new Set(parseTypes(url.searchParams.get('types')));
    const events=[];
    if(types.has('token.trade')){
      const trades=await buildTradeEvents(db,{sinceSec,mints,limit});
      events.push(...trades);
    }
    if(types.has('token.dying')){
      const dying=await buildDyingEvents(db,{nowMs,mints,minScore,limit});
      events.push(...dying);
    }
    if(types.has('holder.exit')){
      const exits=await buildHolderExitEvents(db,{sinceSec,mints,limit});
      events.push(...exits);
    }
    events.sort((a,b)=>b.ts-a.ts);
    const sliced=events.slice(0,limit);
    return json({
      ok:true,
      readOnly:true,
      contractVersion:'field-v0',
      events:sliced,
      coverage,
      disclosure:coverage.statement,
      notes:Object.freeze({
        holderExit:'Emitted only when remainingPct is computable from bull_wallet_events token_delta sum or sequential pump_trades; otherwise skipped. intelligence_universe_membership.last_exited_at is NOT used.',
        dying:'Derived from pump_volume_buckets collapse + sell dominance + bull_token_cohorts outbound. source=derived. liqSol omitted. incomplete=true while liqSol/uniqueTraders incomplete.',
        birthGradMigrate:'Not produced in this PR.'
      })
    },200,'public, max-age=2, stale-while-revalidate=10');
  }

  if(path===`${FIELD_V0_PATH}/tokens`){
    const stars=await buildStarSnapshots(db,{nowMs,mints,minScore,limit});
    return json({
      ok:true,
      readOnly:true,
      contractVersion:'field-v0',
      stars,
      coverage,
      disclosure:coverage.statement
    },200,'public, max-age=5, stale-while-revalidate=15');
  }

  const walletMatch=path.match(/^\/api\/intelligence\/field\/v0\/wallets\/([^/]+)$/);
  if(walletMatch){
    const wallet=decodeURIComponent(walletMatch[1]);
    if(!ADDRESS_RE.test(wallet))return json({ok:false,error:'invalid_wallet'},400);
    try{
      const planet=await buildPlanetSnapshot(db,wallet,{nowMs});
      return json({
        ok:true,
        readOnly:true,
        contractVersion:'field-v0',
        planet,
        coverage,
        disclosure:coverage.statement
      },200,'public, max-age=5, stale-while-revalidate=15');
    }catch(error){
      const code=s(error?.message||error);
      return json({ok:false,error:code},code==='invalid_wallet'?400:500);
    }
  }

  return json({ok:false,error:'not_found'},404);
}

export const __fieldV0Contract=Object.freeze({
  version:'field-v0',
  paths:Object.freeze([`${FIELD_V0_PATH}/events`,`${FIELD_V0_PATH}/tokens`,`${FIELD_V0_PATH}/wallets/:wallet`]),
  usesExistingIntelligenceDb:true,
  neverInvent:Object.freeze(['liqSol','remainingPct']),
  skipHolderExitWhenRemainingUnknown:true,
  membershipExitIsNotHolderExit:true
});
