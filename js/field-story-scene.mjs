const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const text=value=>String(value==null?'':value).trim();
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

const MODE_CAMERA=Object.freeze({
  'comparison-summary':Object.freeze({distance:118,yaw:-.14,pitch:.02}),
  'comparison-replay':Object.freeze({distance:104,yaw:.08,pitch:-.02}),
  'comparison-metrics':Object.freeze({distance:112,yaw:.16,pitch:.04}),
  'comparison-simulation':Object.freeze({distance:108,yaw:-.18,pitch:.06}),
  'focus-event':Object.freeze({distance:82,yaw:0,pitch:0}),
  'market-window':Object.freeze({distance:108,yaw:.12,pitch:-.03}),
  'price-aftermath':Object.freeze({distance:98,yaw:-.1,pitch:.03}),
  'route-context':Object.freeze({distance:105,yaw:.18,pitch:0}),
  'evidence-close':Object.freeze({distance:122,yaw:0,pitch:.05})
});

export function storySceneFieldState(runtime={},scene={}){
  const mode=text(runtime.mode||'evidence-close'),camera=MODE_CAMERA[mode]||MODE_CAMERA['evidence-close'];
  const eventCount=Array.isArray(runtime.eventIds)?runtime.eventIds.length:0,claimCount=Array.isArray(scene.claimIds)?scene.claimIds.length:finite(scene.claims?.length,0);
  const simulation=mode==='comparison-simulation';
  return Object.freeze({
    sceneId:text(runtime.sceneId||scene.id),mode,simulation,
    camera:Object.freeze({...camera,distance:clamp(camera.distance-eventCount*.12,76,128)}),
    field:Object.freeze({intensity:clamp(.82+Math.log10(1+eventCount)*.16+Math.min(claimCount,6)*.025,.72,1.38),scale:clamp(1+Math.log10(1+eventCount)*.035,1,1.14),ghostOffset:simulation?18:0}),
    eventIds:Object.freeze([...(runtime.eventIds||[])].map(String).filter(Boolean)),
    disclosure:simulation?'Simulation scene. Spatial displacement is a visual distinction only; it does not represent an observed chain location or outcome.':'Story camera and field motion are presentation states over the cited evidence. Spatial position does not imply identity, ownership, coordination, intent, causation, or future behavior.'
  });
}

export function dispatchStorySceneFieldState(runtime={},scene={},target=globalThis){
  const state=storySceneFieldState(runtime,scene);
  if(typeof target?.dispatchEvent==='function'&&typeof CustomEvent==='function')target.dispatchEvent(new CustomEvent('abulls:field-story-scene',{detail:state}));
  return state;
}
export const FieldStorySceneEvent='abulls:field-story-scene';
