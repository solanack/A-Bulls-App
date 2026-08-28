export function mountParticleFieldFallback(host,{count=900}={}){
  if(!(host instanceof Element))throw new TypeError('host element is required');
  const canvas=document.createElement('canvas');
  canvas.className='particle-field-fallback-canvas';
  canvas.setAttribute('aria-label','Particle Field fallback visualization');
  host.replaceChildren(canvas);
  const ctx=canvas.getContext('2d',{alpha:false});
  let raf=0,last=0,w=1,h=1,dpr=1;
  let seed=861;
  const rnd=()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
  const particles=Array.from({length:Math.max(250,Math.min(2500,count))},(_,i)=>({x:rnd(),y:rnd(),z:.18+rnd()*.82,r:.45+rnd()*1.7,a:.22+rnd()*.72,h:i%6,v:.003+rnd()*.008}));
  const resize=()=>{const rect=host.getBoundingClientRect();w=Math.max(1,rect.width);h=Math.max(1,rect.height);dpr=Math.min(2,globalThis.devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;ctx.setTransform(dpr,0,0,dpr,0,0);};
  const palette=['#7d5cff','#35d9f4','#ff55a7','#57ff9c','#ffd05e','#ff5c6c'];
  const frame=now=>{const dt=Math.min(40,Math.max(0,now-last||16));last=now;ctx.fillStyle='#030307';ctx.fillRect(0,0,w,h);const glow=ctx.createRadialGradient(w*.5,h*.48,0,w*.5,h*.48,Math.max(w,h)*.62);glow.addColorStop(0,'rgba(77,52,135,.18)');glow.addColorStop(.5,'rgba(16,14,34,.09)');glow.addColorStop(1,'rgba(3,3,7,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);for(const p of particles){p.y-=p.v*dt*.018*p.z;if(p.y<-.03){p.y=1.03;p.x=rnd();}const px=(p.x-.5)*w*(.7+p.z*.5)+w*.5,py=(p.y-.5)*h*(.7+p.z*.5)+h*.5,r=p.r*(.7+p.z*1.5);ctx.globalAlpha=p.a;ctx.fillStyle=palette[p.h];ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;raf=requestAnimationFrame(frame);};
  resize();globalThis.addEventListener('resize',resize);raf=requestAnimationFrame(frame);
  return Object.freeze({canvas,destroy(){cancelAnimationFrame(raf);globalThis.removeEventListener('resize',resize);canvas.remove();}});
}
