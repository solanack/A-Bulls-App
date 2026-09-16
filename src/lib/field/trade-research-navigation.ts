import type { FieldMode, FieldParticle } from "./types";

const SOLANA_ADDRESS_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HALF_DAY_MS=12*60*60*1000;

export const FIELD_RESEARCH_MODE_EVENT="abulls:research-mode";
export const TRADE_RESEARCH_ACTIONS=Object.freeze([
  {mode:"trickster" as const,label:"MAKE A CUT",needs:"trade" as const},
  {mode:"compare" as const,label:"COMPARE",needs:"wallet" as const},
  {mode:"what-if" as const,label:"WHAT-IF",needs:"trade" as const},
  {mode:"evidence" as const,label:"EVIDENCE",needs:"mint" as const},
  {mode:"sequences" as const,label:"SEQUENCES",needs:"mint" as const},
  {mode:"ghost" as const,label:"GHOST",needs:"wallet" as const},
]);
const TRADE_RESEARCH_MODES=new Set<FieldMode>(TRADE_RESEARCH_ACTIONS.map(item=>item.mode));

type TradeLike=Pick<FieldParticle,"id"|"eventId"|"observedAt"|"metadata">;

export function normalizeTradeResearchMode(value:unknown):FieldMode|null{
  const mode=String(value??"") as FieldMode;
  return TRADE_RESEARCH_MODES.has(mode)?mode:null;
}

export function tradeReplaySelection(particle:TradeLike,fallbackWallet:string|null|undefined,nowMs=Date.now()){
  const mint=typeof particle.metadata?.mint==="string"?particle.metadata.mint.trim():"";
  const directWallet=typeof particle.metadata?.wallet==="string"?particle.metadata.wallet.trim():"";
  const wallet=directWallet||String(fallbackWallet??"").trim();
  if(!SOLANA_ADDRESS_RE.test(wallet)||!SOLANA_ADDRESS_RE.test(mint))return null;
  const rawObserved=Number(particle.observedAt),normalized=Number.isFinite(rawObserved)&&rawObserved>0?(rawObserved<10_000_000_000?rawObserved*1000:rawObserved):nowMs;
  const center=Math.max(0,Math.min(nowMs,normalized)),fromTs=Math.max(0,center-HALF_DAY_MS),toTs=Math.max(fromTs,Math.min(nowMs,center+HALF_DAY_MS));
  const eventId=String(particle.eventId??particle.id??"").trim();
  return Object.freeze({wallet,mint,fromTs,toTs,replayCursor:1 as const,evidenceIds:Object.freeze(eventId?[eventId]:[])});
}

export function researchModeFromEvent(event:Event){
  return normalizeTradeResearchMode((event as CustomEvent<{mode?:unknown}>).detail?.mode);
}

export function requestTradeResearchMode(mode:FieldMode){
  const safe=normalizeTradeResearchMode(mode);
  if(!safe||typeof globalThis.dispatchEvent!=="function"||typeof CustomEvent==="undefined")return false;
  globalThis.dispatchEvent(new CustomEvent(FIELD_RESEARCH_MODE_EVENT,{detail:{mode:safe}}));
  return true;
}
