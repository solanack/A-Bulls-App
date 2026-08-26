const text=value=>String(value==null?'':value).trim();
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const freezeList=value=>Object.freeze(Array.isArray(value)?value:[]);

const ACTIONS=Object.freeze([
  Object.freeze({id:'replay',label:'REPLAY'}),
  Object.freeze({id:'compare',label:'COMPARE'}),
  Object.freeze({id:'what-if',label:'WHAT IF',simulation:true}),
  Object.freeze({id:'evidence',label:'EVIDENCE'}),
  Object.freeze({id:'trickster',label:'CREATE STORY'})
]);

function relationEndpoints(relation={}){
  const sourceId=text(relation.sourceId||relation.fromId||relation.source?.id||relation.from?.id);
  const targetId=text(relation.targetId||relation.toId||relation.target?.id||relation.to?.id);
  return {sourceId,targetId};
}

function evidenceReceipt(relation={}){
  return text(relation.evidenceId||relation.eventId||relation.transactionId||relation.signature||relation.receiptId||relation.provenance?.evidenceId||relation.provenance?.signature);
}

function entityIndex(entities=[]){
  return new Map((Array.isArray(entities)?entities:[]).map(entity=>[text(entity?.id),entity]).filter(([id])=>id));
}

function normalizeEdge(relation,index,focusId,entitiesById){
  const {sourceId,targetId}=relationEndpoints(relation),receipt=evidenceReceipt(relation);
  if(!sourceId||!targetId||sourceId===targetId||!receipt)return null;
  if(sourceId!==focusId&&targetId!==focusId)return null;
  const source=entitiesById.get(sourceId),target=entitiesById.get(targetId);
  if(!source||!target)return null;
  const relationKind=text(relation.relationKind||relation.kind||relation.type||relation.category||'observed');
  const observedAt=finite(relation.observedAt||relation.blockTime||relation.timestamp,0);
  return Object.freeze({
    id:text(relation.id)||`edge:${sourceId}:${targetId}:${receipt}:${index}`,
    sourceId,targetId,relationKind,evidenceId:receipt,observedAt,
    verificationState:text(relation.verificationState||relation.provenance?.verificationState||'observed'),
    disclosure:'This visual edge exists only because a normalized evidence receipt connects the two loaded entities. Its spatial shape carries no additional meaning.'
  });
}

export function buildFieldInvestigationHub({focusEntity,entities=[],relations=[]}={}){
  const focusId=text(focusEntity?.id);
  if(!focusId)throw new TypeError('focusEntity.id is required');
  const entitiesById=entityIndex(entities);
  if(!entitiesById.has(focusId))entitiesById.set(focusId,focusEntity);
  const dedupe=new Set(),edges=[];
  for(const [index,relation] of (Array.isArray(relations)?relations:[]).entries()){
    const edge=normalizeEdge(relation,index,focusId,entitiesById);
    if(!edge)continue;
    const key=[edge.sourceId,edge.targetId,edge.evidenceId].sort().join('|');
    if(dedupe.has(key))continue;
    dedupe.add(key);edges.push(edge);
  }
  edges.sort((a,b)=>a.observedAt-b.observedAt||a.id.localeCompare(b.id));
  const connectedIds=new Set([focusId]);
  for(const edge of edges){connectedIds.add(edge.sourceId);connectedIds.add(edge.targetId);}
  const nodes=[...connectedIds].map(id=>entitiesById.get(id)).filter(Boolean).map(entity=>Object.freeze({
    id:text(entity.id),kind:text(entity.kind||'cluster'),category:text(entity.category||'unknown'),
    verificationState:text(entity.verificationState||'observed'),position:Object.freeze(Array.isArray(entity.position)?entity.position.slice(0,3).map(value=>finite(value)): [0,0,0]),
    focused:text(entity.id)===focusId,
    evidenceIds:Object.freeze(edges.filter(edge=>edge.sourceId===text(entity.id)||edge.targetId===text(entity.id)).map(edge=>edge.evidenceId)),
    relationKinds:Object.freeze([...new Set(edges.filter(edge=>edge.sourceId===text(entity.id)||edge.targetId===text(entity.id)).map(edge=>edge.relationKind))])
  }));
  return Object.freeze({
    focusId,focusKind:text(focusEntity.kind||'cluster'),nodes:Object.freeze(nodes),edges:Object.freeze(edges),actions:ACTIONS,
    evidenceCount:edges.length,
    state:edges.length?'evidence-backed':'focus-only',
    disclosure:edges.length
      ?'Only normalized evidence-backed connections are expanded. Distance, angle, grouping, brightness, and animation are navigation aids and do not imply identity, ownership, coordination, intent, causation, significance, or future behavior.'
      :'No normalized evidence-backed connections for this focused entity are loaded in the current bounded observation. This does not mean no activity exists.'
  });
}

export function relationsFromSnapshot(snapshot={}){
  const candidates=[snapshot.relations,snapshot.relationships,snapshot.evidenceEdges,snapshot.edges];
  return freezeList(candidates.find(Array.isArray)||[]);
}

export const FieldInvestigationActions=ACTIONS;
