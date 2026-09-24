import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSocialPosts, normalizeSocialPost, parseExaResults, requestSocialFetch, socialQueryTerms, socialRequestDue, socialSlices, statusIdTime, __socialIngestContract } from './intelligence-social-ingest.mjs';

const MINT='0xfe189e97832da1573e4e4ff034f4ffc3a15c7777',subject={mint:MINT,chain:'bsc',symbol:'MarsCoin',name:'MarsCoin',day0:'2026-07-28'};
// Snowflake for 2026-07-28T12:00:00Z.
const idAt=sec=>((BigInt(sec*1000)-1288834974657n)<<22n).toString();
const NOON=Date.parse('2026-07-28T12:00:00Z')/1000;

test('a two-letter ticker never goes out alone', () => {
  assert.equal(socialQueryTerms({symbol:'AI',name:'',mint:''}),null);
  assert.match(socialQueryTerms({symbol:'AI',name:'Alpha Intel',mint:MINT}),/\$AI "Alpha Intel"/);
  assert.doesNotMatch(socialQueryTerms({symbol:'AI',name:'Alpha Intel',mint:MINT}),/OR \$AI\)/);
  assert.match(socialQueryTerms(subject),/\$MarsCoin/);
});

test('slices cover day_0, +1, +3 and +7', () => {
  const slices=socialSlices('2026-07-28');
  assert.deepEqual(slices.map(row=>row.bucket),['day0','plus1','plus3','plus7']);
  assert.equal(slices[0].since,'2026-07-28');assert.equal(slices[3].until,'2026-08-05');
});

test('posts are kept only when they are dated X statuses inside the window that mention the token', () => {
  assert.equal(statusIdTime(idAt(NOON)),NOON);
  const good=normalizeSocialPost({url:`https://x.com/MarsCoinonBNB/status/${idAt(NOON)}`,text:'$MarsCoin is live on Binance Alpha'},subject);
  assert.equal(good.source_kind,'x-observed');assert.equal(good.posted_at,NOON);assert.equal(good.handle,'MarsCoinonBNB');assert.equal(good.author_role,'public');
  assert.equal(normalizeSocialPost({url:`https://x.com/a/status/${idAt(NOON)}`,text:'gm frens'},subject),null);
  assert.equal(normalizeSocialPost({url:`https://x.com/a/status/${idAt(NOON+9*86400)}`,text:'$MarsCoin'},subject),null);
  assert.equal(normalizeSocialPost({url:'https://zamantika.com/profile/MarsCoinonBNB',text:'$MarsCoin'},subject),null);
  assert.equal(normalizeSocialPost({url:`https://x.com/a/status/${idAt(NOON)}`,text:'$MarsCoin',authorRole:'team'},subject).author_role,'public');
});

test('Exa text blocks yield only x.com status results', () => {
  const text=`Title: MarsCoin profile\nURL: https://zamantika.com/profile/MarsCoinonBNB\nPublished: N/A\nHighlights:\n$MarsCoin\n\n---\n\nTitle: post\nURL: https://x.com/flapdotsh/status/${idAt(NOON)}\nPublished: 2026-07-28\nHighlights:\n$MARSCOIN is now live\n...\nmore`;
  const rows=parseExaResults(text);
  assert.equal(rows.length,1);assert.match(rows[0].text,/MARSCOIN is now live/);
});

