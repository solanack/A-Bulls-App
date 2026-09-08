import type { UniverseSnapshot, JsonValue } from '../field/types.ts';
import { particleMint } from '../field/volume-sky.ts';
import { fetchIntelligence } from '../intelligence-origin.ts';

export function applyFieldMarkets(snapshot: UniverseSnapshot, markets: Record<string, Record<string, JsonValue>>): UniverseSnapshot {
  return {...snapshot, particles:snapshot.particles.map(particle=>{
    const mint=particleMint(particle), market=mint?markets[mint]:null;
    if(!market)return particle;
    return {...particle,metadata:{...particle.metadata,mint,market,symbol:market.symbol,name:market.name,priceUsd:market.priceUsd,marketCapUsd:market.marketCapUsd,fdvUsd:market.fdvUsd,marketObservedAt:market.observedAt}};
  }),sources:[...new Set([...snapshot.sources,'DexScreener'])]};
}

export async function enrichFieldMarkets(snapshot: UniverseSnapshot): Promise<UniverseSnapshot> {
  const mints=[...new Set(snapshot.particles.map(particleMint).filter((mint): mint is string=>Boolean(mint)&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint!)))].slice(0,30);
  if(!mints.length)return snapshot;
  try{
    const response=await fetchIntelligence(`/api/intelligence/field/markets?mints=${mints.join(',')}`,{headers:{accept:'application/json'}});
    const body=await response.json() as {ok?:boolean;markets?:Record<string,Record<string,JsonValue>>};
    return response.ok&&body.ok&&body.markets?applyFieldMarkets(snapshot,body.markets):snapshot;
  }catch{return snapshot;}
}
