const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;

function observedStatement(event={}){
  const side=s(event.side).toLowerCase(),token=s(event.token),wallet=s(event.wallet),sig=s(event.signature);
  const action=side==='buy'?'buy':side==='sell'?'sell':s(event.kind)||'event';
  const subject=token?`token ${token.slice(0,6)}…${token.slice(-4)}`:'the selected market';
  return `${action.toUpperCase()} observed for ${subject}${wallet?` by ${wallet.slice(0,6)}…${wallet.slice(-4)}`:''}${sig?` · tx ${sig.slice(0,8)}…`:''}`;
}

export function buildTricksterDirectorCues(timeline=[],options={}){
  const events=Array.isArray(timeline)?timeline:[];
  const max=Math.max(1,Math.min(80,Math.trunc(n(options.maxCues)||24)));
  if(!events.length)return Object.freeze([]);
  const candidates=[];
  for(let i=0;i<events.length;i++){
    const e=events[i],mag=Math.max(.08,Math.min(1,n(e.magnitude)||.08));
    if(i===0||i===events.length-1||mag>=.55||s(e.side)==='buy'||s(e.side)==='sell')candidates.push({e,i,mag});
  }
  const step=Math.max(1,Math.ceil(candidates.length/max));
  return Object.freeze(candidates.filter((_,i)=>i%step===0).slice(0,max).map(({e,i,mag},idx)=>Object.freeze({
    id:`trickster-cue-${idx+1}`,
    at:n(e.timestamp),
    kind:idx===0?'arrival':i===events.length-1?'aftermath':mag>=.75?'major-event':'trade-event',
    evidenceId:s(e.signature||e.id),
    statement:observedStatement(e),
    claimKind:'observed',
    disclosure:null,
    suggestedPresentation:mag>=.75?'chart-and-video':'hud-callout',
    rawIndex:i
  })));
}

export function buildTricksterSimulationCue({at=0,prompt='',summary=''}={}){
  return Object.freeze({id:`simulation-${Math.max(0,Math.trunc(n(at)))}`,at:n(at),kind:'simulation',statement:s(summary)||s(prompt)||'What If simulation',claimKind:'simulated',disclosure:'Simulation: this segment is not an observed blockchain event.',suggestedPresentation:'alternate-timeline'});
}

export const __tricksterUniverseDirectorContract=Object.freeze({observedNarrationUsesEvidenceOnly:true,simulationAlwaysDisclosed:true,boundedDefaultCues:24,noNetworkCalls:true});
