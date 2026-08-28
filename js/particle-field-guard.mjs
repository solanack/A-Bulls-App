import { mountParticleFieldFallback } from './particle-field-fallback.mjs';
let fallback=null;
function ensureField(){
  const stage=document.querySelector('.universe-stage');
  if(!(stage instanceof Element))return false;
  const liveCanvas=stage.querySelector('canvas.universe-canvas');
  if(liveCanvas){fallback?.destroy?.();fallback=null;return true;}
  if(!fallback)fallback=mountParticleFieldFallback(stage,{count:1200});
  return true;
}
function boot(){let tries=0;const timer=setInterval(()=>{tries+=1;if(ensureField()||tries>20)clearInterval(timer);},250);globalThis.addEventListener('abulls:field-return',()=>setTimeout(ensureField,50));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
