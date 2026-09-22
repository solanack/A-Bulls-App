// @ts-nocheck
import { cutShareSize } from './trickster-story-manifest.mjs';

const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const short=(value,head=8,tail=6)=>{const text=s(value);return text.length>head+tail+2?`${text.slice(0,head)}…${text.slice(-tail)}`:text;};
const ms=value=>{const x=n(value);return x>0&&x<10_000_000_000?x*1000:x;};

function priceField(event={}){
  const sol=n(event.priceSol),usd=n(event.priceUsd);
  if(sol>0)return Object.freeze({field:'priceSol',unit:'SOL',value:sol});
  if(usd>0)return Object.freeze({field:'priceUsd',unit:'USD',value:usd});
  return null;
}

/** Only returns a metric when both selected receipts expose directly observed prices in the same unit. */
export function observedEntryExitPriceDelta(events=[]){
  const rows=Array.isArray(events)?events:[];
  let entry=null,entryIndex=-1,exit=null,exitIndex=-1;
  for(let index=0;index<rows.length;index++){
    const event=rows[index],side=s(event?.side).toLowerCase(),price=priceField(event);
    if(side==='buy'&&price&&!entry){entry=price;entryIndex=index;continue;}
    if(side==='sell'&&price&&entry&&price.field===entry.field&&index>entryIndex){exit=price;exitIndex=index;}
  }
  if(!entry||!exit||entry.value<=0||exitIndex<0)return null;
  const percent=((exit.value-entry.value)/entry.value)*100;
  if(!Number.isFinite(percent))return null;
  const sign=percent>0?'+':'';
  return Object.freeze({kind:'observed-price-delta',unit:entry.unit,entry:entry.value,exit:exit.value,percent,entryIndex,exitIndex,statement:`Observed entry-to-exit ${entry.unit} price delta: ${sign}${percent.toFixed(2)}%.`,label:`${entry.unit} PRICE DELTA`,display:`${sign}${percent.toFixed(2)}%`});
}

export function normalizeCutCandles(candles=[]){
  return Object.freeze((Array.isArray(candles)?candles:[]).map(row=>({timestamp:ms(row?.timestamp??row?.bucketStart??row?.time),open:n(row?.open),high:n(row?.high),low:n(row?.low),close:n(row?.close),volume:n(row?.volume)})).filter(row=>row.timestamp>0&&row.open>0&&row.high>0&&row.low>0&&row.close>0&&row.high>=row.low).sort((a,b)=>a.timestamp-b.timestamp));
}

function nearestIndex(rows,timestamp){
  if(!rows.length||!timestamp)return -1;
  let best=0,delta=Infinity;
  for(let index=0;index<rows.length;index++){const next=Math.abs(rows[index].timestamp-timestamp);if(next<delta){best=index;delta=next;}}
  return best;
}

export function cutCandleWindow(candles=[],timestamp=0,maxRows=96){
  const rows=normalizeCutCandles(candles),limit=Math.max(12,Math.min(140,Math.trunc(n(maxRows)||96)));
  if(rows.length<=limit)return rows;
  const nearest=nearestIndex(rows,ms(timestamp));
  if(nearest<0)return Object.freeze(rows.slice(-limit));
  const before=Math.floor(limit*.68),start=clamp(nearest-before,0,rows.length-limit);
  return Object.freeze(rows.slice(start,start+limit));
}

function claimMap(manifest={}){return new Map((Array.isArray(manifest?.claims)?manifest.claims:[]).map(claim=>[s(claim?.id),claim]));}
function evidenceMap(manifest={}){return new Map((Array.isArray(manifest?.evidence)?manifest.evidence:[]).map(receipt=>[s(receipt?.id),receipt]));}
function sceneClaims(manifest={},scene={}){const map=claimMap(manifest);return (Array.isArray(scene?.claimIds)?scene.claimIds:[]).map(id=>map.get(s(id))).filter(Boolean);}

export function headlineMetricFromClaims(claims=[]){
  for(const claim of Array.isArray(claims)?claims:[]){
    const statement=s(claim?.statement),match=statement.match(/^Observed entry-to-exit (SOL|USD) price delta:\s*([+-]?\d+(?:\.\d+)?)%\.?$/i);
    if(!match)continue;
    const value=Number(match[2]);if(!Number.isFinite(value))continue;
    return Object.freeze({label:`${match[1].toUpperCase()} PRICE DELTA`,value,display:`${value>0?'+':''}${value.toFixed(2)}%`,statement});
  }
  return null;
}

