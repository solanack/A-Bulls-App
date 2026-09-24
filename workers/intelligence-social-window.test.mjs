import assert from 'node:assert/strict';
import test from 'node:test';
import { __socialWindowContract, bucketFor, day0Seconds, handleSocialWindowRequest, isThesisShaped, mentionsToken, shapeSocialWindow } from './intelligence-social-window.mjs';

const mint='5761e8gCMZFBHLU4RuFsfkWab96oJEtEr3uoF9A4pump',wallet='9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU';
const day0='2026-09-21',d0=day0Seconds(day0);
const post=(overrides={})=>({id:'p1',source_kind:'x-observed',handle:'@someone',author_role:'public',author_role_source:null,linked_wallet:null,linked_wallet_source:null,posted_at:d0+3600,full_text:'$WIF looks busy today',url:'https://x.com/someone/status/1',...overrides});
const argument='I think the bull case here is simple, because the unlock schedule is already priced. '.repeat(6);

test('social strip is D1-only, read-only, and never claims causation',()=>{
  assert.equal(__socialWindowContract.path,'/api/intelligence/social/window');
  assert.equal(__socialWindowContract.pageReadsProviderFree,true);
  assert.equal(__socialWindowContract.causationClaimed,false);
  assert.equal(__socialWindowContract.thatDayMax,8);
});

test('a post must mention the ticker, the name, or the mint',()=>{
  assert.equal(mentionsToken('$WIF to the moon',{symbol:'WIF',name:'dogwifhat',mint}),true);
  assert.equal(mentionsToken('wif is loud',{symbol:'WIF',name:null,mint}),true);
  assert.equal(mentionsToken('swift move',{symbol:'WIF',name:null,mint}),false);
  assert.equal(mentionsToken(`ca: ${mint}`,{symbol:null,name:null,mint}),true);
  assert.equal(mentionsToken('dogwifhat chart',{symbol:null,name:'dogwifhat',mint}),true);
  assert.equal(mentionsToken('nothing here',{symbol:'WIF',name:'dogwifhat',mint}),false);
});

test('buckets are day_0, +1, +3 and +7 in UTC days from the first print',()=>{
  assert.equal(bucketFor(d0+10,d0),'day0');
  assert.equal(bucketFor(d0+86_400+10,d0),'plus1');
  assert.equal(bucketFor(d0+3*86_400,d0),'plus3');
  assert.equal(bucketFor(d0+7*86_400,d0),'plus7');
  assert.equal(bucketFor(d0-10,d0),null);
  assert.equal(bucketFor(d0+8*86_400,d0),null);
});

test('thesis-shaped is a shape tag for long argumentative posts only',()=>{
  assert.equal(isThesisShaped(argument),true);
  assert.equal(isThesisShaped('because therefore'),false);
  assert.equal(isThesisShaped('a'.repeat(500)),false);
});

test('team posts need a sourced role; the trader link needs the retained wallet; unrelated posts drop',()=>{
  const window=shapeSocialWindow([
    post(),
    post({id:'p2',posted_at:d0+86_400+60,full_text:`${argument} $WIF`}),
    post({id:'p3',author_role:'team',author_role_source:'deployer',full_text:'WIF unlock notes'}),
    post({id:'p4',author_role:'team',author_role_source:null,full_text:'WIF official? unsourced'}),
    post({id:'p5',linked_wallet:wallet,linked_wallet_source:'fomoapi.io profile',full_text:'my WIF entry'}),
    post({id:'p6',full_text:'unrelated coin'}),
    post({id:'p7',source_kind:'scraped',full_text:'$WIF'}),
  ],{day0,symbol:'WIF',name:null,mint,wallet,room:'fomo'});
  assert.equal(window.source,'x-observed');
  assert.deepEqual(window.thatDay.map(row=>row.id),['p1','p4','p5']);
  assert.equal(window.thatDay.find(row=>row.id==='p4').role,'public');
  assert.deepEqual(window.team.map(row=>row.id),['p3']);
  assert.deepEqual(window.after.plus1.map(row=>row.id),['p2']);
  assert.deepEqual(window.thesisShaped.map(row=>row.id),['p2']);
  assert.equal(window.thatDay.find(row=>row.id==='p5').linkedToWallet,true);
  assert.equal(window.thatDay.find(row=>row.id==='p1').linkedToWallet,false);
  assert.equal(window.total,5);
  assert.deepEqual(window.keywords[0],{keyword:'unlock',count:2});
  assert.equal(JSON.stringify(window).includes('"text"'),false);
});

test('Afterbell only carries retained issuer or venue notes',()=>{
  const window=shapeSocialWindow([post({full_text:'CRCLx chatter'}),post({id:'n1',author_role:'issuer',author_role_source:'issuer site',full_text:'CRCLx issuer note'})],{day0,symbol:'CRCLx',name:null,mint,wallet,room:'afterbell'});
  assert.equal(window.total,1);
  assert.deepEqual(window.team.map(row=>row.id),['n1']);
  assert.equal(window.thatDay.length,0);
});

test('missing table or database is an honest empty window, not an error',async()=>{
  const request=new Request(`https://intel.test/api/intelligence/social/window?mint=${mint}&day0=${day0}&symbol=WIF`);
  const none=await(await handleSocialWindowRequest(request,{})).json();
  assert.equal(none.ok,true);assert.equal(none.source,'none');assert.equal(none.total,0);
  const broken={prepare(){return{bind(){return this;},async all(){throw new Error('no such table: social_posts_retained');}};}};
  const empty=await(await handleSocialWindowRequest(request,{INTELLIGENCE_DB:broken})).json();
  assert.equal(empty.source,'none');assert.deepEqual(empty.thatDay,[]);
  assert.equal((await handleSocialWindowRequest(new Request('https://intel.test/api/intelligence/social/window?mint=x&day0=bad'),{})).status,400);
});
