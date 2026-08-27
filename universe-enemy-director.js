/* A Bulls App — Market Enemy Director v0.1 */
(()=>{'use strict';
const state={seen:new Set(),mounted:false};
const U=()=>window.UniverseFlight?.state,E=()=>window.UniverseExperience?.state;
const classes={
  chaser:{label:'CHASER',aggression:1.15,r:11,hp:2,reward:140},
  tank:{label:'TANK',aggression:.42,r:20,hp:6,reward:420},
  sniper:{label:'SNIPER',aggression:.25,r:13,hp:3,reward:260},
  swarm:{label:'SWARM',aggression:1.45,r:8,hp:1,reward:90},
  whale:{label:'WHALE',aggression:.62,r:26,hp:10,reward:900}
};
function choose(e,market){if((e.magnitude||0)>.9)return'whale';if((market.volatility||0)>.72)return'swarm';if(e.side==='sell')return'chaser';if(e.side==='buy'&&(e.magnitude||0)>.65)return'tank';return'sniper'}
function apply(){if(E()?.mode!=='mission')return;const u=U();if(!u?.game)return;for(const e of u.game.enemies){if(state.seen.has(e.id))continue;state.seen.add(e.id);const kind=choose(e,u.market),c=classes[kind];e.class=kind;e.classLabel=c.label;e.aggression=c.aggression;e.r=c.r;e.hp=Math.max(e.hp,c.hp);e.maxHp=Math.max(e.maxHp,c.hp);e.reward=Math.max(e.reward,c.reward);e.phase=Math.random()*Math.PI*2;}}
function behavior(){if(E()?.mode!=='mission')return;const u=U();if(!u?.game)return;for(const e of u.game.enemies){if(e.class==='sniper'){const dx=u.ship.x-e.x,dy=u.ship.y-e.y,d=Math.max(1,Math.hypot(dx,dy));if(d<240){e.vx-=dx/d*5;e.vy-=dy/d*5}else if(d>430){e.vx+=dx/d*2;e.vy+=dy/d*2}}else if(e.class==='swarm'){e.vx+=Math.cos(performance.now()/220+e.phase)*.8;e.vy+=Math.sin(performance.now()/220+e.phase)*.8}else if(e.class==='tank'){e.vx*=.96;e.vy*=.96}else if(e.class==='whale'){e.vx*=.975;e.vy*=.975}}}
function mount(){if(state.mounted)return;state.mounted=true;setInterval(apply,120);setInterval(behavior,40);addEventListener('universeflight:experience',e=>{if(e.detail.mode!=='mission')state.seen.clear()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();window.UniverseEnemyDirector={state,classes};
})();