export function formatCutSceneCaption({claim,event,index=0,total=1}={}){
  const side=s(event?.side).toUpperCase(),base=s(claim?.statement)||`${side||'EVENT'} receipt observed.`;
  const prefix=side==='BUY'?'BUY RECEIPT':side==='SELL'?'SELL RECEIPT':'EVIDENCE RECEIPT';
  return Object.freeze({eyebrow:`SCENE ${Math.max(1,index+1)} / ${Math.max(1,total)} · ${prefix}`,caption:base.length>118?`${base.slice(0,115)}…`:base});
}

export function buildSceneNarration({claim,event,index=0,total=1}={}){
  const side=s(event?.side).toLowerCase(),when=ms(event?.timestamp),time=when?new Date(when).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
  const receipt=short(event?.signature??event?.id,7,5);
  const fact=s(claim?.statement)||`${side?side.toUpperCase():'Event'} receipt observed${time?` at ${time}`:''}${receipt?` · ${receipt}`:''}.`;
  const grey=fact.length>135?`${fact.slice(0,132)}…`:fact;
  const beat=side==='buy'?'selected buy':side==='sell'?'selected sell':'selected receipt';
  const trickster=`Interpretation: the cut slows on this ${beat}; scene ${Math.max(1,index+1)} of ${Math.max(1,total)}. Not a recommendation.`;
  return Object.freeze({grey,trickster});
}

export function buildCutFrameModel({manifest={},candles=[],events=[],sceneIndex=0,progress=0,shareHref='',tokenLabel='',walletLabel=''}={}){
  const scenes=Array.isArray(manifest?.scenes)?manifest.scenes:[],index=clamp(Math.trunc(n(sceneIndex)),0,Math.max(0,scenes.length-1)),scene=scenes[index]??{},claims=sceneClaims(manifest,scene),event=(Array.isArray(events)?events:[])[index]??{},ratio=s(manifest?.output?.aspectRatio)||'9:16',size=cutShareSize(ratio),p=clamp(n(progress),0,1),rows=cutCandleWindow(candles,event?.timestamp),markerIndex=nearestIndex(rows,ms(event?.timestamp)),visibleCount=rows.length?Math.max(1,Math.min(rows.length,Math.ceil(rows.length*clamp(.16+p*1.08,0,1)))):0,metric=headlineMetricFromClaims(claims),caption=formatCutSceneCaption({claim:claims.find(item=>s(item?.kind)==='observed')??claims[0],event,index,total:scenes.length}),narration=buildSceneNarration({claim:claims.find(item=>s(item?.kind)==='observed')??claims[0],event,index,total:scenes.length}),receipt=evidenceMap(manifest).get(s(claims[0]?.evidenceIds?.[0]))??null;
  const chart=Object.freeze({x:Math.round(size.w*.06),y:Math.round(size.h*(ratio==='9:16'?.24:.18)),w:Math.round(size.w*.88),h:Math.round(size.h*(ratio==='9:16'?.43:.50))});
  const template=s(manifest?.presentation?.template)||'proof-mode';
  return Object.freeze({size:Object.freeze(size),ratio,index,sceneId:s(scene?.id)||`scene-${index}`,sceneType:s(scene?.type)||template,template,durationFrames:Math.max(1,Math.trunc(n(scene?.durationFrames)||72)),progress:p,chart,rows:Object.freeze(rows.slice(0,visibleCount)),allRows:rows,markerIndex,markerVisible:markerIndex>=0&&markerIndex<visibleCount,pulse:.45+.55*Math.abs(Math.sin(p*Math.PI*3)),side:s(event?.side).toLowerCase(),eventTimestamp:ms(event?.timestamp),signature:s(event?.signature)||s(receipt?.signature)||null,tokenLabel:s(tokenLabel)||short(manifest?.subject?.id,16,8)||'Selected market',walletLabel:s(walletLabel)||'Public wallet',shareHref:s(shareHref),metric,caption,narration,coverage:s(manifest?.coverage?.statement)||'Currently indexed evidence only.'});
}

export function preferredCutVideoMime(isSupported=()=>false){
  const candidates=['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(const mime of candidates)if(isSupported(mime))return mime;
  return '';
}

export const __tricksterCutVideoContract=Object.freeze({receiptBoundFrames:true,missingOhlcStaysMissing:true,roles:Object.freeze(['grey','trickster']),persistentVerifyWatermark:true,templates:Object.freeze(['galaxy-dive','proof-mode','whale-print','scale-in-story','round-trip','pnl-reveal','minimal-tape']),preferredFps:24,maxCanvasRows:140,fallbackArtifact:'svg'});
