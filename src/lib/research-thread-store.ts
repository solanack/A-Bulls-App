import { createResearchThreadContext, decodeResearchThread, encodeResearchThread, mergeResearchThreadContext, type ResearchThreadContext } from "./research-thread";

const STORAGE_KEY="abulls:research-thread:v1";
const SHARED_SOURCE_KEY="abulls:research-thread:shared-source:v1";

function storedThread(){
  if(typeof window==="undefined")return null;
  try{const raw=window.sessionStorage.getItem(STORAGE_KEY);return raw?createResearchThreadContext(JSON.parse(raw)):null;}catch{return null;}
}

export function loadResearchThread(){
  if(typeof window==="undefined")return createResearchThreadContext();
  const url=new URL(window.location.href),shared=url.searchParams.get("thread");
  if(shared){
    try{
      const source=window.sessionStorage.getItem(SHARED_SOURCE_KEY),current=storedThread();
      if(source===shared&&current)return current;
      const decoded=decodeResearchThread(shared);
      if(decoded){window.sessionStorage.setItem(STORAGE_KEY,JSON.stringify(decoded));window.sessionStorage.setItem(SHARED_SOURCE_KEY,shared);return decoded;}
    }catch{/* fall through to stored/local context */}
  }
  return storedThread()??createResearchThreadContext();
}

export function saveResearchThread(patch:Partial<ResearchThreadContext>={}){
  const current=loadResearchThread(),next=mergeResearchThreadContext(current,patch);
  if(typeof window!=="undefined")try{window.sessionStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{/* session persistence is best effort */}
  return next;
}

export function researchThreadShareUrl(context=loadResearchThread()){
  if(typeof window==="undefined")return `?thread=${encodeResearchThread(context)}`;
  const url=new URL(window.location.href);url.searchParams.set("thread",encodeResearchThread(context));return url.toString();
}

export function clearResearchThread(){
  if(typeof window!=="undefined")try{window.sessionStorage.removeItem(STORAGE_KEY);window.sessionStorage.removeItem(SHARED_SOURCE_KEY);}catch{/* no-op */}
  return createResearchThreadContext();
}
