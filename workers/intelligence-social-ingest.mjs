/* That day ingest. Opening That day (or Replay) queues one fetch per mint + day_0. In production the
 * host-side solanack/Agent-Reach runner is primary: it drains queued work, searches historical/current X
 * context, then posts candidates back here. This Worker validates every candidate before retention in
 * social_posts_retained as source_kind='x-observed'. Reads stay on /api/intelligence/social/window.
 *
 * The host authenticates with a short-lived GitHub Actions OIDC token (or the legacy SOCIAL_INGEST_TOKEN).
 * X cookies never reach this Worker or the frontend. The Worker's own official-X/Exa path is retained only
 * as a bounded fallback after the host grace period. A post is dated context, never the claimed reason for a print.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { day0Seconds, mentionsToken } from './intelligence-social-window.mjs';

export const SOCIAL_REQUEST_PATH='/api/intelligence/social/request';
export const SOCIAL_INGEST_PATH='/api/intelligence/social/ingest';
export const SOCIAL_QUEUE_PATH='/api/intelligence/social/queue';
const DAY=86_400;
const DONE_TTL_SECONDS=12*3600;
const EMPTY_TTL_SECONDS=6*3600;
const RUNNING_LEASE_SECONDS=90;
const MAX_POSTS=120;
const HOST_GRACE_SECONDS=45*60;
const EXA_MCP_URL='https://mcp.exa.ai/mcp';
const GITHUB_OIDC_ISSUER='https://token.actions.githubusercontent.com';
const GITHUB_OIDC_JWKS_URL='https://token.actions.githubusercontent.com/.well-known/jwks';
const GITHUB_OIDC_AUDIENCE='abullsapp-social-ingest';
const GITHUB_OIDC_REPOSITORY='solanack/A-Bulls-App';
const GITHUB_OIDC_REPOSITORY_ID='1337204238';
const GITHUB_OIDC_WORKFLOW_REF='solanack/A-Bulls-App/.github/workflows/social-reach.yml@refs/heads/main';
const GITHUB_OIDC_EVENTS=new Set(['schedule','workflow_dispatch','workflow_run']);
const X_EPOCH_MS=1288834974657n;
const STATUS_URL=/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{6,25})/i;
const RESERVED_HANDLES=new Set(['i','home','search','explore','intent','share','hashtag']);
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const nowSec=()=>Math.floor(Date.now()/1000);
const quote=value=>`"${s(value).replace(/"/g,'')}"`;
const hostPrimaryEnabled=env=>s(env?.SOCIAL_HOST_PRIMARY).toLowerCase()==='true';
const audienceIncludes=(value,expected)=>Array.isArray(value)?value.includes(expected):value===expected;
const b64urlBytes=value=>{
  try{
    const normalized=s(value).replace(/-/g,'+').replace(/_/g,'/'),padded=normalized+'='.repeat((4-normalized.length%4)%4),binary=atob(padded);
    return Uint8Array.from(binary,char=>char.charCodeAt(0));
  }catch{return null;}
};
const decodeJwtJson=value=>{
  const bytes=b64urlBytes(value);if(!bytes)return null;
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{return null;}
};

/** Verify the short-lived identity GitHub Actions issues only to the social-reach workflow. */
export async function verifyGitHubOidc(token,{fetchImpl=fetch,now=nowSec()}={}){
  const parts=s(token).split('.');if(parts.length!==3)return false;
  const header=decodeJwtJson(parts[0]);if(header?.alg!=='RS256'||!s(header?.kid))return false;
  let response,body;
  try{response=await fetchImpl(GITHUB_OIDC_JWKS_URL,{headers:{accept:'application/json'}});if(!response?.ok)return false;body=await response.json();}catch{return false;}
  const jwk=(Array.isArray(body?.keys)?body.keys:[]).find(key=>s(key?.kid)===s(header.kid)&&key?.kty==='RSA');if(!jwk)return false;
  const signature=b64urlBytes(parts[2]);if(!signature)return false;
  let verified=false;
  try{
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    verified=await crypto.subtle.verify({name:'RSASSA-PKCS1-v1_5'},key,signature,new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  }catch{return false;}
  if(!verified)return false;
  const claims=decodeJwtJson(parts[1]);if(!claims)return false;
  const ts=Math.trunc(n(now)),iat=Math.trunc(n(claims.iat)),nbf=Math.trunc(n(claims.nbf??claims.iat)),exp=Math.trunc(n(claims.exp));
  return s(claims.iss)===GITHUB_OIDC_ISSUER
    && audienceIncludes(claims.aud,GITHUB_OIDC_AUDIENCE)
    && s(claims.repository)===GITHUB_OIDC_REPOSITORY
    && s(claims.repository_id)===GITHUB_OIDC_REPOSITORY_ID
    && s(claims.workflow_ref)===GITHUB_OIDC_WORKFLOW_REF
    && s(claims.ref)==='refs/heads/main'
    && GITHUB_OIDC_EVENTS.has(s(claims.event_name))
    && exp>=ts-30
    && nbf<=ts+30
    && iat>=ts-600
    && iat<=ts+30;
}

export function socialRequestKey(mint,day0){return`${s(mint).toLowerCase()}|${s(day0)}`;}

/** The day_0, +1, +3 and +7 slices, as [from, to) seconds and YYYY-MM-DD dates for search filters. */
export function socialSlices(day0){
  const start=day0Seconds(day0);if(start==null)return[];
  const date=sec=>new Date(sec*1000).toISOString().slice(0,10);
  return[[0,1,'day0'],[1,2,'plus1'],[2,4,'plus3'],[4,8,'plus7']].map(([a,b,bucket])=>Object.freeze({bucket,from:start+a*DAY,to:start+b*DAY,since:date(start+a*DAY),until:date(start+b*DAY)}));
}

/**
 * Search terms for the token. The mint and the name are always safe. A ticker of two letters or fewer
 * never goes out alone: it is only paired with the name or mint.
 */
export function socialQueryTerms({symbol,name,mint}){
  const sym=s(symbol).replace(/^\$/,''),label=s(name),address=s(mint),anchors=[address,label.length>=4?quote(label):''].filter(Boolean);
  if(!anchors.length)return null;
  if(/^[A-Za-z0-9]{3,12}$/.test(sym))return`(${[...anchors,`$${sym}`].join(' OR ')})`;
  if(/^[A-Za-z0-9]{1,2}$/.test(sym)&&label.length>=4)return`((${anchors.join(' OR ')}) OR ($${sym} ${quote(label)}))`;
  return`(${anchors.join(' OR ')})`;
}

export function statusIdTime(id){try{return Number(((BigInt(s(id))>>22n)+X_EPOCH_MS)/1000n);}catch{return null;}}

/** One retained row, or null when the post is not a dated X status that mentions the token inside the window. */
export function normalizeSocialPost(raw={},{mint,chain,symbol,name,day0}){
  const match=STATUS_URL.exec(s(raw.url)),start=day0Seconds(day0);if(start==null)return null;
  const id=s(raw.id)||match?.[2]||'',handle=s(raw.handle).replace(/^@/,'')||match?.[1]||'';
  if(!/^\d{6,25}$/.test(id)||!/^[A-Za-z0-9_]{1,15}$/.test(handle)||RESERVED_HANDLES.has(handle.toLowerCase()))return null;
  const fromId=statusIdTime(id),claimed=raw.postedAt!=null?(typeof raw.postedAt==='string'&&!/^\d+$/.test(raw.postedAt)?Math.floor(Date.parse(raw.postedAt)/1000):Math.trunc(n(raw.postedAt)>1e11?n(raw.postedAt)/1000:n(raw.postedAt))):null;
  const posted=fromId??claimed;if(!posted||posted<start||posted>=start+8*DAY)return null;
  const text=s(raw.text).replace(/\s+/g,' ');if(!text||!mentionsToken(text,{symbol,name,mint}))return null;
  const role=['team','issuer','venue'].includes(s(raw.authorRole))&&s(raw.authorRoleSource)?s(raw.authorRole):'public';
  return Object.freeze({id:`x:${id}`,platform:'x',source_kind:'x-observed',handle,author_role:role,author_role_source:role==='public'?null:s(raw.authorRoleSource).slice(0,200),posted_at:posted,full_text:text.slice(0,4000),url:`https://x.com/${handle}/status/${id}`,mint:s(mint),chain_key:s(chain)||null,symbol_lc:s(symbol).replace(/^\$/,'').toLowerCase()||null});
}

/** Exa MCP results come back as text blocks: Title / URL / Published / Author / Highlights. */
export function parseExaResults(textValue=''){
  return s(textValue).split(/\n-{3,}\n/).map(block=>{
    const url=/^URL:\s*(\S+)/m.exec(block)?.[1]||'',title=/^Title:\s*(.*)$/m.exec(block)?.[1]||'',highlights=block.split(/^Highlights:\s*$/m)[1]??'';
    return{url,text:[title,highlights.replace(/^\.\.\.$/gm,' ')].join(' ').trim()};
  }).filter(row=>STATUS_URL.test(row.url));
}

async function exaSearch(query,{fetchImpl=fetch,numResults=10}={}){
  const response=await fetchImpl(EXA_MCP_URL,{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'web_search_exa',arguments:{query,numResults}}})});
  if(!response?.ok)throw new Error(`exa_http_${response?.status||0}`);
  const raw=await response.text(),payloads=raw.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim());
  const texts=[];for(const payload of payloads.length?payloads:[raw]){try{const body=JSON.parse(payload);for(const part of body?.result?.content||[])if(part?.type==='text')texts.push(part.text);}catch{}}
  return texts.flatMap(parseExaResults);
}

