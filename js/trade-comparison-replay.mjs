import { createReplayTimeline, normalizeReplayEvents } from './temporal-replay-engine.mjs';

function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function same(value,target){return String(value||'')===String(target||'');}
function median(values=[]){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;}
function evidenceIds(events=[]){return Object.freeze([...new Set(events.map(event=>event.evidenceId||event.signature||event.id).filter(Boolean))].slice(0,12));}

function summarizeWallet(events,wallet){
  const trades=events.filter(event=>same(event.wallet,wallet)&&(event.side==='buy'||event.side==='sell')).sort((a,b)=>a.timestamp-b.timestamp||a.sequence-b.sequence);
  let buys=0,sells=0,buyAmount=0,sellAmount=0,cumulative=0,peakIncrease=0,peakDecrease=0,largest=null,directionChanges=0,lastSide=null;
  const gaps=[];
  for(let index=0;index<trades.length;index+=1){
    const event=trades[index],amount=Math.max(0,finite(event.amount));
    if(event.side==='buy'){buys+=1;buyAmount+=amount;cumulative+=amount;}else{sells+=1;sellAmount+=amount;cumulative-=amount;}
    if(lastSide&&lastSide!==event.side)directionChanges+=1;lastSide=event.side;
    peakIncrease=Math.max(peakIncrease,cumulative);peakDecrease=Math.min(peakDecrease,cumulative);
    if(!largest||amount>largest.amount)largest={amount,event};
    if(index>0)gaps.push(Math.max(0,event.timestamp-trades[index-1].timestamp));
  }
  const first=trades[0]||null,last=trades.at(-1)||null;
  return Object.freeze({
    wallet:String(wallet||''),tradeCount:trades.length,buys,sells,buyAmount,sellAmount,
    grossObservedAmount:buyAmount+sellAmount,netObservedAmount:buyAmount-sellAmount,
    firstTradeAt:first?.timestamp??null,lastTradeAt:last?.timestamp??null,activeSpanMs:first&&last?Math.max(0,last.timestamp-first.timestamp):0,
    firstTradeSide:first?.side??null,lastTradeSide:last?.side??null,firstTradeEvidenceId:first?.evidenceId||first?.signature||first?.id||null,
    lastTradeEvidenceId:last?.evidenceId||last?.signature||last?.id||null,
    largestObservedTradeAmount:largest?.amount??null,largestObservedTradeSide:largest?.event?.side??null,
    largestObservedTradeAt:largest?.event?.timestamp??null,largestObservedTradeEvidenceId:largest?.event?.evidenceId||largest?.event?.signature||largest?.event?.id||null,
    averageObservedTradeAmount:trades.length?(buyAmount+sellAmount)/trades.length:null,medianGapMs:median(gaps),directionChanges,
    peakCumulativeIncrease:peakIncrease,peakCumulativeDecrease:peakDecrease,
    evidenceIds:evidenceIds(trades),
    disclosure:'Cumulative token change is measured only from events inside this replay window. It is not a complete wallet balance, cost basis, P&L, or ownership claim.'
  });
}

export function buildWalletTokenComparison({events,walletA,walletB,token,startTime,endTime}={}){
  if(!walletA||!walletB) throw new TypeError('walletA and walletB are required');
  if(!token) throw new TypeError('token is required');
  const normalized=normalizeReplayEvents(events??[]);
  const filtered=normalized.filter(event=>same(event.token,token)&&(same(event.wallet,walletA)||same(event.wallet,walletB)));
  const timeline=createReplayTimeline({events:filtered,startTime,endTime});
  const a=summarizeWallet(filtered,walletA),b=summarizeWallet(filtered,walletB);
  const firstTradeGapMs=a.firstTradeAt!=null&&b.firstTradeAt!=null?Math.abs(a.firstTradeAt-b.firstTradeAt):null;
  const overlapFrom=a.firstTradeAt!=null&&b.firstTradeAt!=null?Math.max(a.firstTradeAt,b.firstTradeAt):null;
  const overlapTo=a.lastTradeAt!=null&&b.lastTradeAt!=null?Math.min(a.lastTradeAt,b.lastTradeAt):null;
  return Object.freeze({
    token:String(token),walletA:String(walletA),walletB:String(walletB),timeline,
    summaries:Object.freeze({walletA:a,walletB:b}),
    timing:Object.freeze({
      firstTradeGapMs,
      earlierFirstTrade:firstTradeGapMs==null||firstTradeGapMs===0?null:(a.firstTradeAt<b.firstTradeAt?a.wallet:b.wallet),
      activeOverlapMs:overlapFrom!=null&&overlapTo!=null?Math.max(0,overlapTo-overlapFrom):null,
      activePeriodsOverlap:overlapFrom!=null&&overlapTo!=null?overlapFrom<=overlapTo:null
    }),
    disclosure:'Comparison is calculated from indexed public-chain events inside the selected token and time window. It does not infer intent, identity, strategy, profitability, or complete wallet balances.'
  });
}

