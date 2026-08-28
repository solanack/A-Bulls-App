import { walletComparisonRenderStateAtFrame } from './wallet-comparison-render-plan.mjs';

const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();
function replayEvents(bundle={}){return Array.isArray(bundle?.replayEvents)?bundle.replayEvents:Array.isArray(bundle?.replay?.events)?bundle.replay.events:[];}
function replayCandles(bundle={}){return Array.isArray(bundle?.candles)?bundle.candles:Array.isArray(bundle?.replay?.candles)?bundle.replay.candles:[];}
function claimsForScene(manifest={},sceneId=''){const scene=(manifest.scenes||[]).find(item=>String(item.id)===String(sceneId));const byId=new Map((manifest.claims||[]).map(claim=>[String(claim.id),claim]));return Object.freeze((scene?.claimIds||[]).map(id=>byId.get(String(id))).filter(Boolean));}
function through(items=[],chainTime){if(chainTime==null)return Object.freeze([]);return Object.freeze(items.filter(item=>finite(item?.timestamp)!=null&&finite(item.timestamp)<=chainTime));}
function sameWallet(event,wallet){return text(event?.wallet)===text(wallet);}

export function buildWalletComparisonFrameModel({bundle={},manifest={},renderPlan=[]}={},frame=0){
  const state=walletComparisonRenderStateAtFrame(renderPlan,frame);if(!state)return null;
  const events=replayEvents(bundle),candles=replayCandles(bundle),walletA=state.walletA||bundle?.comparison?.walletA?.wallet||'',walletB=state.walletB||bundle?.comparison?.walletB?.wallet||'';
  const timedMode=state.mode==='comparison-replay'||state.mode==='comparison-simulation';
  const allVisible=timedMode?through(events,state.chainTime):Object.freeze([]);
  const visibleCandles=timedMode?through(candles,state.chainTime):Object.freeze([]);
  const simulationEvents=state.mode==='comparison-simulation'?through(bundle?.whatIf?.events||[],state.chainTime):Object.freeze([]);
  return Object.freeze({
    state,
    scene:Object.freeze({id:state.sceneId,type:state.type,mode:state.mode,progress:state.progress}),
    claims:claimsForScene(manifest,state.sceneId),
    walletA:Object.freeze({id:text(walletA),events:Object.freeze(allVisible.filter(event=>sameWallet(event,walletA))),summary:bundle?.comparison?.walletA||null}),
    walletB:Object.freeze({id:text(walletB),events:Object.freeze(allVisible.filter(event=>sameWallet(event,walletB))),summary:bundle?.comparison?.walletB||null}),
    visibleCandles,
    timing:bundle?.comparison?.timing||null,
    disclosure:text(bundle?.comparison?.disclosure),
    simulation:Object.freeze({
      events:simulationEvents,disclosure:text(bundle?.whatIf?.disclosure||state.simulationDisclosure),active:state.mode==='comparison-simulation',
      sourceWallet:text(bundle?.whatIf?.sourceWallet),targetWallet:text(bundle?.whatIf?.targetWallet),scenario:text(bundle?.whatIf?.scenario)
    }),
    evidence:Object.freeze({verifiedPercent:finite(manifest?.coverage?.verifiedPercent),coverage:text(manifest?.coverage?.statement),count:(manifest.evidence||[]).length})
  });
}
