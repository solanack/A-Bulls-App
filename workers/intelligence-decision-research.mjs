import { intelligenceDb } from './intelligence-indexer.mjs';

const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=v=>Math.max(0,Math.min(1,n(v)));
const uniq=v=>[...new Set(v.filter(Boolean))];
const mean=v=>v.length?v.reduce((a,b)=>a+b,0)/v.length:0;
const median=v=>{if(!v.length)return null;const a=[...v].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const stdev=v=>{if(v.length<2)return 0;const m=mean(v);return Math.sqrt(v.reduce((sum,x)=>sum+(x-m)**2,0)/v.length);};

function side(row){const cls=s(row.event_class).toLowerCase(),token=n(row.token_delta),sol=n(row.sol_delta);if(!cls.includes('swap'))return'other';if(token>0||sol<0)return'buy';if(token<0||sol>0)return'sell';return'trade';}
function compactEvent(row){return{id:n(row.id),signature:s(row.signature),time:n(row.block_time),wallet:s(row.wallet),counterparty:s(row.counterparty),mint:s(row.mint),kind:side(row),solDelta:n(row.sol_delta),tokenDelta:n(row.token_delta),sizeSol:Math.abs(n(row.sol_delta)),source:s(row.source)};}

async function universeEvents(db,universeId,from,to,limit){
  const cap=Math.max(100,Math.min(50000,Math.trunc(n(limit)||20000)));
  const result=universeId==='solana'
    ? await db.prepare("SELECT id,signature,block_time,wallet,counterparty,mint,event_class,sol_delta,token_delta,source FROM bull_wallet_events WHERE block_time BETWEEN ? AND ? AND event_class='swap-like' ORDER BY block_time ASC,id ASC LIMIT ?").bind(from,to,cap).all()
    : await db.prepare("SELECT e.id,e.signature,e.block_time,e.wallet,e.counterparty,e.mint,e.event_class,e.sol_delta,e.token_delta,e.source FROM bull_wallet_events e JOIN intelligence_universe_event_links l ON l.event_row_id=e.id AND l.universe_id=? WHERE e.block_time BETWEEN ? AND ? AND e.event_class='swap-like' ORDER BY e.block_time ASC,e.id ASC LIMIT ?").bind(universeId,from,to,cap).all();
  return(result?.results||[]).map(compactEvent).filter(event=>event.wallet&&event.mint&&event.time);
}

function contextFeatures(events){
  const byMint=new Map();for(const event of events){if(!byMint.has(event.mint))byMint.set(event.mint,[]);byMint.get(event.mint).push(event);}
  const contexts=new Map();
  for(const[mint,rows]of byMint){rows.sort((a,b)=>a.time-b.time||a.id-b.id);const firstTime=rows[0]?.time||0;
    for(let index=0;index<rows.length;index++){
      const event=rows[index],prior5=[],prev5=[];for(let cursor=index-1;cursor>=0;cursor--){const delta=event.time-rows[cursor].time;if(delta>600)break;if(delta<=300)prior5.push(rows[cursor]);else prev5.push(rows[cursor]);}
      const summarize=items=>{const buys=items.filter(x=>x.kind==='buy').length,sells=items.filter(x=>x.kind==='sell').length;return{events:items.length,wallets:uniq(items.map(x=>x.wallet)).length,buys,sells,solActivity:items.reduce((sum,x)=>sum+Math.abs(x.solDelta),0),buyPressure:buys+sells?buys/(buys+sells):null};};
      const short=summarize(prior5),baseline=summarize(prev5),sameWalletPrior=rows.slice(0,index).filter(x=>x.wallet===event.wallet).length;
      contexts.set(event.id,{eventRowId:event.id,signature:event.signature,wallet:event.wallet,mint,blockTime:event.time,side:event.kind,sizeSol:event.sizeSol,tokenAgeSeconds:Math.max(0,event.time-firstTime),sameWalletPriorTrades:sameWalletPrior,prior5m:short,previous5m:baseline,activityAcceleration:short.events/Math.max(1,baseline.events),walletAcceleration:short.wallets/Math.max(1,baseline.wallets),solActivityAcceleration:short.solActivity/Math.max(.000001,baseline.solActivity)});
    }
  }
  return contexts;
}

function holdTimes(walletEvents){
  const byMint=new Map();for(const event of walletEvents){if(!byMint.has(event.mint))byMint.set(event.mint,[]);byMint.get(event.mint).push(event);}
  const holds=[],scaleIns=[],ladderedExits=[];
  for(const rows of byMint.values()){rows.sort((a,b)=>a.time-b.time);let openBuy=null,buyCount=0,sellCount=0;for(const event of rows){if(event.kind==='buy'){if(openBuy==null)openBuy=event.time;buyCount++;}else if(event.kind==='sell'){sellCount++;if(openBuy!=null){holds.push(Math.max(0,event.time-openBuy));openBuy=null;}}}if(buyCount>1)scaleIns.push(buyCount);if(sellCount>1)ladderedExits.push(sellCount);}
  return{medianHoldSeconds:median(holds),completedHolds:holds.length,scaleInTokenRatio:byMint.size?scaleIns.length/byMint.size:0,ladderedExitTokenRatio:byMint.size?ladderedExits.length/byMint.size:0};
}

function hypothesis(kind,statement,support,contradict,total,extra={},alternatives=[]){const ratio=total?support/total:0,confidence=clamp(.2+Math.min(.35,total/40)+Math.max(0,ratio-.5)*.7);return{kind,statement,confidence,sampleSize:total,supportingCount:support,contradictingCount:contradict,supportRatio:ratio,evidence:extra,alternativeExplanations:alternatives};}

function walletProfile(wallet,events,contexts,scope){
  const trades=events.filter(x=>x.wallet===wallet),buys=trades.filter(x=>x.kind==='buy'),sells=trades.filter(x=>x.kind==='sell'),sizes=trades.map(x=>x.sizeSol).filter(x=>x>0),tokens=uniq(trades.map(x=>x.mint)),buyContexts=buys.map(x=>contexts.get(x.id)).filter(Boolean),hypotheses=[];
  const activitySupport=buyContexts.filter(x=>x.activityAcceleration>=1.5&&x.prior5m.events>=3).length;if(buyContexts.length>=6&&activitySupport/buyContexts.length>=.55)hypotheses.push(hypothesis('activity-acceleration-entry','Observed entries frequently occur after indexed transaction activity accelerates versus the preceding five-minute baseline. This is consistent with an activity-confirmation rule, but does not establish the trader\'s private rationale.',activitySupport,buyContexts.length-activitySupport,buyContexts.length,{medianAcceleration:median(buyContexts.map(x=>x.activityAcceleration)),threshold:1.5},['News or social reaction','Manual momentum trading','Launch timing effects','Incomplete indexed market coverage']));
  const walletSupport=buyContexts.filter(x=>x.walletAcceleration>=1.5&&x.prior5m.wallets>=3).length;if(buyContexts.length>=6&&walletSupport/buyContexts.length>=.55)hypotheses.push(hypothesis('wallet-velocity-entry','Entries often follow an increase in the number of distinct indexed wallets active in the token. One possible explanation is a rule that waits for participation to broaden.',walletSupport,buyContexts.length-walletSupport,buyContexts.length,{medianWalletAcceleration:median(buyContexts.map(x=>x.walletAcceleration)),threshold:1.5},['Organic community growth','Manual confirmation seeking','Sampling bias']));
  const earlySupport=buyContexts.filter(x=>x.tokenAgeSeconds<=300).length;if(buyContexts.length>=6&&earlySupport/buyContexts.length>=.6)hypotheses.push(hypothesis('early-entry','A majority of observed entries occur within five minutes of the first indexed event for the token in the analyzed window. This is consistent with an early-entry preference.',earlySupport,buyContexts.length-earlySupport,buyContexts.length,{medianTokenAgeSeconds:median(buyContexts.map(x=>x.tokenAgeSeconds))},['The index may begin after the true launch','Wallet may receive off-chain alerts','Short-lived token samples']));
  const confirmationSupport=buyContexts.filter(x=>x.tokenAgeSeconds>300&&x.activityAcceleration>=1.5).length;if(buyContexts.length>=8&&confirmationSupport/buyContexts.length>=.5)hypotheses.push(hypothesis('confirmation-entry','Observed entries more often occur after an initial token period and alongside rising indexed activity. This is compatible with waiting for confirmation rather than entering immediately.',confirmationSupport,buyContexts.length-confirmationSupport,buyContexts.length,{medianTokenAgeSeconds:median(buyContexts.map(x=>x.tokenAgeSeconds)),medianActivityAcceleration:median(buyContexts.map(x=>x.activityAcceleration))},['Manual discretion','Delayed data capture','External signals not represented on-chain']));
  const sizeMean=mean(sizes),sizeCv=sizeMean>0?stdev(sizes)/sizeMean:null;if(sizes.length>=8&&sizeCv!=null&&sizeCv<.35)hypotheses.push(hypothesis('position-sizing-template','Position sizes are unusually consistent across observed trades. Fixed or formulaic sizing is one possible explanation.',sizes.length,0,sizes.length,{meanSizeSol:sizeMean,sizeCv},['Wallet UI presets','Limited account balance range','Token-specific routing constraints']));
  const holds=holdTimes(trades);if(holds.completedHolds>=5&&holds.medianHoldSeconds!=null&&holds.medianHoldSeconds<=900)hypotheses.push(hypothesis('short-horizon-exit','Completed buy-to-sell sequences have a short median observed holding interval. A time-bounded or fast-feedback exit rule is one possible explanation.',holds.completedHolds,0,holds.completedHolds,{medianHoldSeconds:holds.medianHoldSeconds},['Partial indexing','Manual scalping','Transfers may obscure true position lifecycle']));
  if(tokens.length>=3&&holds.scaleInTokenRatio>=.5)hypotheses.push(hypothesis('scale-in','Multiple buy events recur within the same token before exits across much of the observed token set. This is consistent with staged entry behavior.',Math.round(tokens.length*holds.scaleInTokenRatio),Math.round(tokens.length*(1-holds.scaleInTokenRatio)),tokens.length,{scaleInTokenRatio:holds.scaleInTokenRatio},['Repeated manual buys','Failed or split routing','DCA-like behavior']));
  if(tokens.length>=3&&holds.ladderedExitTokenRatio>=.5)hypotheses.push(hypothesis('laddered-exit','Multiple sell events recur across positions, consistent with staged or laddered exit behavior.',Math.round(tokens.length*holds.ladderedExitTokenRatio),Math.round(tokens.length*(1-holds.ladderedExitTokenRatio)),tokens.length,{ladderedExitTokenRatio:holds.ladderedExitTokenRatio},['Manual profit taking','Router splitting','Partial fills']));
  hypotheses.sort((a,b)=>b.confidence-a.confidence||b.sampleSize-a.sampleSize);
  return{universeId:scope.universeId,wallet,windowStart:scope.from,windowEnd:scope.to,tradeCount:trades.length,tokenCount:tokens.length,buyCount:buys.length,sellCount:sells.length,medianSizeSol:median(sizes),sizeCv,medianEntryTokenAgeSeconds:median(buyContexts.map(x=>x.tokenAgeSeconds)),medianActivityAcceleration:median(buyContexts.map(x=>x.activityAcceleration)),medianWalletAcceleration:median(buyContexts.map(x=>x.walletAcceleration)),...holds,hypotheses};
}

async function persistContext(db,universeId,context){await db.prepare("INSERT INTO intelligence_decision_contexts(universe_id,event_row_id,wallet,mint,block_time,side,context_version,context_json,evidence_count,computed_at) VALUES(?,?,?,?,?,?,'v1',?,?,unixepoch()) ON CONFLICT(universe_id,event_row_id,context_version) DO UPDATE SET context_json=excluded.context_json,evidence_count=excluded.evidence_count,computed_at=unixepoch()").bind(universeId,context.eventRowId,context.wallet,context.mint,context.blockTime,context.side,JSON.stringify(context),n(context.prior5m?.events)+n(context.previous5m?.events)).run();}
async function persistProfile(db,profile){await db.prepare("INSERT INTO intelligence_decision_profiles(universe_id,wallet,window_start,window_end,profile_version,trade_count,token_count,hypothesis_count,profile_json,computed_at) VALUES(?,?,?,?,'v1',?,?,?,?,unixepoch()) ON CONFLICT(universe_id,wallet,window_start,window_end,profile_version) DO UPDATE SET trade_count=excluded.trade_count,token_count=excluded.token_count,hypothesis_count=excluded.hypothesis_count,profile_json=excluded.profile_json,computed_at=unixepoch()").bind(profile.universeId,profile.wallet,profile.windowStart,profile.windowEnd,profile.tradeCount,profile.tokenCount,profile.hypotheses.length,JSON.stringify(profile)).run();}

export async function analyzeDecisionModels(env={},universeId='solana',{windowSeconds=7*86400,now=Math.floor(Date.now()/1000),limit=20000,persist=false,walletLimit=250}={}){
  const db=intelligenceDb(env);if(!db)throw new Error('database_unavailable');const id=s(universeId)||'solana',window=Math.max(3600,Math.min(30*86400,Math.trunc(n(windowSeconds)||7*86400))),from=now-window,events=await universeEvents(db,id,from,now,limit),contexts=contextFeatures(events),walletCounts=new Map();for(const event of events)walletCounts.set(event.wallet,(walletCounts.get(event.wallet)||0)+1);const wallets=[...walletCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,Math.max(1,Math.min(1000,Math.trunc(n(walletLimit)||250)))).map(([wallet])=>wallet),profiles=wallets.map(wallet=>walletProfile(wallet,events,contexts,{universeId:id,from,to:now})).filter(profile=>profile.tradeCount>=4).sort((a,b)=>b.hypotheses.length-a.hypotheses.length||b.tradeCount-a.tradeCount);
  if(persist){for(const context of[...contexts.values()].slice(-2000))await persistContext(db,id,context);for(const profile of profiles)await persistProfile(db,profile);}
  return{universeId:id,windowStart:from,windowEnd:now,eventsAnalyzed:events.length,walletsAnalyzed:profiles.length,persisted:persist===true,methodology:'Decision Research reconstructs the indexed on-chain environment immediately preceding trades and compares recurring conditions across the same wallet. It generates falsifiable behavioral hypotheses, not claims about private thoughts, identity, automation, causation, profitability, or future actions.',profiles:profiles.slice(0,250)};
}

export const __decisionResearchContract=Object.freeze({contextWindowsSeconds:Object.freeze([300,600]),minimumProfileTrades:4,theoryOnly:true,usesIndexedEvidenceOnly:true});

