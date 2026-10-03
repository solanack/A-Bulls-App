import type { FieldParticle, GalaxyDefinition, ParticleCategory, UniverseSnapshot } from "./types";
import { mulberry } from "./hash.ts";
import { cosmicKindForEntity, getGalaxy, preserveLaunchOrigin } from "./galaxies.ts";

const KINDS=["transaction","wallet","program","token","nft","cluster"] as const;
const STATES=["observed","confirmed","finalized","verified"] as const;
const CATEGORIES:ParticleCategory[]=["swap","transfer","nft","staking","program","failure"];

export function createSyntheticUniverse(count=2800,seed=861):UniverseSnapshot{return createGalaxySnapshot(getGalaxy("galaxy-zero"),count,seed);}
function decorativeGalaxy(galaxy:GalaxyDefinition,count:number,seed:number):UniverseSnapshot{
  const random=mulberry(seed),bounded=Math.max(400,Math.min(16000,Math.trunc(count))),particles:FieldParticle[]=Array.from({length:bounded},(_,index)=>{const radius=18+random()*82,angle=random()*Math.PI*2;return{id:`${galaxy.id}:dust:${index}`,kind:"expanse",cosmicKind:"dust",originGalaxyId:galaxy.id,verificationState:"decorative",observedAt:1_000_000,category:"unknown",magnitudeBand:.08+random()*.24,position:[Math.cos(angle)*radius,(random()-.5)*52,Math.sin(angle)*radius],source:"a-bulls-galaxy-directory",metadata:{interactive:false,galaxyRole:"fabric"}};});
  return{galaxyId:galaxy.id,windowStart:1_000_000,windowEnd:1_000_060,observedEventCount:0,samplingPolicy:"decorative dust only until cached evidence arrives",coverageStatement:`${galaxy.name} is waiting for cached evidence. Decorative dust is not a wallet, token, trade, or market claim.`,sources:["a-bulls-galaxy-directory"],particles};
}
export function createGalaxySnapshot(galaxy:GalaxyDefinition,count=2800,seed=galaxy.seed):UniverseSnapshot{
  if(galaxy.id==="galaxy-zero")return createUniverseMapSnapshot(count,seed);
  if(galaxy.id==="fomo"||galaxy.id==="afterbell"||galaxy.id==="pons"||galaxy.id==="pump-fun")return decorativeGalaxy(galaxy,count,seed);
  const random=mulberry(seed),bounded=Math.max(400,Math.min(16000,Math.trunc(count))),windowStart=1_000_000,durationSeconds=60,flatten=1;
  const particles:FieldParticle[]=Array.from({length:bounded},(_,index)=>{const radius=18+random()*82,angle=random()*Math.PI*2,vertical=(random()-.5)*70*flatten,kind=KINDS[index%KINDS.length];return{id:`${galaxy.id}-synthetic-${seed}-${index}`,kind,cosmicKind:cosmicKindForEntity(kind),originGalaxyId:preserveLaunchOrigin(undefined,galaxy.id),verificationState:STATES[index%STATES.length],observedAt:windowStart+random()*durationSeconds,category:CATEGORIES[index%CATEGORIES.length],magnitudeBand:random(),position:[Math.cos(angle)*radius,vertical,Math.sin(angle)*radius]};});
  return{galaxyId:galaxy.id,windowStart,windowEnd:windowStart+durationSeconds,observedEventCount:bounded,samplingPolicy:"synthetic deterministic prototype; not blockchain data",coverageStatement:"Bounded activity window · sampled for exploration",sources:galaxy.sources,particles};
}

export const GALAXY_ZERO_CENTERS:readonly [number,number,number][]=[[-24,0,0],[24,0,0]];
export const GALAXY_ZERO_CAMERA_DISTANCE=205;
const FIELD_HOME_HALO=7;
const FIELD_HOME_DEPTH=36;