async function officialXSearch(env,query,slice,{fetchImpl=fetch}={}){
  const scope=s(env.X_SEARCH_SCOPE).toLowerCase()==='all'?'all':'recent';
  if(scope==='recent'&&slice.to<nowSec()-7*DAY+60)return{skipped:'outside_recent_search_window',posts:[]};
  const params=new URLSearchParams({query:`${query} -is:retweet`,start_time:new Date(slice.from*1000).toISOString(),end_time:new Date(Math.min(slice.to,nowSec()-15)*1000).toISOString(),max_results:'50','tweet.fields':'created_at,author_id,text',expansions:'author_id','user.fields':'username'});
  const response=await fetchImpl(`https://api.x.com/2/tweets/search/${scope}?${params}`,{headers:{authorization:`Bearer ${s(env.X_BEARER_TOKEN)}`,accept:'application/json'}});
  if(!response?.ok)throw new Error(`x_http_${response?.status||0}`);
  const body=await response.json(),users=new Map((body?.includes?.users||[]).map(user=>[s(user.id),s(user.username)]));
  return{posts:(body?.data||[]).map(tweet=>({id:s(tweet.id),handle:users.get(s(tweet.author_id))||'',postedAt:s(tweet.created_at),text:s(tweet.text),url:`https://x.com/${users.get(s(tweet.author_id))||'i'}/status/${s(tweet.id)}`}))};
}

