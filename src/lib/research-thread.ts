export type ResearchVisibility = "private" | "unlisted" | "public";
export type ResearchObjectKind = "planet" | "star" | "trade" | "matched_round" | "research_thread" | "replay" | "evidence" | "cut" | "thesis" | "resolution" | "ghost" | "sequence" | "comparison";
export type EvidenceEpistemicKind = "observed" | "provider-reported" | "derived" | "user-claim" | "unavailable";
export type ResearchJson = string | number | boolean | null | ResearchJson[] | { [key: string]: ResearchJson };
export type ReplaySpeed = 0.5 | 1 | 2 | 4;

export type ResearchThreadContext = {
  id: string | null;
  visibility: ResearchVisibility;
  galaxyId: string | null;
  launchOrigin: string | null;
  chainKey: string | null;
  mint: string | null;
  quoteMint: string | null;
  wallet: string | null;
  displayName: string | null;
  symbol: string | null;
  matchedRoundId: string | null;
  fromTs: number | null;
  toTs: number | null;
  entrySignature: string | null;
  exitSignature: string | null;
  replayRef: string | null;
  replayCursor: number;
  replaySpeed: ReplaySpeed;
  evidenceIds: readonly string[];
  compareRefs: readonly string[];
  sequenceRefs: readonly string[];
  ghostRefs: readonly string[];
  thesisRefs: readonly string[];
  cutRefs: readonly string[];
  coverage: string | null;
  updatedAt: number;
};

export type MatchedTradeRound = {
  id: string;
  wallet: string;
  mint: string;
  status: "closed" | "open" | "unmatched";
  entrySignature: string | null;
  exitSignature: string | null;
  entryTs: number | null;
  exitTs: number | null;
  buySol: number | null;
  sellSol: number | null;
  matchedRealizedSol: number | null;
  observedInventory: number | null;
  method: string;
  evidenceIds: readonly string[];
  coverage: string;
};

export type ResearchIndexObject = {
  id: string;
  kind: ResearchObjectKind;
  mint: string | null;
  wallet: string | null;
  galaxyId: string | null;
  title: string;
  summary: string | null;
  sourceKind: EvidenceEpistemicKind | string;
  sourceRef: string | null;
  observedTs: number | null;
  coverage: string | null;
  visibility: ResearchVisibility;
  payload: Readonly<Record<string, ResearchJson>>;
  createdAt: number;
  updatedAt: number;
};

const finiteMs=(value:unknown):number|null=>{const n=Number(value);return Number.isInteger(n)&&n>=1_000_000_000_000&&n<=9_999_999_999_999?n:null;};
const text=(value:unknown):string|null=>{const v=String(value??"").trim();return v||null;};
const refs=(value:unknown):readonly string[]=>Object.freeze((Array.isArray(value)?value:[]).map(item=>String(item??"").trim()).filter(Boolean).slice(0,100));
const cursor=(value:unknown):number=>{const n=Number(value);return Math.min(1,Math.max(0,Number.isFinite(n)?n:0));};
const speed=(value:unknown):ReplaySpeed=>{const n=Number(value);return n===0.5||n===2||n===4?n:1;};

export function createResearchThreadContext(input:Partial<ResearchThreadContext>={}):ResearchThreadContext{
  const fromTs=finiteMs(input.fromTs),toTs=finiteMs(input.toTs);
  return Object.freeze({
    id:text(input.id),visibility:input.visibility==="public"||input.visibility==="unlisted"?input.visibility:"private",
    galaxyId:text(input.galaxyId),launchOrigin:text(input.launchOrigin),chainKey:text(input.chainKey),mint:text(input.mint),quoteMint:text(input.quoteMint),wallet:text(input.wallet),displayName:text(input.displayName),symbol:text(input.symbol),matchedRoundId:text(input.matchedRoundId),
    fromTs,toTs:fromTs!=null&&toTs!=null&&toTs>=fromTs?toTs:null,
    entrySignature:text(input.entrySignature),exitSignature:text(input.exitSignature),replayRef:text(input.replayRef),replayCursor:cursor(input.replayCursor),replaySpeed:speed(input.replaySpeed),
    evidenceIds:refs(input.evidenceIds),compareRefs:refs(input.compareRefs),sequenceRefs:refs(input.sequenceRefs),ghostRefs:refs(input.ghostRefs),thesisRefs:refs(input.thesisRefs),cutRefs:refs(input.cutRefs),
    coverage:text(input.coverage),updatedAt:finiteMs(input.updatedAt)??Date.now(),
  });
}

export function mergeResearchThreadContext(current:ResearchThreadContext,patch:Partial<ResearchThreadContext>):ResearchThreadContext{
  return createResearchThreadContext({...current,...patch,updatedAt:Date.now()});
}

export function encodeResearchThread(context:ResearchThreadContext):string{
  const compact={g:context.galaxyId,o:context.launchOrigin,h:context.chainKey,m:context.mint,q:context.quoteMint,w:context.wallet,n:context.displayName,y:context.symbol,r:context.matchedRoundId,f:context.fromTs,t:context.toTs,e:context.entrySignature,x:context.exitSignature,p:context.replayRef,c:context.replayCursor,s:context.replaySpeed};
  return btoa(unescape(encodeURIComponent(JSON.stringify(compact)))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}

export function decodeResearchThread(value:string):ResearchThreadContext|null{
  try{const normalized=value.replaceAll("-","+").replaceAll("_","/");const padded=normalized+"=".repeat((4-normalized.length%4)%4);const raw=JSON.parse(decodeURIComponent(escape(atob(padded)))) as Record<string,unknown>;return createResearchThreadContext({galaxyId:text(raw.g),launchOrigin:text(raw.o),chainKey:text(raw.h),mint:text(raw.m),quoteMint:text(raw.q),wallet:text(raw.w),displayName:text(raw.n),symbol:text(raw.y),matchedRoundId:text(raw.r),fromTs:finiteMs(raw.f),toTs:finiteMs(raw.t),entrySignature:text(raw.e),exitSignature:text(raw.x),replayRef:text(raw.p),replayCursor:cursor(raw.c),replaySpeed:speed(raw.s)});}catch{return null;}
}
