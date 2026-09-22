import type { FieldMode, FieldParticle } from "./types";

const SOLANA_ADDRESS_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDRESS_RE=/^0x[a-fA-F0-9]{40}$/;

export const FIELD_RESEARCH_MODE_EVENT="abulls:research-mode";
export const TRADE_RESEARCH_ACTIONS=Object.freeze([
  {mode:"trickster" as const,label:"MAKE A CUT",needs:"trade" as const},
  {mode:"compare" as const,label:"COMPARE",needs:"wallet" as const},
  {mode:"what-if" as const,label:"WHAT-IF",needs:"trade" as const},
  {mode:"index" as const,label:"INDEX",needs:"trade" as const},
  {mode:"evidence" as const,label:"EVIDENCE",needs:"mint" as const},
  {mode:"sequences" as const,label:"SEQUENCES",needs:"mint" as const},
  {mode:"ghost" as const,label:"GHOST",needs:"wallet" as const},
]);
const TRADE_RESEARCH_MODES=new Set<FieldMode>(TRADE_RESEARCH_ACTIONS.map(item=>item.mode));

type TradeLike=Pick<FieldParticle,"id"|"eventId"|"observedAt"|"metadata"> & {verificationState?:FieldParticle["verificationState"]};
type Metadata=NonNullable<TradeLike["metadata"]>;
const text=(value:unknown)=>String(value??"").trim();
const chainAlias=(value:unknown)=>{const raw=text(value).toLowerCase().replace(/[_\s:]+/g,"-");if(!raw)return"solana";if(["sol","svm","solana-mainnet","1399811149"].includes(raw))return"solana";if(["bnb","bnb-chain","bnbchain","binance-smart-chain","56"].includes(raw))return"bsc";if(["eth","ethereum-mainnet","mainnet","1"].includes(raw))return"ethereum";if(["base-mainnet","coinbase-base","8453"].includes(raw)||raw==="base")return"base";if(["monad-mainnet","143"].includes(raw)||raw==="monad")return"monad";if(["robinhood-chain","robinhoodchain","hood","4663"].includes(raw))return"robinhood";return raw;};
const metaText=(metadata:Metadata|undefined,keys:string[])=>{for(const key of keys){const value=metadata?.[key];if(typeof value==="string"&&value.trim())return value.trim();}return"";};
const timestampMs=(...values:unknown[])=>{for(const value of values){const parsed=Number(value);if(!Number.isFinite(parsed)||parsed<=0)continue;const ms=parsed<10_000_000_000?parsed*1000:parsed;if(ms>=1_000_000_000_000&&ms<=9_999_999_999_999)return Math.trunc(ms);}return null;};
const validAddress=(chain:string,value:string)=>chain==="solana"?SOLANA_ADDRESS_RE.test(value):EVM_ADDRESS_RE.test(value);

export function normalizeTradeResearchMode(value:unknown):FieldMode|null{
  const mode=String(value??"") as FieldMode;
  return TRADE_RESEARCH_MODES.has(mode)?mode:null;
}

export function tradeReplaySelection(particle:TradeLike,fallbackWallet:string|null|undefined,nowMs=Date.now()){
  const metadata=particle.metadata;
  const chainKey=chainAlias(metaText(metadata,["chainKey","chain","network","networkId"]));
  const mint=metaText(metadata,["mint","token","tokenAddress","token_address","assetAddress","asset_address"]);
  const directWallet=metaText(metadata,["wallet","walletAddress","wallet_address","traderWallet","trader_wallet"]);
  const wallet=directWallet||String(fallbackWallet??"").trim();
  if(!validAddress(chainKey,wallet)||!validAddress(chainKey,mint))return null;
  const quoteMint=metaText(metadata,["quoteMint","quote_mint","quoteAddress","quote_address","quoteAssetAddress","quote_asset_address"]);
  const entryTs=timestampMs(metadata?.entryTs,metadata?.entry_ts,metadata?.entryTime,metadata?.entry_time,metadata?.createdAt,metadata?.created_at,metadata?.openedAt,metadata?.opened_at);
  const exitTs=timestampMs(metadata?.exitTs,metadata?.exit_ts,metadata?.exitTime,metadata?.exit_time,metadata?.closedAt,metadata?.closed_at);
  const fromTs=entryTs;
  const toTs=entryTs?(exitTs&&exitTs>=entryTs?Math.min(nowMs,exitTs):nowMs):null;
  const eventId=particle.verificationState==="observed"?String(particle.eventId??"").trim():"";
  return Object.freeze({chainKey,wallet,mint,quoteMint:validAddress(chainKey,quoteMint)?quoteMint:null,fromTs,toTs,replayCursor:0 as const,evidenceIds:Object.freeze(eventId?[eventId]:[])});
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
