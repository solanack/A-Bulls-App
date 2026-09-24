/* Dated social strip for a Replay thread. D1-only page reads: no X, scraper, or provider call happens here.
 * Posts mention the token (ticker, name, or mint) around day_0, the UTC date of the first print. They are
 * dated context, never the claimed reason for a print. An author is linked to the trader only when the
 * retained row already carries that wallet with a source.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';

export const SOCIAL_WINDOW_PATH='/api/intelligence/social/window';
const DAY=86_400;
const THAT_DAY_MAX=8;
const KEYWORDS=['unlock','listing','launch','airdrop','earnings','migration'];
const THESIS_MARKERS=/\b(because|therefore|thesis|bull case|bear case|i think|i expect|the reason|which means|so if|here's why|thread)\b/gi;
const s=value=>String(value??'').trim();
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

export function day0Seconds(day0){const ms=Date.parse(`${s(day0)}T00:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(s(day0))&&Number.isFinite(ms)?Math.floor(ms/1000):null;}

/** Ticker ($SYM or bare SYM word), name, or mint must appear in the post. */
export function mentionsToken(textValue,{symbol,name,mint}){
  const body=s(textValue);if(!body)return false;
  if(mint&&body.toLowerCase().includes(s(mint).toLowerCase()))return true;
  const sym=s(symbol);if(sym&&sym.length>=2&&new RegExp(`(^|[^A-Za-z0-9])\\$?${escape(sym)}(?![A-Za-z0-9])`,'i').test(body))return true;
  const label=s(name);return Boolean(label&&label.length>=4&&body.toLowerCase().includes(label.toLowerCase()));
}

/** Long and argumentative. A shape tag only: never "this is a thesis". */
export function isThesisShaped(textValue){const body=s(textValue);return body.length>=400&&(body.match(THESIS_MARKERS)?.length??0)>=2;}

export function bucketFor(postedSec,day0Sec){const day=Math.floor((postedSec-day0Sec)/DAY);if(day<0||day>7)return null;return day===0?'day0':day===1?'plus1':day<=3?'plus3':'plus7';}

const excerpt=textValue=>{const body=s(textValue).replace(/\s+/g,' ');return body.length>280?`${body.slice(0,277)}…`:body;};
const sameWallet=(a,b)=>Boolean(a&&b)&&(s(a).startsWith('0x')?s(a).toLowerCase()===s(b).toLowerCase():s(a)===s(b));

export function shapeSocialWindow(rows,{day0,symbol,name,mint,wallet,room}){
  const day0Sec=day0Seconds(day0),posts=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const postedSec=Number(row?.posted_at),bucket=Number.isFinite(postedSec)&&day0Sec!=null?bucketFor(postedSec,day0Sec):null,source=s(row?.source_kind);
    if(!bucket||(source!=='x-observed'&&source!=='provider-reported')||!mentionsToken(row?.full_text,{symbol,name,mint}))continue;
    const roleRaw=s(row?.author_role),roleSource=s(row?.author_role_source)||null,role=roleSource&&['team','issuer','venue'].includes(roleRaw)?roleRaw:'public';
    if(room==='afterbell'&&role!=='issuer'&&role!=='venue')continue;
    const url=s(row?.url);
    posts.push({id:s(row?.id),handle:s(row?.handle).replace(/^@/,''),postedAt:postedSec*1000,excerpt:excerpt(row?.full_text),url:/^https:\/\//.test(url)?url:null,source,role,roleSource,thesisShaped:isThesisShaped(row?.full_text),linkedToWallet:Boolean(s(row?.linked_wallet_source))&&sameWallet(row?.linked_wallet,wallet),bucket,text:s(row?.full_text).toLowerCase()});
  }
  posts.sort((a,b)=>a.postedAt-b.postedAt);
  const strip=({text,...post})=>post,of=bucket=>posts.filter(post=>post.bucket===bucket&&post.role==='public').map(strip);
  const keywords=KEYWORDS.map(keyword=>({keyword,count:posts.filter(post=>post.text.includes(keyword)).length})).filter(row=>row.count>0).sort((a,b)=>b.count-a.count);
  const source=posts.some(post=>post.source==='x-observed')?'x-observed':posts.length?'provider-reported':'none';
  return{ok:true,day0,token:{symbol:symbol||null,name:name||null,mint},source,thatDay:of('day0').slice(0,THAT_DAY_MAX),after:{plus1:of('plus1'),plus3:of('plus3'),plus7:of('plus7')},team:posts.filter(post=>post.role!=='public').map(strip),thesisShaped:posts.filter(post=>post.thesisShaped).map(strip),total:posts.length,keywords};
}

export async function handleSocialWindowRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!==SOCIAL_WINDOW_PATH)return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  const p=url.searchParams,mint=s(p.get('mint')),day0=s(p.get('day0')),symbol=s(p.get('symbol')),name=s(p.get('name')),wallet=s(p.get('wallet')),room=s(p.get('room'));
  const day0Sec=day0Seconds(day0);if(!mint||day0Sec==null)return json({ok:false,error:'invalid_window'},400);
  const empty=shapeSocialWindow([],{day0,symbol,name,mint,wallet,room});
  const db=intelligenceDb(env);if(!db)return json(empty,200,'public, max-age=60');
  let rows=[];
  try{rows=(await db.prepare(`SELECT id,source_kind,handle,author_role,author_role_source,linked_wallet,linked_wallet_source,posted_at,full_text,url FROM social_posts_retained WHERE posted_at BETWEEN ? AND ? AND (mint=? OR (? <> '' AND symbol_lc=?)) ORDER BY posted_at ASC LIMIT 400`).bind(day0Sec,day0Sec+8*DAY-1,mint,symbol,symbol.toLowerCase()).all())?.results||[];}catch{rows=[];}
  return json(shapeSocialWindow(rows,{day0,symbol,name,mint,wallet,room}),200,'public, max-age=300, stale-while-revalidate=600');
}

export const __socialWindowContract=Object.freeze({path:SOCIAL_WINDOW_PATH,pageReadsProviderFree:true,readOnly:true,thatDayMax:THAT_DAY_MAX,causationClaimed:false});
