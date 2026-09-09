import { createResearchThreadContext, decodeResearchThread, encodeResearchThread, mergeResearchThreadContext } from "./research-thread";

const STORAGE_KEY="abulls:research-thread:v1";

export function loadResearchThread(){
  if(typeof window==="undefined")return createResearchThreadContext();
  const url=new URL(window.location.href),shared=url.searchParams.get("thread");
  if(shared){const decoded=decodeResearchThread(shared);if(decoded)return decoded;}
  try{return createResearchThreadContext(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)||"{}"));}catch{return createResearchThreadContext();}
}

export function saveResearchThread(patch:Parameters<typeof createResearchThreadContext>[0]){
  const current=loadResearchThread(),next=mergeResearchThreadContext(current,patch);
  if(typeof window!=="undefined")try{window.sessionStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{/* session persistence is best effort */}
  return next;
}

export function researchThreadShareUrl(context=loadResearchThread()){
  if(typeof window==="undefined")return `?thread=${encodeResearchThread(context)}`;
  const url=new URL(window.location.href);url.searchParams.set("thread",encodeResearchThread(context));return url.toString();
}

export function clearResearchThread(){
  if(typeof window!=="undefined")try{window.sessionStorage.removeItem(STORAGE_KEY);}catch{/* no-op */}
  return createResearchThreadContext();
}
