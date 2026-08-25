const text=value=>String(value==null?'':value).trim();

const SCENE_FRAMES=Object.freeze({
  'event-hook':75,
  'market-window-replay':180,
  'execution-context':105,
  'market-aftermath':150,
  'evidence-close':90
});

export function directEventStoryBeats(bundle={}){
  const context=bundle.marketContext||null;
  const claims=Array.isArray(bundle.claims)?bundle.claims:[];
  const beats=[];
  const selected=claims.find(claim=>claim.id==='selected-event-observed');
  beats.push(Object.freeze({id:'event-hook',type:'event-hook',title:'The trade',claimIds:Object.freeze(selected?[selected.id]:[]),purpose:'Establish the exact indexed event and chain time.'}));
  if(context?.activity?.eventCount){
    const activity=claims.find(claim=>claim.id==='market-window-activity');
    beats.push(Object.freeze({id:'market-window',type:'market-window-replay',title:'What was happening around it',claimIds:Object.freeze(activity?[activity.id]:[]),purpose:`Replay the bounded indexed market window with ${context.activity.eventCount} observed token events.`}));
  }
  const route=claims.find(claim=>claim.id==='route-window-context');
  if(route||context?.routes?.routeRows){beats.push(Object.freeze({id:'execution-context',type:'execution-context',title:'Where activity routed',claimIds:Object.freeze(route?[route.id]:[]),purpose:'Show indexed venue and route context without implying causation.'}));}
  const aftermath=claims.filter(claim=>/^price-after-/.test(text(claim.id))).sort((a,b)=>Number(text(a.id).split('-').at(-1))-Number(text(b.id).split('-').at(-1)));
  if(aftermath.length){beats.push(Object.freeze({id:'what-happened-next',type:'market-aftermath',title:'What happened next',claimIds:Object.freeze(aftermath.map(claim=>claim.id)),purpose:'Compare deterministic indexed post-event price windows while preserving actual sample timing.'}));}
  beats.push(Object.freeze({id:'evidence-close',type:'evidence-close',title:'Verify the evidence',claimIds:Object.freeze([]),purpose:'Close with coverage, sources, and the frozen evidence receipt.'}));
  return Object.freeze(beats);
}

export function eventStoryScenePlan(bundle={}){
  return Object.freeze(directEventStoryBeats(bundle).map((beat,index)=>Object.freeze({
    id:`event-scene-${String(index+1).padStart(2,'0')}`,
    type:beat.type,
    durationFrames:SCENE_FRAMES[beat.type]||90,
    claimIds:Object.freeze([...beat.claimIds])
  })));
}

export function summarizeEventStoryDirection(bundle={}){
  const beats=directEventStoryBeats(bundle);
  const context=bundle.marketContext;
  return Object.freeze({beats,beatCount:beats.length,hasMarketWindow:Boolean(context?.activity?.eventCount),hasRouteContext:Boolean(context?.routes?.routeRows),hasAftermath:beats.some(beat=>beat.id==='what-happened-next'),disclosure:'Story beats are selected from available indexed evidence only. They do not infer the trader’s motivation, strategy, skill, or intent.'});
}
