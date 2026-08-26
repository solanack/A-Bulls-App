const CLAIM_BY_BEAT=Object.freeze({
  'opening-event':'sequence-first-event',
  'participant-chronology':'sequence-participant-chronology',
  'participation-expansion':'sequence-participation-expansion',
  'largest-token-delta':'sequence-largest-token-delta',
  'program-context-change':'sequence-program-context-change',
  'direction-mix':'sequence-direction-mix',
  'explicit-price-aftermath':'sequence-selected-price-movement'
});
const TYPE_BY_BEAT=Object.freeze({
  'opening-event':'sequence-opening',
  'participant-chronology':'participant-chronology',
  'participation-expansion':'participation-expansion',
  'largest-token-delta':'largest-observed-trade',
  'program-context-change':'program-context-change',
  'direction-mix':'direction-mix',
  'explicit-price-aftermath':'selected-price-movement',
  'evidence-close':'evidence-summary'
});
const FRAMES=Object.freeze({
  'opening-event':75,
  'participant-chronology':105,
  'participation-expansion':105,
  'largest-token-delta':105,
  'program-context-change':105,
  'direction-mix':105,
  'explicit-price-aftermath':120,
  'evidence-close':90
});
const phaseBeat=id=>/^phase-[1-3]$/.test(String(id||''));
const transitionBeat=id=>/^phase-transition-[1-2]$/.test(String(id||''));
const claimForBeat=id=>(phaseBeat(id)||transitionBeat(id))?`sequence-${id}`:CLAIM_BY_BEAT[id];
const typeForBeat=id=>phaseBeat(id)?'market-phase':transitionBeat(id)?'phase-transition':TYPE_BY_BEAT[id];
const framesForBeat=id=>phaseBeat(id)?120:transitionBeat(id)?120:(FRAMES[id]||90);

export function tokenSequenceScenePlan(bundle={}){
  const reconstruction=bundle?.marketReplay?.reconstruction;
  if(bundle?.storyType!=='token-sequence'||!Array.isArray(reconstruction?.beats)||!reconstruction.beats.length)return undefined;
  const claims=new Set((bundle.claims||[]).map(claim=>String(claim.id)));
  const scenes=[];
  for(const beat of reconstruction.beats){
    const beatId=String(beat?.id||''),type=typeForBeat(beatId);if(!type)continue;
    const claimId=claimForBeat(beatId);
    if(claimId&&!claims.has(claimId))continue;
    scenes.push(Object.freeze({id:`sequence-${beatId}`,type,durationFrames:framesForBeat(beatId),claimIds:Object.freeze(claimId?[claimId]:[])}));
  }
  if(!scenes.some(scene=>scene.type==='evidence-summary'))scenes.push(Object.freeze({id:'sequence-evidence-close',type:'evidence-summary',durationFrames:90,claimIds:Object.freeze([])}));
  return Object.freeze(scenes);
}

export function summarizeTokenSequenceDirection(bundle={}){
  const beats=bundle?.marketReplay?.reconstruction?.beats||[];
  return Object.freeze({
    title:'RECONSTRUCTED MARKET SEQUENCE',
    beats:Object.freeze(beats.map(beat=>{const id=String(beat.id||''),claimId=claimForBeat(id);return Object.freeze({id,title:String(beat.title||''),purpose:String(beat.statement||''),claimIds:Object.freeze(claimId?[claimId]:[])});})),
    disclosure:String(bundle?.marketReplay?.reconstruction?.disclosure||'Ordered reconstruction uses indexed public-chain evidence only.')
  });
}
