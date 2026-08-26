const CLAIM_BY_BEAT=Object.freeze({
  'opening-event':'sequence-first-event',
  'participation-expansion':'sequence-participation-expansion',
  'largest-token-delta':'sequence-largest-token-delta',
  'program-context-change':'sequence-program-context-change',
  'direction-mix':'sequence-direction-mix',
  'explicit-price-aftermath':'sequence-selected-price-movement'
});
const TYPE_BY_BEAT=Object.freeze({
  'opening-event':'sequence-opening',
  'participation-expansion':'participation-expansion',
  'largest-token-delta':'largest-observed-trade',
  'program-context-change':'program-context-change',
  'direction-mix':'direction-mix',
  'explicit-price-aftermath':'selected-price-movement',
  'evidence-close':'evidence-summary'
});
const FRAMES=Object.freeze({
  'opening-event':75,
  'participation-expansion':105,
  'largest-token-delta':105,
  'program-context-change':105,
  'direction-mix':105,
  'explicit-price-aftermath':120,
  'evidence-close':90
});

export function tokenSequenceScenePlan(bundle={}){
  const reconstruction=bundle?.marketReplay?.reconstruction;
  if(bundle?.storyType!=='token-sequence'||!Array.isArray(reconstruction?.beats)||!reconstruction.beats.length)return undefined;
  const claims=new Set((bundle.claims||[]).map(claim=>String(claim.id)));
  const scenes=[];
  for(const beat of reconstruction.beats){
    const beatId=String(beat?.id||'');if(!TYPE_BY_BEAT[beatId])continue;
    const claimId=CLAIM_BY_BEAT[beatId];
    if(claimId&&!claims.has(claimId))continue;
    scenes.push(Object.freeze({id:`sequence-${beatId}`,type:TYPE_BY_BEAT[beatId],durationFrames:FRAMES[beatId]||90,claimIds:Object.freeze(claimId?[claimId]:[])}));
  }
  if(!scenes.some(scene=>scene.type==='evidence-summary'))scenes.push(Object.freeze({id:'sequence-evidence-close',type:'evidence-summary',durationFrames:90,claimIds:Object.freeze([])}));
  return Object.freeze(scenes);
}

export function summarizeTokenSequenceDirection(bundle={}){
  const beats=bundle?.marketReplay?.reconstruction?.beats||[];
  return Object.freeze({
    title:'RECONSTRUCTED MARKET SEQUENCE',
    beats:Object.freeze(beats.map(beat=>Object.freeze({id:String(beat.id||''),title:String(beat.title||''),purpose:String(beat.statement||''),claimIds:Object.freeze(CLAIM_BY_BEAT[beat.id]?[CLAIM_BY_BEAT[beat.id]]:[])}))),
    disclosure:String(bundle?.marketReplay?.reconstruction?.disclosure||'Ordered reconstruction uses indexed public-chain evidence only.')
  });
}