/** Fetch every slice for a request with the best available path. Returns normalized rows. */
export async function fetchSocialPosts(env={},request={},{fetchImpl=fetch}={}){
  const subject={mint:s(request.mint),chain:s(request.chain_key??request.chain),symbol:s(request.symbol),name:s(request.name),day0:s(request.day0)},terms=socialQueryTerms(subject);
  if(!terms)return{provider:'none',rows:[],reason:'no_safe_query'};
  const official=Boolean(s(env.X_BEARER_TOKEN)),rows=new Map(),notes=[],providers=new Set();
  for(const slice of socialSlices(subject.day0)){
    if(slice.from>nowSec())break;
    try{
      let found=official?await officialXSearch(env,terms,slice,{fetchImpl}):null;
      if(found?.skipped)notes.push(`${slice.bucket}:${found.skipped}`);
      if(found&&!found.skipped)providers.add('x-official-search');
      else{found={posts:await exaSearch(`${terms} site:x.com ${slice.since}`,{fetchImpl})};providers.add('agent-reach-exa');}
      for(const post of found.posts){const row=normalizeSocialPost(post,subject);if(row&&!rows.has(row.id))rows.set(row.id,row);}
    }catch(error){notes.push(`${slice.bucket}:${s(error?.message||error)}`);}
  }
  return{provider:[...providers].join('+')||'none',rows:[...rows.values()].slice(0,MAX_POSTS),reason:notes.join(',')||null};
}

