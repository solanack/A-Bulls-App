import { sliceMarketReplayToPhase } from './market-sequence-phase-slice.mjs';
import { dispatchMarketPhaseFieldEffect } from './field-sequence-effects.mjs';

const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};
const fmt=value=>Number(value||0).toLocaleString(undefined,{maximumSignificantDigits:6});

export function createMarketSequencePhaseControls({bundle,reconstruction,onPlay,onCreateStory}={}){
  const phases=reconstruction?.phases?.phases||[];
  if(!phases.length)return null;
  const section=node('section','market-sequence-phases');
  const header=node('div','market-sequence-phases__header');
  header.append(node('strong','','PLAYABLE PHASES'),node('small','',reconstruction.phases.method==='selected-phase'?'Selected phase preserved':'Neutral timing partitions'));
  const grid=node('div','market-sequence-phases__grid');
  for(const phase of phases){
    const card=node('article','market-sequence-phase'),copy=node('div','market-sequence-phase__copy');
    copy.append(node('strong','',phase.label),node('span','',`${phase.eventCount} events · ${phase.walletCount} wallets · ${phase.buyCount}/${phase.sellCount} buy/sell`));
    if(phase.largestAbsTokenDelta!=null)copy.append(node('small','',`Largest observed |token Δ| · ${fmt(phase.largestAbsTokenDelta)}`));
    const actions=node('div','market-sequence-phase__actions'),play=node('button','secondary','PLAY PHASE'),story=node('button','secondary','CREATE PHASE STORY');
    play.type=story.type='button';
    play.addEventListener('click',()=>{dispatchMarketPhaseFieldEffect(phase);onPlay?.(sliceMarketReplayToPhase(bundle,phase),phase);});
    story.addEventListener('click',()=>onCreateStory?.(sliceMarketReplayToPhase(bundle,phase),phase));
    actions.append(play,story);card.append(copy,actions);grid.append(card);
  }
  section.append(header,grid,node('p','intelligence-context-disclosure',reconstruction.phases.disclosure));
  return section;
}
