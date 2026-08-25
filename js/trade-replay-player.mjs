import { createReplayTimeline, TemporalReplayController, replayEffectForEvent } from './temporal-replay-engine.mjs';

function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;}
function finite(value,fallback=null){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
function deterministicUnit(seed){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;}
function simulated(event){return event?.verification==='simulation'||event?.metadata?.scenario==='mirror-source-wallet-timing';}

function normalizeCandles(candles=[]){
  return candles.map((candle,index)=>Object.freeze({
    timestamp:finite(candle.timestamp ?? candle.time ?? (finite(candle.blockTime)!=null?Number(candle.blockTime)*1000:null)),
    open:finite(candle.open),high:finite(candle.high),low:finite(candle.low),close:finite(candle.close),index
  })).filter((candle)=>candle.timestamp!=null&&[candle.open,candle.high,candle.low,candle.close].every((v)=>v!=null)).sort((a,b)=>a.timestamp-b.timestamp||a.index-b.index);
}

export class TradeReplayPlayer {
  #host; #root; #canvas; #ctx; #timeline; #controller; #candles; #raf=0; #lastFrame=0; #effects=[]; #scrub; #speed; #status; #playButton;

  constructor({host,events,candles=[],startTime,endTime,rate=1,label='Trade replay'}={}){
    if(!(host instanceof Element)) throw new TypeError('host element is required');
    this.#host=host;
    this.#timeline=createReplayTimeline({events:events??[],startTime,endTime});
    this.#controller=new TemporalReplayController(this.#timeline,{rate});
    this.#candles=normalizeCandles(candles);
    this.#root=node('section','trade-replay-player');
    this.#root.setAttribute('aria-label',label);
    this.#canvas=document.createElement('canvas');
    this.#canvas.className='trade-replay-canvas';
    this.#canvas.setAttribute('role','img');
    const simulationCount=this.#timeline.events.filter(simulated).length;
    this.#canvas.setAttribute('aria-label',`${label}. ${this.#timeline.eventCount} replay events.${simulationCount?` ${simulationCount} are explicitly simulated.`:''}`);
    this.#buildControls();
    this.#root.prepend(this.#canvas);
    this.#host.replaceChildren(this.#root);
    this.#resize();
    this.#render();
    const ResizeObserverCtor=globalThis.ResizeObserver;
    if(ResizeObserverCtor){this.resizeObserver=new ResizeObserverCtor(()=>{this.#resize();this.#render();});this.resizeObserver.observe(this.#root);}
  }

  #buildControls(){
    const controls=node('div','trade-replay-controls');
    const prev=node('button','secondary','← EVENT'); prev.type='button'; prev.setAttribute('aria-label','Previous event');
    this.#playButton=node('button','primary','PLAY'); this.#playButton.type='button';
    const next=node('button','secondary','EVENT →'); next.type='button'; next.setAttribute('aria-label','Next event');
    this.#speed=node('select','trade-replay-speed'); this.#speed.setAttribute('aria-label','Playback speed');
    for(const rate of this.#timeline.allowedRates){const option=document.createElement('option');option.value=String(rate);option.textContent=`${rate}×`;if(rate===this.#controller.snapshot().rate)option.selected=true;this.#speed.append(option);}
    this.#scrub=document.createElement('input'); this.#scrub.type='range'; this.#scrub.min='0'; this.#scrub.max='1000'; this.#scrub.value='0'; this.#scrub.className='trade-replay-scrub'; this.#scrub.setAttribute('aria-label','Replay timeline');
    this.#status=node('output','trade-replay-status','0%');
    prev.addEventListener('click',()=>{this.#controller.pause();this.#controller.stepEvent(-1);this.#syncControls();this.#render();});
    next.addEventListener('click',()=>{this.#controller.pause();this.#controller.stepEvent(1);this.#syncControls();this.#render();});
    this.#playButton.addEventListener('click',()=>{const state=this.#controller.snapshot();if(state.atEnd)this.#controller.seekMs(0);state.playing?this.pause():this.play();});
    this.#speed.addEventListener('change',()=>{this.#controller.setRate(Number(this.#speed.value));this.#syncControls();});
    this.#scrub.addEventListener('input',()=>{this.#controller.pause();this.#controller.seekProgress(Number(this.#scrub.value)/1000);this.#effects=[];this.#syncControls();this.#render();});
    controls.append(prev,this.#playButton,next,this.#speed,this.#scrub,this.#status);
    this.#root.append(controls);
  }

  play(){this.#controller.play();this.#lastFrame=performance.now();this.#syncControls();cancelAnimationFrame(this.#raf);this.#raf=requestAnimationFrame((now)=>this.#animate(now));}
  pause(){this.#controller.pause();cancelAnimationFrame(this.#raf);this.#raf=0;this.#syncControls();this.#render();}

  #animate(now){
    const delta=Math.min(250,Math.max(0,now-this.#lastFrame)); this.#lastFrame=now;
    const result=this.#controller.tick(delta);
    for(const event of result.events){this.#effects.push({event,effect:replayEffectForEvent(event),born:now});}
    this.#effects=this.#effects.filter((item)=>now-item.born<520);
    this.#syncControls(); this.#render(now);
    if(result.snapshot.playing||this.#effects.length)this.#raf=requestAnimationFrame((time)=>this.#animate(time));else this.#raf=0;
  }

  #syncControls(){
    const state=this.#controller.snapshot();
    this.#playButton.textContent=state.playing?'PAUSE':state.atEnd?'REPLAY':'PLAY';
    this.#scrub.value=String(Math.round(state.progress*1000));
    const date=new Date(state.chainTime);
    this.#status.textContent=`${Math.round(state.progress*100)}% · ${state.rate}× · ${date.toLocaleString()}`;
  }

  #resize(){
    const ratio=Math.min(2,Math.max(1,globalThis.devicePixelRatio||1));
    const width=Math.max(300,Math.floor(this.#root.clientWidth||640));
    const height=Math.max(230,Math.min(420,Math.round(width*0.52)));
    this.#canvas.width=Math.round(width*ratio);this.#canvas.height=Math.round(height*ratio);
    this.#canvas.style.width=`${width}px`;this.#canvas.style.height=`${height}px`;
    this.#ctx=this.#canvas.getContext('2d');this.#ctx.setTransform(ratio,0,0,ratio,0,0);
  }

  #priceBounds(){
    const values=[];
    for(const candle of this.#candles) values.push(candle.low,candle.high);
    for(const event of this.#timeline.events) if(event.price!=null) values.push(event.price);
    if(!values.length)return null;
    let min=Math.min(...values),max=Math.max(...values);if(min===max){const pad=Math.max(1,Math.abs(min)*0.01);min-=pad;max+=pad;}return {min,max};
  }

  #xy(timestamp,price,bounds,width,height,pad){
    const tx=this.#timeline.durationMs===0?0:(timestamp-this.#timeline.startTime)/this.#timeline.durationMs;
    const py=(price-bounds.min)/(bounds.max-bounds.min);
    return {x:pad+clamp(tx,0,1)*(width-pad*2),y:height-pad-clamp(py,0,1)*(height-pad*2)};
  }

  #render(now=performance.now()){
    const ctx=this.#ctx;if(!ctx)return;
    const width=parseFloat(this.#canvas.style.width)||640,height=parseFloat(this.#canvas.style.height)||320,pad=28;
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#090a0f';ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;
    for(let i=1;i<5;i++){const y=(height/5)*i;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(width-pad,y);ctx.stroke();}
    const bounds=this.#priceBounds();
    if(!bounds){ctx.fillStyle='rgba(255,255,255,.65)';ctx.font='14px system-ui';ctx.fillText('No price series available — replaying verified events only.',pad,50);}
    if(bounds&&this.#candles.length){
      const visible=this.#candles.filter((c)=>c.timestamp>=this.#timeline.startTime&&c.timestamp<=this.#timeline.endTime);
      const barWidth=Math.max(2,Math.min(12,(width-pad*2)/Math.max(1,visible.length)*0.62));
      for(const candle of visible){
        const high=this.#xy(candle.timestamp,candle.high,bounds,width,height,pad),low=this.#xy(candle.timestamp,candle.low,bounds,width,height,pad),open=this.#xy(candle.timestamp,candle.open,bounds,width,height,pad),close=this.#xy(candle.timestamp,candle.close,bounds,width,height,pad);
        const up=candle.close>=candle.open;ctx.strokeStyle=up?'rgba(89,239,166,.82)':'rgba(255,122,131,.82)';ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.moveTo(high.x,high.y);ctx.lineTo(low.x,low.y);ctx.stroke();ctx.fillRect(open.x-barWidth/2,Math.min(open.y,close.y),barWidth,Math.max(1,Math.abs(close.y-open.y)));
      }
    }
    const state=this.#controller.snapshot();const playX=pad+state.progress*(width-pad*2);ctx.strokeStyle='rgba(215,208,197,.72)';ctx.beginPath();ctx.moveTo(playX,pad);ctx.lineTo(playX,height-pad);ctx.stroke();
    const seen=this.#timeline.events.filter((event)=>event.timestamp<=state.chainTime);
    for(const event of seen){
      if(!bounds||event.price==null)continue;
      const p=this.#xy(event.timestamp,event.price,bounds,width,height,pad);
      const color=event.side==='buy'?'#59efa6':event.side==='sell'?'#ff7a83':'#d7d0c5';
      if(simulated(event)){
        ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.stroke();ctx.restore();
      }else{
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fill();
      }
    }
    for(const item of this.#effects){
      if(!bounds||item.event.price==null)continue;
      const p=this.#xy(item.event.timestamp,item.event.price,bounds,width,height,pad);const age=clamp((now-item.born)/520,0,1),alpha=1-age,intensity=item.effect.intensity;
      ctx.save();ctx.globalAlpha=simulated(item.event)?alpha*.62:alpha;ctx.strokeStyle=item.effect.hue==='green'?'#59efa6':item.effect.hue==='red'?'#ff5f6d':'#d7d0c5';ctx.lineWidth=1+3*intensity;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=10+26*intensity;if(simulated(item.event))ctx.setLineDash([5,4]);ctx.beginPath();let x=p.x,y=8;ctx.moveTo(x,y);const segments=6;for(let i=1;i<=segments;i++){y=8+(p.y-8)*(i/segments);const jitter=deterministicUnit(`${item.event.id}:${i}`)-0.5;x=p.x+(i===segments?0:jitter*18*intensity);ctx.lineTo(x,y);}ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,7+18*intensity*(1-age),0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }

  destroy(){this.pause();this.resizeObserver?.disconnect();this.#root.remove();}
}