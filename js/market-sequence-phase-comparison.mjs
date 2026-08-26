const finite=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const delta=(a,b)=>{const from=finite(a),to=finite(b);return from==null||to==null?null:to-from;};
const pct=(a,b)=>{const from=finite(a),to=finite(b);return from==null||to==null||from===0?null:((to-from)/Math.abs(from))*100;};
const sign=value=>value>0?`+${value}`:String(value);

function transition(from,to){
  const eventDelta=delta(from.eventCount,to.eventCount),walletDelta=delta(from.walletCount,to.walletCount),buyDelta=delta(from.buyCount,to.buyCount),sellDelta=delta(from.sellCount,to.sellCount),largestDelta=delta(from.largestAbsTokenDelta,to.largestAbsTokenDelta);
  const eventPct=pct(from.eventCount,to.eventCount),walletPct=pct(from.walletCount,to.walletCount);
  const evidenceIds=Object.freeze([...new Set([...(from.evidenceIds||[]),...(to.evidenceIds||[])].map(String).filter(Boolean))]);
  const parts=[`${to.label} has ${to.eventCount} indexed events (${sign(eventDelta)} vs ${from.label})`,`${to.walletCount} observed wallets (${sign(walletDelta)} vs ${from.label})`,`${to.buyCount}/${to.sellCount} buy/sell (${sign(buyDelta)} buys, ${sign(sellDelta)} sells vs ${from.label})`];
  if(from.largestAbsTokenDelta!=null&&to.largestAbsTokenDelta!=null)parts.push(`largest observed |token Δ| changed by ${sign(largestDelta)}`);
  return Object.freeze({id:`${from.id}-to-${to.id}`,fromPhase:from.id,toPhase:to.id,fromLabel:from.label,toLabel:to.label,eventDelta,walletDelta,buyDelta,sellDelta,largestAbsTokenDeltaChange:largestDelta,eventPercentChange:eventPct,walletPercentChange:walletPct,evidenceIds,statement:`${parts.join('; ')}.`});
}

export function compareMarketSequencePhases(phasesInput={}){
  const phases=Array.isArray(phasesInput)?phasesInput:Array.isArray(phasesInput?.phases)?phasesInput.phases:[];
  const transitions=[];for(let index=1;index<phases.length;index++)transitions.push(transition(phases[index-1],phases[index]));
  return Object.freeze({transitions:Object.freeze(transitions),disclosure:'Phase transitions compare descriptive counts and observed numeric deltas between deterministic time partitions only. They do not identify market regime, trader intent, coordination, causation, strategy, or future behavior.'});
}