function fieldHomeNode(target:GalaxyDefinition,index:number,role:"core"|"halo"|"fabric"|"depth",position:[number,number,number],magnitude:number):FieldParticle{
  return{id:`galaxy-map:${target.id}:${index}`,kind:"galaxy-node",cosmicKind:"galaxy",originGalaxyId:"galaxy-zero",verificationState:"directory",observedAt:1_000_000,category:"swap",magnitudeBand:magnitude,position,source:"a-bulls-galaxy-directory",metadata:{targetGalaxyId:target.id,name:target.name,description:target.description,galaxyRole:role,interactive:true}};
}

/** Two portal galaxies on the Field: a bright core, spiral-arm knots, a soft halo, and a faint depth shell. */
export function createUniverseMapSnapshot(count=2800,seed=861):UniverseSnapshot{
  const random=mulberry(seed),bounded=Math.max(600,Math.min(6000,Math.trunc(count))),definitions=[getGalaxy("fomo"),getGalaxy("afterbell")],particles:FieldParticle[]=[],perGalaxy=Math.floor(bounded*.78/definitions.length);
  for(const [galaxyIndex,target] of definitions.entries()){
    const center=GALAXY_ZERO_CENTERS[galaxyIndex];if(!center)throw new Error(`Field center missing for ${target.id}`);
    for(let index=0;index<perGalaxy;index+=1){
      if(index===0){particles.push(fieldHomeNode(target,index,"core",[...center],1));continue;}
      if(index<=FIELD_HOME_HALO){
        const angle=random()*Math.PI*2,radius=5+random()*8;
        particles.push(fieldHomeNode(target,index,"halo",[center[0]+Math.cos(angle)*radius,center[1]+(random()-.5)*2.2,center[2]+Math.sin(angle)*radius+(random()-.5)*1.6],.55+random()*.4));
        continue;
      }
      if(index<=FIELD_HOME_HALO+FIELD_HOME_DEPTH){
        const angle=random()*Math.PI*2,radius=7+random()*12,lift=(random()-.5)*18,shelf=(random()<.5?-1:1)*(7+random()*12);
        particles.push(fieldHomeNode(target,index,"depth",[center[0]+Math.cos(angle)*radius,center[1]+lift,center[2]+Math.sin(angle)*radius+shelf],.2+random()*.55));
        continue;
      }
      const arm=index%2,radius=1.6+Math.pow(random(),.58)*14.2,angle=radius*.46+arm*Math.PI+(random()-.5)*.38;
      const disk=(random()-.5)*(0.55+ (1-radius/16)*2.4),zJitter=(random()-.5)*(1.1+(1-radius/16)*2.6);
      const knot=random();
      particles.push(fieldHomeNode(target,index,"fabric",[center[0]+Math.cos(angle)*radius,center[1]+disk,center[2]+Math.sin(angle)*radius+zJitter],knot>.84?.92:.28+knot*.42));
    }
  }
  while(particles.length<bounded){const radius=105+random()*135,angle=random()*Math.PI*2;particles.push({id:`galaxy-zero:expanse:${particles.length}`,kind:"expanse",cosmicKind:"dust",originGalaxyId:"galaxy-zero",verificationState:"decorative",observedAt:1_000_000,category:"unknown",magnitudeBand:.08+random()*.22,position:[Math.cos(angle)*radius,(random()-.5)*130,Math.sin(angle)*radius],source:"a-bulls-galaxy-directory",metadata:{galaxyRole:"expanse",interactive:false}});}
  return{galaxyId:"galaxy-zero",windowStart:1_000_000,windowEnd:1_000_060,observedEventCount:0,samplingPolicy:"galaxy directory; decorative expanse is not chain evidence",coverageStatement:"The Field holds FOMO and Afterbell as equal floors. Token PLANETS keep their immutable chain/launch provenance; generic Solana evidence remains available through search, Replay, Evidence, and the Index.",sources:["a-bulls-galaxy-directory"],particles};
}
export function createStarfield(count=520,seed=42){const random=mulberry(seed),positions=new Float32Array(count*3),sizes=new Float32Array(count);for(let i=0;i<count;i++){const radius=90+random()*170,angle=random()*Math.PI*2,vertical=(random()-.5)*150;positions[i*3]=Math.cos(angle)*radius;positions[i*3+1]=vertical;positions[i*3+2]=Math.sin(angle)*radius;sizes[i]=.35+random()*1.35;}return{positions,sizes,count};}
