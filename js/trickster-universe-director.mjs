// @ts-nocheck
import { cutShareReceiptLines, cutShareSize } from './trickster-story-manifest.mjs';

const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const xml=v=>s(v).replace(/[&<>"']/g,ch=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;' }[ch]??ch));
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

function observedStatement(event={}){
  const side=s(event.side).toLowerCase(),token=s(event.token),wallet=s(event.wallet),sig=s(event.signature);
  const action=side==='buy'?'buy':side==='sell'?'sell':s(event.kind)||'event';
  const subject=token?`token ${token.slice(0,6)}…${token.slice(-4)}`:'the selected market';
  return `${action.toUpperCase()} observed for ${subject}${wallet?` by ${wallet.slice(0,6)}…${wallet.slice(-4)}`:''}${sig?` · tx ${sig.slice(0,8)}…`:''}`;
}

export function tricksterEventMagnitude(event={}){
  return clamp(n(event.magnitude)||.08,.08,1);
}

function receiptId(event={},index=0){return s(event.id)||s(event.signature)||`event-${Math.max(0,Math.trunc(n(index)))}`;}

/** Select a compact contiguous receipt window centered on the highest-magnitude event. */
export function autoSelectTricksterMoment(timeline=[],maxEvents=5){
  const events=Array.isArray(timeline)?timeline:[],cap=Math.max(1,Math.min(12,Math.trunc(n(maxEvents)||5)));
  if(!events.length)return Object.freeze([]);
  let peak=0,peakScore=-Infinity;
  for(let index=0;index<events.length;index++){
    const event=events[index],side=s(event.side).toLowerCase(),score=tricksterEventMagnitude(event)+((side==='buy'||side==='sell') ? .02 : 0);
    if(score>peakScore){peak=index;peakScore=score;}
  }
  const size=Math.min(cap,events.length),start=clamp(peak-Math.floor(size/2),0,events.length-size);
  return Object.freeze(events.slice(start,start+size).map((event,offset)=>Object.freeze({index:start+offset,receiptId:receiptId(event,start+offset),timestamp:n(event.timestamp),magnitude:tricksterEventMagnitude(event)})));
}

export function buildTricksterDirectorCues(timeline=[],options={}){
  const events=Array.isArray(timeline)?timeline:[];
  const max=Math.max(1,Math.min(80,Math.trunc(n(options.maxCues)||24)));
  if(!events.length)return Object.freeze([]);
  const candidates=[];
  for(let i=0;i<events.length;i++){
    const e=events[i],mag=tricksterEventMagnitude(e),side=s(e.side).toLowerCase();
    if(i===0||i===events.length-1||mag>=.55||side==='buy'||side==='sell')candidates.push({e,i,mag});
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
    magnitude:mag,
    suggestedPresentation:mag>=.75?'chart-and-video':'hud-callout',
    rawIndex:i
  })));
}

export function buildTricksterSimulationCue({at=0,prompt='',summary=''}={}){
  return Object.freeze({id:`simulation-${Math.max(0,Math.trunc(n(at)))}`,at:n(at),kind:'simulation',statement:s(summary)||s(prompt)||'What If simulation',claimKind:'simulated',disclosure:'Simulation: this segment is not an observed blockchain event.',suggestedPresentation:'alternate-timeline'});
}

