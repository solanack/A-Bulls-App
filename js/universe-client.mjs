import { normalizeUniverseSnapshot } from './universe-contracts.mjs';

function endpoint(baseUrl,options={}){
  const url=new URL('/api/intelligence/universe-snapshot',baseUrl);
  url.searchParams.set('window',String(options.windowSeconds??60));
  url.searchParams.set('limit',String(options.limit??2500));
  if(options.universeId)url.searchParams.set('universe',String(options.universeId));
  return url;
}
async function readJson(fetchImpl,url){const response=await fetchImpl(url,{headers:{accept:'application/json'}}),payload=await response.json().catch(()=>null);if(!response.ok||!payload?.ok)throw new Error(payload?.error||`universe_http_${response.status}`);return payload;}
function researchUrl(base,path,{universeId,windowSeconds,limit}={}){const url=new URL(path,base);url.searchParams.set('universe',String(universeId||'solana'));if(windowSeconds!=null)url.searchParams.set('window',String(windowSeconds));if(limit!=null)url.searchParams.set('limit',String(limit));return url;}

export class UniverseClient{
  #baseUrl;#fetch;#intervalMs;#timer=0;#abort=null;#running=false;#lastSnapshot=null;#listeners=new Set();#universeId='solana';
  constructor({baseUrl,fetchImpl=globalThis.fetch,intervalMs=5000,universeId='solana'}={}){this.#baseUrl=new URL(baseUrl??globalThis.location?.origin??'https://localhost/');if(typeof fetchImpl!=='function')throw new TypeError('fetch implementation is required');this.#fetch=fetchImpl;this.#intervalMs=Math.max(2000,Number(intervalMs)||5000);this.#universeId=String(universeId||'solana');}
  subscribe(listener){if(typeof listener!=='function')throw new TypeError('listener is required');this.#listeners.add(listener);return()=>this.#listeners.delete(listener);}
  #emit(state,detail={}){const event=Object.freeze({state,snapshot:this.#lastSnapshot,universeId:this.#universeId,...detail});for(const listener of this.#listeners)listener(event);return event;}
  async listUniverses(){return (await readJson(this.#fetch,new URL('/api/intelligence/universes',this.#baseUrl))).universes||[];}
  async patterns({universeId=this.#universeId,windowSeconds=86400,limit=20000}={}){return (await readJson(this.#fetch,researchUrl(this.#baseUrl,'/api/intelligence/universe-patterns',{universeId,windowSeconds,limit}))).analysis;}
  async decisionModels({universeId=this.#universeId,windowSeconds=7*86400,limit=20000,walletLimit=250}={}){const url=researchUrl(this.#baseUrl,'/api/intelligence/universe-decision-models',{universeId,windowSeconds,limit});url.searchParams.set('walletLimit',String(walletLimit));return (await readJson(this.#fetch,url)).analysis;}
  async anomalies({universeId=this.#universeId,windowSeconds=7*86400,limit=20000}={}){return (await readJson(this.#fetch,researchUrl(this.#baseUrl,'/api/intelligence/universe-anomalies',{universeId,windowSeconds,limit}))).analysis;}
  async evidence({universeId=this.#universeId,from,to,limit=500,wallet='',mint=''}={}){const url=new URL('/api/intelligence/universe-evidence',this.#baseUrl);url.searchParams.set('universe',String(universeId));if(from!=null)url.searchParams.set('from',String(from));if(to!=null)url.searchParams.set('to',String(to));url.searchParams.set('limit',String(limit));if(wallet)url.searchParams.set('wallet',String(wallet));if(mint)url.searchParams.set('mint',String(mint));return (await readJson(this.#fetch,url)).events||[];}
  async membershipHistory({universeId=this.#universeId,limit=250}={}){const url=new URL('/api/intelligence/universe-membership-history',this.#baseUrl);url.searchParams.set('universe',String(universeId));url.searchParams.set('limit',String(limit));return (await readJson(this.#fetch,url)).events||[];}
  async health(){return (await readJson(this.#fetch,new URL('/api/intelligence/universe-health',this.#baseUrl))).health||null;}
  selectUniverse(universeId){const next=String(universeId||'solana').trim()||'solana';if(next===this.#universeId)return false;this.#universeId=next;this.#lastSnapshot=null;this.#abort?.abort();this.#emit('universe-changed');return true;}
  async refresh(options={}){this.#abort?.abort();this.#abort=new AbortController();this.#emit(this.#lastSnapshot?'refreshing':'loading');try{const response=await this.#fetch(endpoint(this.#baseUrl,{...options,universeId:options.universeId||this.#universeId}),{method:'GET',headers:{accept:'application/json'},signal:this.#abort.signal});const payload=await response.json().catch(()=>null);if(!response.ok||!payload?.ok){const error=new Error(payload?.error||`universe_http_${response.status}`);error.status=response.status;throw error;}this.#lastSnapshot=normalizeUniverseSnapshot(payload.snapshot);return this.#emit('ready',{completeChainRepresentation:payload.completeChainRepresentation===true,readOnly:payload.readOnly===true});}catch(error){if(error?.name==='AbortError')return this.#emit('cancelled');return this.#emit(this.#lastSnapshot?'degraded':'error',{error});}}
  start(options={}){if(this.#running)return;this.#running=true;const tick=async()=>{if(!this.#running)return;await this.refresh(options);if(this.#running)this.#timer=globalThis.setTimeout(tick,this.#intervalMs);};tick();}
  stop(){this.#running=false;globalThis.clearTimeout(this.#timer);this.#abort?.abort();this.#emit('stopped');}
  get lastSnapshot(){return this.#lastSnapshot;}
  get universeId(){return this.#universeId;}
}