async function linkedWallets(db,handles){
  const unique=[...new Set(handles.map(s).filter(Boolean))];if(!unique.length)return new Map();
  try{const result=await db.prepare(`SELECT handle,wallet,source FROM social_account_links WHERE platform='x' AND handle IN (${unique.map(()=>'?').join(',')})`).bind(...unique).all();const map=new Map();for(const row of result?.results||[])if(s(row.source))map.set(s(row.handle).toLowerCase(),{wallet:s(row.wallet),source:s(row.source)});return map;}catch{return new Map();}
}

export async function retainSocialRows(db,rows){
  if(!rows.length)return 0;
  const links=await linkedWallets(db,rows.map(row=>row.handle)),statements=rows.map(row=>{const link=links.get(row.handle.toLowerCase());return db.prepare(`INSERT INTO social_posts_retained(id,platform,source_kind,handle,author_role,author_role_source,linked_wallet,linked_wallet_source,posted_at,full_text,url,mint,chain_key,symbol_lc,retained_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,unixepoch()) ON CONFLICT(id) DO UPDATE SET full_text=excluded.full_text,linked_wallet=COALESCE(excluded.linked_wallet,linked_wallet),linked_wallet_source=COALESCE(excluded.linked_wallet_source,linked_wallet_source),mint=COALESCE(mint,excluded.mint),symbol_lc=COALESCE(symbol_lc,excluded.symbol_lc)`).bind(row.id,row.platform,row.source_kind,row.handle,row.author_role,row.author_role_source,link?.wallet??null,link?.source??null,row.posted_at,row.full_text,row.url,row.mint,row.chain_key,row.symbol_lc);});
  for(let i=0;i<statements.length;i+=50)await db.batch(statements.slice(i,i+50));
  return rows.length;
}

async function readRequest(db,key){try{return await db.prepare(`SELECT * FROM social_fetch_requests WHERE request_key=? LIMIT 1`).bind(key).first();}catch{return null;}}
async function markRequest(db,key,state,{provider=null,count=null,error=null}={}){await db.prepare(`UPDATE social_fetch_requests SET state=?,provider=COALESCE(?,provider),result_count=COALESCE(?,result_count),last_error=?,attempts=attempts+CASE WHEN ?='running' THEN 1 ELSE 0 END,updated_at=unixepoch() WHERE request_key=?`).bind(state,provider,count,error,state,key).run();}

/** Should this request be fetched now? Fresh results are reused; days still inside the window refresh. */
export function socialRequestDue(row,now=nowSec()){
  if(!row)return true;
  const state=s(row.state),age=now-Math.trunc(n(row.updated_at)),start=day0Seconds(row.day0),open=start!=null&&start+8*DAY>now;
  if(state==='running')return age>RUNNING_LEASE_SECONDS;
  if(state==='done')return open&&age>DONE_TTL_SECONDS;
  if(state==='empty')return age>(open?EMPTY_TTL_SECONDS:7*DAY);
  if(state==='error')return age>300;
  return state==='queued';
}