/** Social SVG poster retained as a deterministic fallback when browser video capture is unavailable. */
export function buildCutShareSvg(opts={}){
  const manifest=opts.manifest,shareHref=opts.shareHref||'',candles=opts.candles||[],tokenLabel=opts.tokenLabel||'This trade';
  const size=cutShareSize(manifest?.output?.aspectRatio||'9:16');
  const {w,h}=size;
  const pad=Math.round(w*0.07);
  const lines=cutShareReceiptLines(manifest,shareHref);
  const label=xml(tokenLabel||'This trade');
  const rows=(Array.isArray(candles)?candles:[]).filter(row=>Number.isFinite(Number(row?.high))||Number.isFinite(Number(row?.low))).slice(-110);
  const chartTop=pad+Math.round(w*0.22);
  const chartH=Math.round(h*(manifest?.output?.aspectRatio==='9:16'?0.42:0.36));
  const chartW=w-pad*2;
  let chart='';
  if(rows.length<2){
    chart=`<text x="${pad+chartW/2}" y="${chartTop+chartH/2}" text-anchor="middle" fill="#8e9db0" font-size="28">No indexed OHLC. Receipts only.</text>
      <text x="${pad+chartW/2}" y="${chartTop+chartH/2+40}" text-anchor="middle" fill="#8e9db0" font-size="24">No price path was invented.</text>`;
  }else{
    const high=Math.max(...rows.map(row=>Number(row.high)));
    const low=Math.min(...rows.map(row=>Number(row.low)));
    const range=Math.max(Number.EPSILON,high-low);
    const x=(i)=>pad+16+(i*(chartW-32))/Math.max(1,rows.length-1);
    const y=(v)=>chartTop+16+(1-(v-low)/range)*(chartH-32);
    chart=rows.map((row,i)=>{
      const up=Number(row.close)>=Number(row.open);
      const color=up?'#42efbd':'#ff5b82';
      const top=Math.min(y(Number(row.open)),y(Number(row.close)));
      const body=Math.max(2,Math.abs(y(Number(row.open))-y(Number(row.close))));
      return `<line x1="${x(i)}" x2="${x(i)}" y1="${y(Number(row.high))}" y2="${y(Number(row.low))}" stroke="${color}" stroke-width="2"/>
        <rect x="${x(i)-3}" y="${top}" width="6" height="${body}" fill="${color}"/>`;
    }).join('');
  }
  const receiptTop=chartTop+chartH+Math.round(w*0.06);
  const receipt=lines.filter(line=>line!=='INDEXED').map((line,i)=>`<text x="${pad}" y="${receiptTop+Math.round(w*0.05)+i*Math.round(w*0.04)}" fill="#9ab0c2" font-size="${Math.round(w*0.026)}" font-family="ui-monospace,monospace">${xml(line)}</text>`).join('');
  const coverage=xml(manifest?.coverage?.statement||'Currently indexed evidence only. Missing coverage stays missing.');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#05060c"/>
    <rect width="${w}" height="${Math.round(h*0.38)}" fill="rgba(76,68,240,0.16)"/>
    <text x="${pad}" y="${pad+Math.round(w*0.04)}" fill="#65f4d2" font-size="${Math.round(w*0.028)}" font-family="ui-monospace,monospace" font-weight="700">INDEXED</text>
    <text x="${pad}" y="${pad+Math.round(w*0.12)}" fill="#f5f8ff" font-size="${Math.round(w*0.062)}" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600">${label}</text>
    <text x="${pad}" y="${pad+Math.round(w*0.17)}" fill="#8ee9ff" font-size="${Math.round(w*0.028)}" font-family="ui-monospace,monospace">${xml(lines[1]||'')}</text>
    <rect x="${pad}" y="${chartTop}" width="${chartW}" height="${chartH}" fill="rgba(2,4,10,0.72)" stroke="rgba(142,233,255,0.22)"/>
    ${chart}
    <text x="${pad}" y="${receiptTop}" fill="#f5f8ff" font-size="${Math.round(w*0.032)}" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="650">Receipts for this trade</text>
    ${receipt}
    <text x="${pad}" y="${h-pad}" fill="#8298aa" font-size="${Math.round(w*0.022)}" font-family="ui-monospace,monospace">${coverage}</text>
  </svg>`;
}

export const __tricksterUniverseDirectorContract=Object.freeze({observedNarrationUsesEvidenceOnly:true,simulationAlwaysDisclosed:true,boundedDefaultCues:24,noNetworkCalls:true,autoCutUsesHighestMagnitudeWindow:true,shareArtifact:'video-with-svg-fallback'});
