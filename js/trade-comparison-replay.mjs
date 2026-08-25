import { createReplayTimeline, normalizeReplayEvents } from './temporal-replay-engine.mjs';

function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function same(value,target){return String(value||'')===String(target||'');}

function summarizeWallet(events,wallet){
  let buys=0,sells=0,buyValue=0,sellValue=0,buyAmount=0,sellAmount=0;
  for(const event of events){
    if(!same(event.wallet,wallet)) continue;
    if(event.side==='buy'){
      buys+=1; buyValue+=Math.max(0,finite(event.valueUsd)); buyAmount+=Math.max(0,finite(event.amount));
    } else if(event.side==='sell'){
      sells+=1; sellValue+=Math.max(0,finite(event.valueUsd)); sellAmount+=Math.max(0,finite(event.amount));
    }
  }
  return Object.freeze({
    wallet:String(wallet||''),
    buys,sells,
    buyValueUsd:buyValue,
    sellValueUsd:sellValue,
    buyAmount,sellAmount,
    netObservedAmount:buyAmount-sellAmount,
    netObservedCashflowUsd:sellValue-buyValue,
    averageBuyUsd:buys?buyValue/buys:null,
    averageSellUsd:sells?sellValue/sells:null
  });
}

export function buildWalletTokenComparison({events,walletA,walletB,token,startTime,endTime}={}){
  if(!walletA||!walletB) throw new TypeError('walletA and walletB are required');
  if(!token) throw new TypeError('token is required');
  const normalized=normalizeReplayEvents(events??[]);
  const filtered=normalized.filter((event)=>same(event.token,token)&&(same(event.wallet,walletA)||same(event.wallet,walletB)));
  const timeline=createReplayTimeline({events:filtered,startTime,endTime});
  return Object.freeze({
    token:String(token),
    walletA:String(walletA),
    walletB:String(walletB),
    timeline,
    summaries:Object.freeze({
      walletA:summarizeWallet(filtered,walletA),
      walletB:summarizeWallet(filtered,walletB)
    })
  });
}

export function comparisonObservations(comparison){
  if(!comparison?.summaries) throw new TypeError('comparison is required');
  const a=comparison.summaries.walletA;
  const b=comparison.summaries.walletB;
  const observations=[];
  if(a.buys!==b.buys) observations.push(Object.freeze({kind:'calculated',metric:'buy-count',wallet:a.buys>b.buys?a.wallet:b.wallet,statement:`${a.buys>b.buys?'Wallet A':'Wallet B'} executed more observed buys in this token window.`}));
  if(a.sells!==b.sells) observations.push(Object.freeze({kind:'calculated',metric:'sell-count',wallet:a.sells>b.sells?a.wallet:b.wallet,statement:`${a.sells>b.sells?'Wallet A':'Wallet B'} executed more observed sells in this token window.`}));
  if(a.buyValueUsd!==b.buyValueUsd) observations.push(Object.freeze({kind:'calculated',metric:'observed-buy-value',wallet:a.buyValueUsd>b.buyValueUsd?a.wallet:b.wallet,statement:`${a.buyValueUsd>b.buyValueUsd?'Wallet A':'Wallet B'} had the larger observed buy value in this token window.`}));
  return Object.freeze(observations);
}

export function buildCounterfactualOverlay({comparison,sourceWallet,targetWallet}={}){
  if(!comparison?.timeline) throw new TypeError('comparison is required');
  const source=String(sourceWallet||'');
  const target=String(targetWallet||'');
  if(!source||!target) throw new TypeError('sourceWallet and targetWallet are required');
  const events=comparison.timeline.events
    .filter((event)=>same(event.wallet,source)&&(event.side==='buy'||event.side==='sell'))
    .map((event,index)=>Object.freeze({
      ...event,
      id:`whatif-${index+1}-${event.id}`,
      wallet:target,
      sourceWallet:source,
      hypothetical:true,
      verification:'simulation',
      evidenceId:event.evidenceId,
      metadata:Object.freeze({...event.metadata,scenario:'mirror-source-wallet-timing'})
    }));
  return Object.freeze({
    scenario:'mirror-source-wallet-timing',
    sourceWallet:source,
    targetWallet:target,
    token:comparison.token,
    events:Object.freeze(events),
    disclosure:'Hypothetical replay using the source wallet’s observed trade timing. It does not claim the target wallet could have received identical execution, liquidity, fees, or price impact.'
  });
}
