import { synthesizeCutNarration, type AlienVoiceDelivery, type NarrationRole } from "@/lib/alien-voice";
import { buildCutFrameModel, preferredCutVideoMime } from "../../js/trickster-cut-video.mjs";

type Data=Record<string,unknown>;
type Progress=(value:number,label:string)=>void;
type CutVideoResult={blob:Blob;mimeType:string;extension:"mp4"|"webm";narrationAvailable:boolean};
type VoiceClip={role:NarrationRole;buffer:AudioBuffer|null};
type PreparedScene={duration:number;grey:VoiceClip;trickster:VoiceClip};

const text=(value:unknown)=>value==null?"":String(value);
const num=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0;
const arr=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const obj=(value:unknown):Data=>value&&typeof value==="object"&&!Array.isArray(value)?value as Data:{};
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const sleep=(ms:number)=>new Promise<void>(resolve=>globalThis.setTimeout(resolve,ms));

export function tricksterCutCaptureSupported(){
  const doc=globalThis.document,Recorder=globalThis.MediaRecorder;
  if(!doc||typeof Recorder!=="function")return false;
  const canvas=doc.createElement("canvas") as HTMLCanvasElement&{captureStream?:(fps?:number)=>MediaStream};
  return typeof canvas.captureStream==="function";
}

function base64Bytes(value:string){
  const raw=globalThis.atob(value),bytes=new Uint8Array(raw.length);
  for(let index=0;index<raw.length;index++)bytes[index]=raw.charCodeAt(index);
  return bytes;
}

async function decodeDelivery(context:AudioContext,delivery:AlienVoiceDelivery):Promise<AudioBuffer|null>{
  if(!delivery.ok||!delivery.audioBase64)return null;
  try{
    const bytes=base64Bytes(delivery.audioBase64),copy=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
    return await context.decodeAudioData(copy);
  }catch{return null;}
}

async function prepareVoice(context:AudioContext,line:string,role:NarrationRole):Promise<VoiceClip>{
  if(!line.trim())return{role,buffer:null};
  try{
    const delivery=await synthesizeCutNarration({data:{text:line,role}});
    return{role,buffer:await decodeDelivery(context,delivery)};
  }catch{return{role,buffer:null};}
}

function sceneNarration(manifest:Data,events:Data[],index:number){
  return obj(obj(buildCutFrameModel({manifest,events,sceneIndex:index,progress:0})).narration);
}

async function prepareScenes(context:AudioContext,manifest:Data,events:Data[],fps:number,onProgress:Progress):Promise<PreparedScene[]>{
  const scenes=arr(manifest.scenes),prepared:PreparedScene[]=[];
  for(let index=0;index<scenes.length;index++){
    const scene=obj(scenes[index]),narration=sceneNarration(manifest,events,index),nominal=Math.max(1,num(scene.durationFrames))/fps;
    onProgress(.04+.18*(index/Math.max(1,scenes.length)),`Preparing narration ${index+1}/${scenes.length}`);
    const grey=await prepareVoice(context,text(narration.grey),"grey");
    const trickster=await prepareVoice(context,text(narration.trickster),"trickster");
    const voiceSeconds=(grey.buffer?.duration??0)+(trickster.buffer?.duration??0)+.55;
    prepared.push({duration:Math.max(nominal,voiceSeconds,2.5),grey,trickster});
  }
  return prepared;
}

function roundedRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));
}
function fitText(ctx:CanvasRenderingContext2D,value:string,maxWidth:number,start:number,min:number){
  let size=start;
  while(size>min){ctx.font=`700 ${size}px system-ui,sans-serif`;if(ctx.measureText(value).width<=maxWidth)break;size-=2;}
  return size;
}
function wrapLines(ctx:CanvasRenderingContext2D,value:string,maxWidth:number,maxLines=2){
  const words=value.split(/\s+/).filter(Boolean),lines:string[]=[];let line="";
  for(const word of words){
    const next=line?`${line} ${word}`:word;
    if(ctx.measureText(next).width<=maxWidth){line=next;continue;}
    if(line)lines.push(line);line=word;if(lines.length>=maxLines-1)break;
  }
  if(line&&lines.length<maxLines)lines.push(line);
  return lines;
}