export function comparisonObservations(comparison){
  if(!comparison?.summaries) throw new TypeError('comparison is required');
  const a=comparison.summaries.walletA,b=comparison.summaries.walletB,observations=[];
  const push=(metric,winner,statement,ids=[])=>observations.push(Object.freeze({kind:'calculated',metric,wallet:winner||null,statement,evidenceIds:Object.freeze([...new Set(ids.filter(Boolean))])}));
  if(a.tradeCount!==b.tradeCount)push('trade-count',a.tradeCount>b.tradeCount?a.wallet:b.wallet,`${a.tradeCount>b.tradeCount?'Wallet A':'Wallet B'} had more observed trades in this token window.`,[...a.evidenceIds,...b.evidenceIds]);
  if(a.buys!==b.buys)push('buy-count',a.buys>b.buys?a.wallet:b.wallet,`${a.buys>b.buys?'Wallet A':'Wallet B'} executed more observed buys in this token window.`,[...a.evidenceIds,...b.evidenceIds]);
  if(a.sells!==b.sells)push('sell-count',a.sells>b.sells?a.wallet:b.wallet,`${a.sells>b.sells?'Wallet A':'Wallet B'} executed more observed sells in this token window.`,[...a.evidenceIds,...b.evidenceIds]);
  if(a.grossObservedAmount!==b.grossObservedAmount)push('gross-token-flow',a.grossObservedAmount>b.grossObservedAmount?a.wallet:b.wallet,`${a.grossObservedAmount>b.grossObservedAmount?'Wallet A':'Wallet B'} had the larger observed token flow across buys and sells.`,[a.largestObservedTradeEvidenceId,b.largestObservedTradeEvidenceId]);
  if(a.firstTradeAt!=null&&b.firstTradeAt!=null&&a.firstTradeAt!==b.firstTradeAt)push('first-trade-timing',a.firstTradeAt<b.firstTradeAt?a.wallet:b.wallet,`${a.firstTradeAt<b.firstTradeAt?'Wallet A':'Wallet B'} appears earlier in the indexed replay for this token.`,[a.firstTradeEvidenceId,b.firstTradeEvidenceId]);
  if(a.activeSpanMs!==b.activeSpanMs)push('active-span',a.activeSpanMs>b.activeSpanMs?a.wallet:b.wallet,`${a.activeSpanMs>b.activeSpanMs?'Wallet A':'Wallet B'} has the longer observed activity span between its first and last indexed trade in this window.`,[a.firstTradeEvidenceId,a.lastTradeEvidenceId,b.firstTradeEvidenceId,b.lastTradeEvidenceId]);
  if(a.largestObservedTradeAmount!=null&&b.largestObservedTradeAmount!=null&&a.largestObservedTradeAmount!==b.largestObservedTradeAmount)push('largest-trade-amount',a.largestObservedTradeAmount>b.largestObservedTradeAmount?a.wallet:b.wallet,`${a.largestObservedTradeAmount>b.largestObservedTradeAmount?'Wallet A':'Wallet B'} has the larger single observed token amount in this replay.`,[a.largestObservedTradeEvidenceId,b.largestObservedTradeEvidenceId]);
  if(a.directionChanges!==b.directionChanges)push('direction-changes',a.directionChanges>b.directionChanges?a.wallet:b.wallet,`${a.directionChanges>b.directionChanges?'Wallet A':'Wallet B'} switched between observed buy and sell events more often in this replay.`,[...a.evidenceIds,...b.evidenceIds]);
  if(comparison.timing?.firstTradeGapMs>0)push('first-trade-gap',comparison.timing.earlierFirstTrade,`The wallets' first observed trades in this replay are ${Math.round(comparison.timing.firstTradeGapMs/60000)} minutes apart.`,[a.firstTradeEvidenceId,b.firstTradeEvidenceId]);
  return Object.freeze(observations);
}

export function buildCounterfactualOverlay({comparison,sourceWallet,targetWallet}={}){
  if(!comparison?.timeline) throw new TypeError('comparison is required');
  const source=String(sourceWallet||''),target=String(targetWallet||'');
  if(!source||!target) throw new TypeError('sourceWallet and targetWallet are required');
  const events=comparison.timeline.events.filter(event=>same(event.wallet,source)&&(event.side==='buy'||event.side==='sell')).map((event,index)=>Object.freeze({
    ...event,id:`whatif-${index+1}-${event.id}`,wallet:target,sourceWallet:source,hypothetical:true,verification:'simulation',evidenceId:event.evidenceId,
    metadata:Object.freeze({...event.metadata,scenario:'mirror-source-wallet-timing'})
  }));
  return Object.freeze({
    scenario:'mirror-source-wallet-timing',sourceWallet:source,targetWallet:target,token:comparison.token,events:Object.freeze(events),
    disclosure:'Hypothetical replay using the source wallet’s observed trade timing. It does not claim the target wallet could have received identical execution, liquidity, fees, price impact, profitability, or account outcome.'
  });
}
