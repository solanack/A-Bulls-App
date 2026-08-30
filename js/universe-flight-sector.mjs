const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function hash(value){let h=2166136261;for(const c of s(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){return()=>{seed=seed+0x6D2B79F5|0;let value=Math.imul(seed^seed>>>15,1|seed);value=value+Math.imul(value^value>>>7,61|value)^value;return((value^value>>>14)>>>0)/4294967296;};}
function kindWeight(kind){return kind==='wallet'?1:kind==='token'?.9:kind==='transaction'?.65:kind==='nft'?.8:.55;}
function colorClass(item={}){const category=s(item.category).toLowerCase();if(category==='swap')return item.side==='sell'?'sell':'trade';if(category==='nft')return'nft';if(category==='transfer')return'transfer';return'program';}

export function projectionToFlightSector(items=[],options={}){
  const rows=Array.isArray(items)?items.slice(0,1000):[];
  const seed=s(options.seed||options.subjectId||'solana');
  const R=rng(hash(seed));
  const radius=Math.max(500,Math.min(5000,n(options.radius)||1800));
  const byId=new Map();
  for(const row of rows){
    const id=s(row.entityId||row.id);if(!id)continue;
    const old=byId.get(id);
    if(!old||n(row.magnitudeBand)>n(old.magnitudeBand))byId.set(id,row);
  }
  const particles=[];
  let buys=0,sells=0,swaps=0,totalMagnitude=0;
  for(const row of byId.values()){
    const angle=R()*Math.PI*2,dist=Math.sqrt(R())*radius;
    const kind=s(row.entityKind||row.kind)||'unknown',mag=clamp(n(row.magnitudeBand)||.12,.05,1);
    const p={id:s(row.entityId||row.id),entityKind:kind,category:s(row.category),x:Math.cos(angle)*dist,y:Math.sin(angle)*dist,r:2+mag*8*kindWeight(kind),magnitude:mag,observedAt:n(row.observedAt),verification:s(row.commitment||row.verificationState),evidence:row.evidence||null,colorClass:colorClass(row)};
    particles.push(p);totalMagnitude+=mag;
    if(s(row.category)==='swap'){swaps++;if(s(row.side)==='buy')buys++;else if(s(row.side)==='sell')sells++;}
  }
  const obstacles=particles.filter(p=>p.entityKind==='transaction'||p.category==='program').slice(0,120).map((p,i)=>({id:`encounter:${p.id}:${i}`,x:p.x,y:p.y,r:14+p.magnitude*34,hp:1+Math.floor(p.magnitude*3),evidenceId:p.id,entityKind:p.entityKind}));
  const buyPressure=swaps?buys/Math.max(1,buys+sells):.5;
  const market={volatility:clamp((totalMagnitude/Math.max(1,particles.length))*.9,0,1),buyPressure:clamp(buyPressure,0,1),volume:clamp(particles.length/300,0,1)};
  return Object.freeze({schemaVersion:'universe-flight-sector-v1',seed,particles:Object.freeze(particles),obstacles:Object.freeze(obstacles),market:Object.freeze(market),coverage:options.coverage||null,sourceCount:rows.length,entityCount:particles.length});
}

export function replayToFlightTimeline(bundle={}){
  const events=Array.isArray(bundle.events)?bundle.events:[];
  return Object.freeze(events.slice(0,1500).map((event,index)=>Object.freeze({
    id:s(event.id||event.signature||index),timestamp:n(event.timestamp),signature:s(event.signature)||null,wallet:s(event.wallet)||null,token:s(event.token)||null,kind:s(event.kind),side:s(event.side),magnitude:clamp(Math.log10(1+Math.abs(n(event.tokenDelta)||n(event.solDelta)))/6,.08,1),verification:s(event.verification),sources:Object.freeze([...(event.sources||[])]),raw:event
  })).filter(event=>event.timestamp>0));
}

export function flightMarketStateFromReplay(bundle={}){
  const a=bundle.activity||{},events=Array.isArray(bundle.events)?bundle.events:[];
  const trades=events.filter(e=>s(e.kind)==='trade'),buys=trades.filter(e=>s(e.side)==='buy').length,sells=trades.filter(e=>s(e.side)==='sell').length;
  const pressure=(buys+sells)?buys/(buys+sells):.5;
  return Object.freeze({volume:clamp(n(a.totalEvents)/750,0,1),buyPressure:clamp(pressure,0,1),volatility:clamp(events.reduce((sum,e)=>sum+Math.min(1,Math.abs(n(e.tokenDelta)||n(e.solDelta))/1000),0)/Math.max(1,events.length),0,1)});
}

export const __universeFlightSectorContract=Object.freeze({boundedProjectionItems:1000,boundedReplayEvents:1500,noNetworkCalls:true,observedDataOnly:true});