export async function runSocialRequest(env,key,{fetchImpl=fetch}={}){
  const db=intelligenceDb(env);if(!db)return{state:'unavailable'};
  const row=await readRequest(db,key);if(!row)return{state:'missing'};
  await markRequest(db,key,'running');
  try{
    const result=await fetchSocialPosts(env,row,{fetchImpl}),count=await retainSocialRows(db,result.rows);
    // Every slice failing (e.g. Exa refusing Worker egress) is not an empty day: keep it retryable and in the host queue.
    const state=count?'done':result.provider==='none'&&result.reason&&result.reason!=='no_safe_query'?'error':'empty';
    await markRequest(db,key,state,{provider:result.provider,count,error:result.reason});return{state,provider:result.provider,count};
  }
  catch(error){const code=s(error?.message||error)||'social_fetch_failed';await markRequest(db,key,'error',{error:code}).catch(()=>null);return{state:'error',error:code};}
}

function validRequest(input={}){
  const mint=s(input.mint),day0=s(input.day0),room=s(input.room);
  if(!/^(?:0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/.test(mint)||day0Seconds(day0)==null)return null;
  return{mint,day0,chain:s(input.chain).slice(0,32)||null,symbol:s(input.symbol).replace(/^\$/,'').slice(0,24)||null,name:s(input.name).slice(0,80)||null,room:room==='afterbell'||room==='fomo'?room:null};
}

export async function requestSocialFetch(env={},input={},{fetchImpl=fetch,waitUntil=null}={}){
  const request=validRequest(input);if(!request)return{ok:false,error:'invalid_social_request'};
  const db=intelligenceDb(env);if(!db)return{ok:true,state:'unavailable'};
  const key=socialRequestKey(request.mint,request.day0);
  await db.prepare(`INSERT INTO social_fetch_requests(request_key,mint,chain_key,symbol,name,room,day0,state) VALUES(?,?,?,?,?,?,?,'queued') ON CONFLICT(request_key) DO UPDATE SET symbol=COALESCE(social_fetch_requests.symbol,excluded.symbol),name=COALESCE(social_fetch_requests.name,excluded.name),chain_key=COALESCE(social_fetch_requests.chain_key,excluded.chain_key)`).bind(key,request.mint,request.chain,request.symbol,request.name,request.room,request.day0).run();
  let row=await readRequest(db,key);
  if(!socialRequestDue(row))return{ok:true,state:s(row?.state)||'queued',provider:s(row?.provider)||null,count:Math.trunc(n(row?.result_count)),cached:true};
  if(hostPrimaryEnabled(env)){
    const age=nowSec()-Math.trunc(n(row?.updated_at));
    // Give the Agent-Reach host first chance. If GitHub Actions has not drained a queued request within
    // the grace window, preserve the Worker's bounded official-X/Exa path as an availability fallback.
    if(s(row?.state)!=='queued'){
      await markRequest(db,key,'queued',{provider:row?.provider??null,count:row?.result_count??null,error:null});
      row=await readRequest(db,key);
      return{ok:true,state:'queued',provider:s(row?.provider)||null,count:Math.trunc(n(row?.result_count)),cached:false,collector:'agent-reach'};
    }
    if(age<=HOST_GRACE_SECONDS)return{ok:true,state:'queued',provider:s(row?.provider)||null,count:Math.trunc(n(row?.result_count)),cached:false,collector:'agent-reach'};
  }
  const job=runSocialRequest(env,key,{fetchImpl});
  if(waitUntil){waitUntil(job.catch(()=>null));return{ok:true,state:'running',cached:false};}
  const result=await job;return{ok:true,...result,cached:false};
}

async function authorized(request,env,{fetchImpl=fetch}={}){
  const configured=s(env.SOCIAL_INGEST_TOKEN),header=s(request.headers.get('authorization'));
  if(!header.startsWith('Bearer '))return false;
  const bearer=header.slice(7).trim();
  if(configured&&bearer===configured)return true;
  return bearer.split('.').length===3&&await verifyGitHubOidc(bearer,{fetchImpl});
}

export async function handleSocialIngestRequest(request,env={}){
  const url=new URL(request.url);
  if(url.pathname===SOCIAL_REQUEST_PATH){
    if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
    let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
    const waitUntil=env.__EXECUTION_CTX?.waitUntil?env.__EXECUTION_CTX.waitUntil.bind(env.__EXECUTION_CTX):null,result=await requestSocialFetch(env,body||{},{waitUntil});
    return json(result,result.ok?200:400);
  }
  if(url.pathname===SOCIAL_QUEUE_PATH){
    if(!(await authorized(request,env)))return json({ok:false,error:'unauthorized'},401);
    const db=intelligenceDb(env);if(!db)return json({ok:false,error:'database_unavailable'},503);
    // A deploy-triggered Agent-Reach run may explicitly re-check recent empty rows after collector code changes.
    // Scheduled runs keep the six-hour empty-result guard to avoid repeatedly hitting the search backend.
    const retryEmpty=url.searchParams.get('retry_empty')==='1';
    const emptyGuard=retryEmpty?'':`AND NOT (state='empty' AND provider LIKE 'agent-reach-%' AND updated_at>unixepoch()-21600)`;
    const rows=(await db.prepare(`SELECT request_key,mint,chain_key,symbol,name,room,day0,state,provider,result_count,updated_at FROM social_fetch_requests WHERE state IN ('queued','empty','error') AND (provider IS NULL OR provider<>'agent-reach-twitter-cli') ${emptyGuard} ORDER BY updated_at DESC LIMIT 25`).all().catch(()=>({results:[]})))?.results||[];
    return json({ok:true,retryEmpty,items:rows.map(row=>({...row,terms:socialQueryTerms(row),slices:socialSlices(row.day0)}))});
  }
  if(url.pathname===SOCIAL_INGEST_PATH){
    if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
    if(!(await authorized(request,env)))return json({ok:false,error:'unauthorized'},401);
    let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
    const subject=validRequest(body||{});if(!subject)return json({ok:false,error:'invalid_social_request'},400);
    const db=intelligenceDb(env);if(!db)return json({ok:false,error:'database_unavailable'},503);
    const provider=/^agent-reach-[a-z0-9-]{2,32}$/.test(s(body.provider))?s(body.provider):'agent-reach-host';
    const rows=[],seen=new Set();for(const post of Array.isArray(body.posts)?body.posts.slice(0,400):[]){const row=normalizeSocialPost(post,subject);if(row&&!seen.has(row.id)){seen.add(row.id);rows.push(row);}}
    const count=await retainSocialRows(db,rows.slice(0,MAX_POSTS)),key=socialRequestKey(subject.mint,subject.day0);
    await db.prepare(`INSERT INTO social_fetch_requests(request_key,mint,chain_key,symbol,name,room,day0,state,provider,result_count) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(request_key) DO UPDATE SET state=excluded.state,provider=excluded.provider,result_count=MAX(social_fetch_requests.result_count,excluded.result_count),last_error=NULL,updated_at=unixepoch()`).bind(key,subject.mint,subject.chain,subject.symbol,subject.name,subject.room,subject.day0,count?'done':'empty',provider,count).run();
    return json({ok:true,accepted:count,rejected:(Array.isArray(body.posts)?body.posts.length:0)-count});
  }
  return null;
}

export const __socialIngestContract=Object.freeze({requestPath:SOCIAL_REQUEST_PATH,ingestPath:SOCIAL_INGEST_PATH,queuePath:SOCIAL_QUEUE_PATH,sourceKind:'x-observed',hostPrimaryFlag:'SOCIAL_HOST_PRIMARY',hostGraceSeconds:HOST_GRACE_SECONDS,githubOidcAuth:true,githubOidcAudience:GITHUB_OIDC_AUDIENCE,authenticatedRetryEmpty:true,workerFallback:'official-x-then-exa',cookiesInWorker:false,bareShortTickerQueried:false,linkedWalletOnlyFromSourcedLinks:true,causationClaimed:false});
