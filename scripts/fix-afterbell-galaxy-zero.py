from pathlib import Path
import re

path=Path('src/lib/field/synthetic-universe.ts')
text=path.read_text()
text=text.replace('if(galaxy.id==="fomo"||galaxy.id==="pons"||galaxy.id==="pump-fun")return decorativeGalaxy(galaxy,count,seed);','if(galaxy.id==="fomo"||galaxy.id==="afterbell"||galaxy.id==="pons"||galaxy.id==="pump-fun")return decorativeGalaxy(galaxy,count,seed);',1)
replacement='''export const GALAXY_ZERO_CENTERS:readonly [number,number,number][]=[[-24,0,0],[24,0,0]];
export const GALAXY_ZERO_CAMERA_DISTANCE=205;
export function createUniverseMapSnapshot(count=2800,seed=861):UniverseSnapshot{
  const random=mulberry(seed),bounded=Math.max(600,Math.min(6000,Math.trunc(count))),definitions=[getGalaxy("fomo"),getGalaxy("afterbell")],centers=GALAXY_ZERO_CENTERS,particles:FieldParticle[]=[],perGalaxy=Math.floor(bounded*.78/definitions.length);
  for(const [galaxyIndex,target] of definitions.entries()){
    const center=centers[galaxyIndex];if(!center)throw new Error(`Galaxy Zero center missing for ${target.id}`);
    for(let index=0;index<perGalaxy;index+=1){
      const arm=index%3,radius=index===0?0:2.5+Math.pow(random(),.62)*17,angle=radius*.31+arm*Math.PI*2/3+(random()-.5)*.7,isCore=index===0;
      particles.push({id:`galaxy-map:${target.id}:${index}`,kind:"galaxy-node",cosmicKind:"galaxy",originGalaxyId:"galaxy-zero",verificationState:"directory",observedAt:1_000_000,category:"swap",magnitudeBand:isCore?1:.22+random()*.62,position:[center[0]+Math.cos(angle)*radius,center[1]+(isCore?0:(random()-.5)*4),center[2]+Math.sin(angle)*radius],source:"a-bulls-galaxy-directory",metadata:{targetGalaxyId:target.id,name:target.name,description:target.description,galaxyRole:isCore?"core":"fabric",interactive:true}});
    }
  }
  while(particles.length<bounded){const radius=105+random()*135,angle=random()*Math.PI*2;particles.push({id:`galaxy-zero:expanse:${particles.length}`,kind:"expanse",cosmicKind:"dust",originGalaxyId:"galaxy-zero",verificationState:"decorative",observedAt:1_000_000,category:"unknown",magnitudeBand:.08+random()*.22,position:[Math.cos(angle)*radius,(random()-.5)*130,Math.sin(angle)*radius],source:"a-bulls-galaxy-directory",metadata:{galaxyRole:"expanse",interactive:false}});}
  return{galaxyId:"galaxy-zero",windowStart:1_000_000,windowEnd:1_000_060,observedEventCount:0,samplingPolicy:"galaxy directory; decorative expanse is not chain evidence",coverageStatement:"Galaxy Zero maps Fomo and Afterbell as sibling research galaxies. Token PLANETS keep their immutable chain/launch provenance; generic Solana evidence remains available through search, Replay, Evidence, and the Index.",sources:["a-bulls-galaxy-directory"],particles};
}
'''
pattern=r'export const GALAXY_ZERO_CENTERS:[\s\S]*?(?=export function createStarfield)'
next_text,count=re.subn(pattern,replacement,text,count=1)
if count!=1:raise SystemExit('Galaxy Zero directory section replacement failed')
if 'definitions=[getGalaxy("fomo"),getGalaxy("afterbell")]' not in next_text:raise SystemExit('Afterbell directory target missing after patch')
if 'GALAXY_ZERO_CENTERS:readonly [number,number,number][]=[[-24,0,0],[24,0,0]]' not in next_text:raise SystemExit('Afterbell directory centers missing after patch')
path.write_text(next_text)
print('Galaxy Zero now deterministically contains Fomo + Afterbell directory targets.')
