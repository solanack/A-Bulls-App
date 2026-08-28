const DB_NAME='abullsapp-trickster';
const DB_VERSION=1;
const STORE='projects';
const MAX_PROJECTS=12;
const MAX_BYTES=12*1024*1024;
const text=value=>String(value==null?'':value).trim();
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));

function safeSize(value){try{return new Blob([JSON.stringify(value)]).size;}catch{return Number.POSITIVE_INFINITY;}}
function openDb(indexedDBImpl=globalThis.indexedDB){return new Promise((resolve,reject)=>{if(!indexedDBImpl)return reject(new Error('indexeddb_unavailable'));const request=indexedDBImpl.open(DB_NAME,DB_VERSION);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:'id'});store.createIndex('updatedAt','updatedAt');}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('indexeddb_open_failed'));});}
function transact(db,mode,run){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let value;try{value=run(store,tx,resolve,reject);}catch(error){reject(error);return;}tx.onerror=()=>reject(tx.error||new Error('indexeddb_transaction_failed'));if(value!==undefined)resolve(value);});}
function requestValue(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('indexeddb_request_failed'));});}

export function normalizeStoryProject(input={}){
  const manifest=input.manifest||{},id=text(input.id||manifest.id);if(!id)throw new TypeError('project id is required');
  const record={id,storyType:text(input.storyType||manifest.storyType||input.bundle?.storyType),subject:clone(input.subject||manifest.subject||input.bundle?.subject||{}),coverage:clone(input.coverage||manifest.coverage||input.bundle?.coverage||{}),manifest:clone(manifest),bundle:clone(input.bundle||{}),timeline:clone(input.timeline||{}),sceneRuntime:clone(input.sceneRuntime||[]),updatedAt:Math.max(0,Math.trunc(Number(input.updatedAt)||Date.now())),createdAt:Math.max(0,Math.trunc(Number(input.createdAt)||Date.now())),schemaVersion:1,disclosure:'Saved locally on this device. Project contents are derived from public-chain evidence and retain the manifest coverage/provenance state.'};
  if(safeSize(record)>MAX_BYTES)throw new Error('project_too_large');
  return Object.freeze(record);
}

export async function saveStoryProject(input={},options={}){
  const db=await openDb(options.indexedDB),record=normalizeStoryProject(input);try{const existing=await requestValue(db.transaction(STORE,'readonly').objectStore(STORE).get(record.id));const finalRecord=Object.freeze({...record,createdAt:Number(existing?.createdAt)||record.createdAt});await requestValue(db.transaction(STORE,'readwrite').objectStore(STORE).put(finalRecord));const all=await requestValue(db.transaction(STORE,'readonly').objectStore(STORE).getAll());const excess=(Array.isArray(all)?all:[]).sort((a,b)=>Number(b.updatedAt)-Number(a.updatedAt)).slice(MAX_PROJECTS);if(excess.length){const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);for(const item of excess)store.delete(item.id);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('indexeddb_prune_failed'));});}return clone(finalRecord);}finally{db.close();}}

export async function listStoryProjects(options={}){
  const db=await openDb(options.indexedDB);try{const all=await requestValue(db.transaction(STORE,'readonly').objectStore(STORE).getAll());return Object.freeze((Array.isArray(all)?all:[]).sort((a,b)=>Number(b.updatedAt)-Number(a.updatedAt)).map(item=>Object.freeze({id:text(item.id),storyType:text(item.storyType),subject:clone(item.subject||{}),coverage:clone(item.coverage||{}),updatedAt:Number(item.updatedAt)||0,createdAt:Number(item.createdAt)||0,disclosure:text(item.disclosure)})));}finally{db.close();}}

export async function loadStoryProject(id,options={}){const key=text(id);if(!key)throw new TypeError('project id is required');const db=await openDb(options.indexedDB);try{const item=await requestValue(db.transaction(STORE,'readonly').objectStore(STORE).get(key));return item?clone(item):null;}finally{db.close();}}
export async function deleteStoryProject(id,options={}){const key=text(id);if(!key)return false;const db=await openDb(options.indexedDB);try{await requestValue(db.transaction(STORE,'readwrite').objectStore(STORE).delete(key));return true;}finally{db.close();}}
export const TricksterProjectStoreLimits=Object.freeze({maxProjects:MAX_PROJECTS,maxBytes:MAX_BYTES});