function drawCinematicFrame(ctx:CanvasRenderingContext2D,model:Data,role:NarrationRole){
  const size=obj(model.size),w=num(size.w),h=num(size.h),chart=obj(model.chart),progress=clamp(num(model.progress),0,1),side=text(model.side).toLowerCase(),rows=arr(model.rows).map(obj),allRows=arr(model.allRows).map(obj),buy=side==="buy",sell=side==="sell",accent=buy?"#65f4d2":sell?"#ff7a6a":"#8ee9ff";
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,"#03040a");bg.addColorStop(.55,"#080713");bg.addColorStop(1,"#020309");ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const halo=ctx.createRadialGradient(w*.75,h*.12,10,w*.75,h*.12,w*.7);halo.addColorStop(0,buy?"rgba(70,239,190,.16)":sell?"rgba(255,91,130,.16)":"rgba(120,105,255,.18)");halo.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=halo;ctx.fillRect(0,0,w,h*.7);

  ctx.fillStyle="#65f4d2";ctx.font=`800 ${Math.round(w*.024)}px ui-monospace,monospace`;ctx.fillText("A BULLS APP · INDEXED CUT",w*.06,h*.06);
  ctx.fillStyle="#f5f8ff";const token=text(model.tokenLabel)||"Selected market",titleSize=fitText(ctx,token,w*.86,Math.round(w*.066),32);ctx.font=`750 ${titleSize}px system-ui,sans-serif`;ctx.fillText(token,w*.06,h*.12);

  const metric=obj(model.metric);
  if(text(metric.display)){
    const target=num(metric.value),shown=target*clamp(progress/.72,0,1),sign=shown>0?"+":"";
    ctx.fillStyle=accent;ctx.font=`800 ${Math.round(w*.09)}px system-ui,sans-serif`;ctx.fillText(`${sign}${shown.toFixed(2)}%`,w*.06,h*.205);
    ctx.fillStyle="#9ab0c2";ctx.font=`700 ${Math.round(w*.022)}px ui-monospace,monospace`;ctx.fillText(text(metric.label),w*.065,h*.235);
  }

  ctx.fillStyle="rgba(3,5,12,.74)";roundedRect(ctx,num(chart.x),num(chart.y),num(chart.w),num(chart.h),24);ctx.fill();ctx.strokeStyle="rgba(142,233,255,.22)";ctx.lineWidth=2;ctx.stroke();
  if(!allRows.length){
    ctx.textAlign="center";ctx.fillStyle="#d8e1ec";ctx.font=`700 ${Math.round(w*.032)}px system-ui,sans-serif`;ctx.fillText("NO INDEXED OHLC · RECEIPT TIMELINE ONLY",w/2,num(chart.y)+num(chart.h)*.48);ctx.fillStyle="#8395a8";ctx.font=`600 ${Math.round(w*.021)}px ui-monospace,monospace`;ctx.fillText("NO PRICE PATH WAS INVENTED",w/2,num(chart.y)+num(chart.h)*.56);ctx.textAlign="left";
  }else{
    const highs=allRows.map(row=>num(row.high)),lows=allRows.map(row=>num(row.low)),high=Math.max(...highs),low=Math.min(...lows),range=Math.max(Number.EPSILON,high-low),cw=num(chart.w),ch=num(chart.h),cx=num(chart.x),cy=num(chart.y),padX=cw*.035,padY=ch*.09;
    const x=(index:number)=>cx+padX+index*((cw-padX*2)/Math.max(1,allRows.length-1));
    const y=(value:number)=>cy+padY+(1-(value-low)/range)*(ch-padY*2);
    ctx.lineWidth=Math.max(1,w/700);
    for(let index=0;index<rows.length;index++){
      const row=rows[index],up=num(row.close)>=num(row.open),color=up?"#42efbd":"#ff5b82",px=x(index);ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(px,y(num(row.high)));ctx.lineTo(px,y(num(row.low)));ctx.stroke();ctx.fillStyle=color;const top=Math.min(y(num(row.open)),y(num(row.close))),body=Math.max(2,Math.abs(y(num(row.open))-y(num(row.close))));ctx.fillRect(px-3,top,6,body);
    }
    if(Boolean(model.markerVisible)){
      const marker=Math.trunc(num(model.markerIndex)),px=x(marker),row=allRows[marker],py=row?y(num(row.close)):cy+ch*.5,pulse=num(model.pulse);ctx.strokeStyle=accent;ctx.lineWidth=4;ctx.globalAlpha=.55+.4*pulse;ctx.beginPath();ctx.arc(px,py,18+28*pulse,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=accent;ctx.beginPath();ctx.arc(px,py,9,0,Math.PI*2);ctx.fill();
    }
  }

  const caption=obj(model.caption),captionAlpha=clamp((progress-.1)/.22,0,1);ctx.globalAlpha=captionAlpha;ctx.fillStyle="rgba(6,8,15,.88)";roundedRect(ctx,w*.055,h*.70,w*.89,h*.145,22);ctx.fill();ctx.strokeStyle="rgba(142,233,255,.18)";ctx.stroke();ctx.fillStyle=accent;ctx.font=`800 ${Math.round(w*.021)}px ui-monospace,monospace`;ctx.fillText(text(caption.eyebrow),w*.08,h*.735);ctx.fillStyle="#f5f8ff";ctx.font=`700 ${Math.round(w*.032)}px system-ui,sans-serif`;wrapLines(ctx,text(caption.caption),w*.82,2).forEach((line,index)=>ctx.fillText(line,w*.08,h*(.775+index*.033)));ctx.globalAlpha=1;

  ctx.fillStyle="rgba(5,7,13,.93)";ctx.fillRect(0,h*.87,w,h*.13);ctx.fillStyle=role==="grey"?"#8ee9ff":"#d5a8ff";ctx.font=`800 ${Math.round(w*.021)}px ui-monospace,monospace`;ctx.fillText(role==="grey"?"GREY · OBSERVED FACT":"TRICKSTER · INTERPRETATION",w*.06,h*.907);ctx.fillStyle="#d7e0ea";ctx.font=`600 ${Math.round(w*.019)}px system-ui,sans-serif`;const narration=obj(model.narration),roleLine=text(narration[role]);wrapLines(ctx,roleLine,w*.86,2).forEach((line,index)=>ctx.fillText(line,w*.06,h*(.938+index*.026)));
  ctx.fillStyle="#93a8ba";ctx.font=`600 ${Math.round(w*.016)}px ui-monospace,monospace`;ctx.fillText(`${text(model.walletLabel)} · ${text(model.signature)||"signature unavailable"}`,w*.06,h*.982);
  ctx.textAlign="right";ctx.fillStyle="#65f4d2";ctx.font=`800 ${Math.round(w*.015)}px ui-monospace,monospace`;ctx.fillText(`VERIFY ${text(model.shareHref)||"link unavailable"}`,w*.94,h*.06);ctx.textAlign="left";
}