test('without an X key the Exa route runs; with a key official X search runs first', async () => {
  const calls=[];
  const exa=async(url,init)=>{calls.push(url);return{ok:true,status:200,text:async()=>`event: message\ndata: ${JSON.stringify({result:{content:[{type:'text',text:`Title: t\nURL: https://x.com/flapdotsh/status/${idAt(NOON)}\nHighlights:\n$MARSCOIN is live`}]}})}`};};
  const free=await fetchSocialPosts({},{...subject,chain_key:'bsc'},{fetchImpl:exa});
  assert.equal(free.provider,'agent-reach-exa');assert.equal(free.rows.length,1);assert.ok(calls.every(url=>url.startsWith('https://mcp.exa.ai/')));
  calls.length=0;
  const x=async(url)=>{calls.push(url);return{ok:true,status:200,json:async()=>({data:[{id:idAt(NOON),author_id:'9',text:'$MarsCoin launch',created_at:'2026-07-28T12:00:00Z'}],includes:{users:[{id:'9',username:'someone'}]}})};};
  const paid=await fetchSocialPosts({X_BEARER_TOKEN:'k',X_SEARCH_SCOPE:'all'},{...subject,chain_key:'bsc'},{fetchImpl:x});
  assert.equal(paid.provider,'x-official-search');assert.equal(paid.rows[0].url,`https://x.com/someone/status/${idAt(NOON)}`);assert.ok(calls[0].startsWith('https://api.x.com/2/tweets/search/all?'));
});

test('a request is cached by mint + day_0 and writes social_posts_retained', async () => {
  const state=new Map(),written=[];
  const db={prepare:sql=>({bind:(...args)=>({sql,args,run:async()=>{if(sql.startsWith('INSERT INTO social_fetch_requests'))if(!state.has(args[0]))state.set(args[0],{request_key:args[0],mint:args[1],chain_key:args[2],symbol:args[3],name:args[4],room:args[5],day0:args[6],state:'queued',updated_at:Math.floor(Date.now()/1000)});if(sql.startsWith('UPDATE social_fetch_requests')){const row=state.get(args[5]);row.state=args[0];row.provider=args[1]??row.provider;row.result_count=args[2]??row.result_count;row.updated_at=Math.floor(Date.now()/1000);}return{};},first:async()=>state.get(args[0])??null,all:async()=>({results:[]})})}),batch:async list=>{written.push(...list.map(item=>item.args));}};
  const exa=async()=>({ok:true,status:200,text:async()=>`data: ${JSON.stringify({result:{content:[{type:'text',text:`URL: https://x.com/flapdotsh/status/${idAt(NOON)}\nHighlights:\n$MARSCOIN is live`}]}})}`});
  const first=await requestSocialFetch({INTELLIGENCE_DB:db},{...subject,room:'fomo'},{fetchImpl:exa});
  assert.equal(first.state,'done');assert.equal(written.length,1);assert.equal(written[0][2],'x-observed');assert.equal(written[0][6],null);
  const second=await requestSocialFetch({INTELLIGENCE_DB:db},{...subject,room:'fomo'},{fetchImpl:exa});
  assert.equal(second.cached,true);assert.equal(written.length,1);
  assert.equal(socialRequestDue({state:'empty',day0:'2026-07-28',updated_at:Math.floor(Date.now()/1000)}),false);
  assert.equal((await requestSocialFetch({INTELLIGENCE_DB:db},{mint:'not-a-mint',day0:'2026-07-28'})).ok,false);
  assert.equal(__socialIngestContract.cookiesInWorker,false);
  const refused=await requestSocialFetch({INTELLIGENCE_DB:db},{...subject,day0:'2026-07-29',room:'fomo'},{fetchImpl:async()=>({ok:false,status:403,text:async()=>''})});
  assert.equal(refused.state,'error');assert.equal(written.length,1);
  assert.equal(socialRequestDue({state:'error',day0:'2026-07-29',updated_at:Math.floor(Date.now()/1000)-301}),true);
});

test('Agent-Reach, Exa, X credentials and cookies never appear in the client source', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const walk = async dir => (await Promise.all((await readdir(dir, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]))).flat();
  const files = (await walk(new URL('../src', import.meta.url).pathname)).filter(file => /\.(tsx?|mjs|js)$/.test(file));
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    assert.doesNotMatch(text, /agent[-_]reach|mcp\.exa\.ai|api\.x\.com|TWITTER_AUTH_TOKEN|TWITTER_CT0|X_BEARER_TOKEN|SOCIAL_INGEST_TOKEN|auth_token=/i, file);
  }
});
