function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
function text(value){return String(value==null?'':value).trim();}
export function marketPhaseFieldEffect(phase={}){
  const eventCount=Math.max(0,finite(phase.eventCount)),walletCount=Math.max(0,finite(phase.walletCount)),buyCount=Math.max(0,finite(phase.buyCount)),sellCount=Math.max(0,finite(phase.sellCount)),directionTotal=buyCount+sellCount;
  const density=clamp(Math.log10(1+eventCount)/2,0,1),participation=clamp(Math.log10(1+walletCount)/2,0,1),buyShare=directionTotal?buyCount/directionTotal:.5;
  return Object.freeze({phaseId:text(phase.id||phase.phaseId||phase.label),label:text(phase.label||phase.title||'PHASE'),from:finite(phase.from,null),to:finite(phase.to,null),eventCount,walletCount,buyCount,sellCount,density,participation,buyShare,scale:1+density*.24+participation*.12,rotation:(buyShare-.5)*.38,intensity:.75+density*.45,disclosure:'Phase field motion is derived only from bounded event count, observed-wallet count, and buy/sell direction mix. It is not a market-regime, intent, strategy, or prediction label.'});
}
export function dispatchMarketPhaseFieldEffect(phase={},target=globalThis){const effect=marketPhaseFieldEffect(phase);if(typeof target?.dispatchEvent==='function'&&typeof CustomEvent==='function')target.dispatchEvent(new CustomEvent('abulls:field-market-phase',{detail:{effect}}));return effect;}
export const MarketPhaseFieldEvent='abulls:field-market-phase';