function connectVoice(context:AudioContext,destination:MediaStreamAudioDestinationNode,buffer:AudioBuffer,start:number,available:number){
  const source=context.createBufferSource(),gain=context.createGain(),rate=buffer.duration>available&&available>0?clamp(buffer.duration/available,1,1.35):1;source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=.95;source.connect(gain).connect(destination);source.start(start);return buffer.duration/rate;
}
function scheduleImpact(context:AudioContext,destination:MediaStreamAudioDestinationNode,start:number,side:string){
  if(side!=="buy"&&side!=="sell")return;
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type="sine";oscillator.frequency.setValueAtTime(side==="sell"?260:420,start);oscillator.frequency.exponentialRampToValueAtTime(side==="sell"?110:760,start+.18);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.08,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+.28);oscillator.connect(gain).connect(destination);oscillator.start(start);oscillator.stop(start+.3);
}
function scheduleBed(context:AudioContext,destination:MediaStreamAudioDestinationNode,start:number,duration:number){
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type="sine";oscillator.frequency.value=55;gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(.012,start+.25);gain.gain.setValueAtTime(.012,Math.max(start+.25,start+duration-.3));gain.gain.linearRampToValueAtTime(.0001,start+duration);oscillator.connect(gain).connect(destination);oscillator.start(start);oscillator.stop(start+duration+.02);
}

