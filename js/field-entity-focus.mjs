const DISTANCE=Object.freeze({transaction:72,wallet:88,token:94,nft:82,program:104,cluster:116});
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const text=value=>String(value==null?'':value).trim();
export function fieldFocusForEntity(entity={}){
  const id=text(entity.id),kind=text(entity.kind||'cluster'),position=Array.isArray(entity.position)?entity.position:[0,0,0];
  if(!id)throw new TypeError('entity id is required');
  const target=Object.freeze([finite(position[0]),finite(position[1]),finite(position[2])]);
  return Object.freeze({entityId:id,entityKind:kind,target,distance:DISTANCE[kind]||108,disclosure:'Field focus is a presentation camera state over one observed entity. Spatial position does not imply identity, ownership, coordination, intent, causation, importance, or future behavior.'});
}
export function findFieldEntity(particles=[],request={}){
  const id=text(request.entityId||request.query||request.id),kind=text(request.entityKind||request.kind);
  if(!id)return null;
  return (Array.isArray(particles)?particles:[]).find(entity=>text(entity?.id)===id&&(!kind||text(entity?.kind)===kind))||null;
}
