const SVG_NS='http://www.w3.org/2000/svg';
const speech=text=>{try{globalThis.speechSynthesis?.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.82;u.pitch=.72;u.volume=.88;globalThis.speechSynthesis?.speak(u);}catch{}};
function targetPoint(i,n){const a=(i/n)*Math.PI*2,r=Math.sqrt((i+.5)/n),eye=Math.sin(a*2)*.08;return{x:50+Math.cos(a)*31*r*(1-r*.18),y:47+Math.sin(a)*40*r+eye,z:(i%17)/17};}
function isEye(x,y){const l=((x-37)/11)**2+((y-42)/6.8)**2<1,r=((x-63)/11)**2+((y-42)/6.8)**2<1;return l||r;}
function isFace(x,y){const head=((x-50)/31)**2+((y-46)/40)**2<1;const jaw=y>58?Math.abs(x-50)<(26-(y-58)*.72):true;return head&&jaw&&!isEye(x,y);}
export function installQueryAlienAttachment({shell,onQuery}={}){
 const root=shell?.root;if(!(root instanceof Element))return Object.freeze({destroy(){}});
 const overlay=document.createElement('section');overlay.className='query-alien';overlay.hidden=true;overlay.innerHTML='<div class="query-alien__veil"></div><svg class="query-alien__face" viewBox="0 0 100 100" aria-label="Living blockchain query face"></svg><div class="query-alien__speech"><strong>ENTER YOUR QUERY.</strong><span>I will search the chain and reveal what I find.</span></div><form class="query-alien__form"><input aria-label="Blockchain query" placeholder="Enter wallet address, token mint, tx signature, NFT, or anything…"><button type="submit">ENTER</button><button type="button" data-query-close>RETURN TO FIELD</button></form>';
 root.append(overlay);const svg=overlay.querySelector('svg'),form=overlay.querySelector('form'),input=overlay.querySelector('input');
 const particles=[];for(let i=0;i<900;i++){let p=targetPoint(i,900),tries=0;while(!isFace(p.x,p.y)&&tries++<18)p=targetPoint((i+tries*43)%900,900);if(!isFace(p.x,p.y))continue;const c=document.createElementNS(SVG_NS,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',String(.12+(i%7)*.035));c.style.setProperty('--orbit-x',`${((i%9)-4)*.09}px`);c.style.setProperty('--orbit-y',`${((i%11)-5)*.08}px`);c.style.setProperty('--delay',`${-(i%53)*.073}s`);c.dataset.band=String(i%6);svg.append(c);particles.push(c);}
 const mouth=document.createElementNS(SVG_NS,'path');mouth.setAttribute('d','M40 69 Q50 74 60 69 Q50 78 40 69');mouth.setAttribute('class','query-alien__mouth');svg.append(mouth);
 function open(){overlay.hidden=false;root.classList.add('field-shell--query-alien');requestAnimationFrame(()=>overlay.classList.add('active'));setTimeout(()=>{speech('Enter your query');input.focus();},700);}
 function close(){globalThis.speechSynthesis?.cancel?.();overlay.classList.remove('active');root.classList.remove('field-shell--query-alien');setTimeout(()=>{overlay.hidden=true;},650);}
 form.addEventListener('submit',e=>{e.preventDefault();const value=input.value.trim();if(!value)return;speech('Searching the chain');onQuery?.(value);close();});overlay.querySelector('[data-query-close]').addEventListener('click',close);
 return Object.freeze({open,close,destroy(){globalThis.speechSynthesis?.cancel?.();overlay.remove();root.classList.remove('field-shell--query-alien');}});
}