export async function recordTricksterCut({manifest,candles,events,shareHref,tokenLabel,walletLabel,soundBed=true,onProgress=()=>{}}:{manifest:Data;candles:Data[];events:Data[];shareHref:string;tokenLabel:string;walletLabel:string;soundBed?:boolean;onProgress?:Progress}):Promise<CutVideoResult>{
  if(!tricksterCutCaptureSupported())throw Object.assign(new Error("cut_capture_unsupported"),{code:"cut_capture_unsupported"});
  const scenes=arr(manifest.scenes);if(!scenes.length)throw new Error("cut_scenes_unavailable");
  const first=obj(buildCutFrameModel({manifest,candles,events,sceneIndex:0,progress:0,shareHref,tokenLabel,walletLabel})),size=obj(first.size),canvas=document.createElement("canvas") as HTMLCanvasElement&{captureStream:(fps?:number)=>MediaStream};
  canvas.width=Math.max(1,Math.trunc(num(size.w)));canvas.height=Math.max(1,Math.trunc(num(size.h)));
  const ctx=canvas.getContext("2d",{alpha:false});if(!ctx)throw new Error("cut_canvas_unavailable");
  const root=globalThis as typeof globalThis&{webkitAudioContext?:typeof AudioContext},AudioCtor=root.AudioContext??root.webkitAudioContext;
  if(!AudioCtor)throw new Error("cut_audio_context_unavailable");
  const audioContext=new AudioCtor(),destination=audioContext.createMediaStreamDestination();await audioContext.resume();
  onProgress(.02,"Preparing Cut audio");
  const fps=24,prepared=await prepareScenes(audioContext,manifest,events,fps,onProgress),totalDuration=prepared.reduce((sum,item)=>sum+item.duration,0),videoStream=canvas.captureStream(fps),combined=new MediaStream([...videoStream.getVideoTracks(),...destination.stream.getAudioTracks()]);
  const mimeType=preferredCutVideoMime(value=>typeof MediaRecorder.isTypeSupported==="function"&&MediaRecorder.isTypeSupported(value));
  if(!mimeType){combined.getTracks().forEach(track=>track.stop());await audioContext.close();throw Object.assign(new Error("cut_capture_format_unsupported"),{code:"cut_capture_format_unsupported"});}

  const recorder=new MediaRecorder(combined,{mimeType,videoBitsPerSecond:6_000_000,audioBitsPerSecond:128_000});
  const chunks:Blob[]=[];
  recorder.addEventListener("dataavailable",event=>{if(event.data.size)chunks.push(event.data);});
  const stopped=new Promise<void>((resolve,reject)=>{
    recorder.addEventListener("stop",()=>resolve(),{once:true});
    recorder.addEventListener("error",event=>reject((event as ErrorEvent).error??new Error("cut_recording_failed")),{once:true});
  });

  recorder.start(1000);
  const audioStart=audioContext.currentTime+.12;let offset=0;
  for(let index=0;index<prepared.length;index++){
    const item=prepared[index],event=obj(events[index]),sceneStart=audioStart+offset;
    if(soundBed)scheduleBed(audioContext,destination,sceneStart,item.duration);
    scheduleImpact(audioContext,destination,sceneStart+.08,text(event.side).toLowerCase());
    const available=Math.max(.5,item.duration-.45),greyDuration=item.grey.buffer?connectVoice(audioContext,destination,item.grey.buffer,sceneStart+.18,available*.56):0;
    if(item.trickster.buffer)connectVoice(audioContext,destination,item.trickster.buffer,sceneStart+.3+greyDuration,Math.max(.45,available-greyDuration));
    offset+=item.duration;
  }

  const wallStart=performance.now()+120,sceneOffsets:number[]=[];let running=0;
  for(const item of prepared){sceneOffsets.push(running);running+=item.duration;}
  await new Promise<void>(resolve=>{
    const draw=(now:number)=>{
      const elapsed=Math.max(0,(now-wallStart)/1000);let index=prepared.length-1;
      for(let i=0;i<prepared.length;i++){if(elapsed<sceneOffsets[i]+prepared[i].duration){index=i;break;}}
      const local=clamp((elapsed-sceneOffsets[index])/prepared[index].duration,0,1),role:NarrationRole=local<.56?"grey":"trickster",model=obj(buildCutFrameModel({manifest,candles,events,sceneIndex:index,progress:local,shareHref,tokenLabel,walletLabel}));
      drawCinematicFrame(ctx,model,role);onProgress(.24+.72*clamp(elapsed/Math.max(.1,totalDuration),0,1),`Encoding scene ${index+1}/${prepared.length}`);
      if(elapsed>=totalDuration){resolve();return;}requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });

  if(recorder.state!=="inactive")recorder.stop();
  await stopped;await sleep(40);combined.getTracks().forEach(track=>track.stop());await audioContext.close();
  const blob=new Blob(chunks,{type:mimeType});
  const extension:"mp4"|"webm"=mimeType.startsWith("video/mp4")?"mp4":"webm";
  if(!blob.size)throw new Error("cut_recording_empty");
  onProgress(1,"Cut ready");
  return{blob,mimeType,extension,narrationAvailable:prepared.some(item=>Boolean(item.grey.buffer||item.trickster.buffer))};
}
