import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const origin='https://abullsapp.com';
async function get(path){
  const response=await fetch(`${origin}${path}`,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30_000)});
  assert.equal(response.status,200,`${path}: HTTP ${response.status}`);
  return response;
}
async function post(path,body){
  const response=await fetch(`${origin}${path}`,{method:'POST',headers:{'cache-control':'no-cache','content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30_000)});
  assert.equal(response.status,200,`${path}: HTTP ${response.status}`);
  assert.match(response.headers.get('content-type')||'',/application\/json/);
  return response.json();
}
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForRelease(expected){
  let release=null;
  for(let attempt=0;attempt<12;attempt++){
    release=await (await get(`/release.json?commit=${expected}&attempt=${attempt}`)).json();
    if(release?.commit===expected)return release;
    if(attempt<11){console.log(`Waiting for Cloudflare route propagation (${attempt+1}/12): public=${release?.commit||'unknown'} expected=${expected}`);await sleep(5000);}
  }
  assert.equal(release?.commit,expected,'The public domain is serving a different frontend release');return release;
}

const document=await (await get('/')).text();
const expected=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
await waitForRelease(expected);
assert.match(document,/Galaxy Zero|A Bulls/i,'Application HTML is missing');
const assets=[...new Set([...document.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.js)(?:\?[^" ]*)?"/g)].map(match=>match[1]))];
assert.ok(assets.length,'Application JavaScript references are missing');
for(const path of assets){const asset=await get(path);assert.match(asset.headers.get('content-type')||'',/javascript/,'JavaScript has incorrect MIME type');}
for(const path of [
  '/api/health',
  '/api/intelligence/field/resolve?query=So11111111111111111111111111111111111111112',
  '/api/intelligence/field/resolve?query=0x39dbed3a2bd333467115de45665cc57f813c4571',
  '/api/intelligence/field/snapshot?galaxy=solana-core&window=300',
  '/api/intelligence/field/v0/tokens?limit=10',
  '/api/intelligence/pons/galaxy',
  '/api/intelligence/fomo/galaxy',
]){
  const response=await get(path);assert.match(response.headers.get('content-type')||'',/application\/json/);const body=await response.json();assert.equal(body.ok,true,`${path}: ${body.error||'not ok'}`);
  if(path.includes('/resolve')){assert.equal(body.state,'resolved');assert.ok(Number.isFinite(body.market?.priceUsd),'Live token price is unavailable');}
  const count=body.snapshot?.particles?.length??body.stars?.length??body.data?.launches?.length??body.items?.length;
  console.log(JSON.stringify({path,ok:true,...(count==null?{}:{records:count,empty:count===0}),...(body.error?{sourceStatus:body.error}:{}),...(body.configuration?{configuration:body.configuration}:{})}));
}

// Use retained production objects rather than a synthetic fixture: this proves a known
// wallet/token pair, its Replay path, and an already-saved public VERIFY link survive release.
const rounds=await (await get('/api/intelligence/research/index?kind=matched_round&limit=10')).json();
assert.equal(rounds.ok,true,'The live research Index is unavailable');
const active=rounds.items?.find(item=>item.wallet&&item.mint);
assert.ok(active,'No retained wallet/token matched round is available for the live acceptance check');
const roundList=await (await get(`/api/intelligence/research/rounds?wallet=${encodeURIComponent(active.wallet)}&mint=${encodeURIComponent(active.mint)}&limit=10`)).json();
assert.equal(roundList.ok,true,'Known wallet/token rounds are unavailable');
assert.ok(roundList.items?.length,'Known wallet/token data is empty');
const chosen=roundList.items[0];
const from=Math.max(0,Math.floor((chosen.entryTs??Date.now()-86_400_000)/1000)-3600);
const to=Math.floor((chosen.exitTs??chosen.entryTs??Date.now())/1000)+3600;
const replay=await post('/api/intelligence/replay-bundle',{wallet:active.wallet,mint:active.mint,from,to,limit:100});
assert.equal(replay.ok,true,'Replay did not load for the retained wallet/token pair');
assert.equal(replay.bundle?.subject?.mint,active.mint,'Replay returned the wrong token');

const cuts=await (await get('/api/intelligence/research/index?kind=cut&limit=10')).json();
assert.equal(cuts.ok,true,'The live Cut Index is unavailable');
const savedCut=cuts.items?.find(item=>/^[a-f0-9]{24}$/.test(String(item.payload?.shareId??item.sourceRef??'')));
assert.ok(savedCut,'No saved public VERIFY link is available for the live acceptance check');
const shareId=String(savedCut.payload?.shareId??savedCut.sourceRef);
const frozen=await (await get(`/api/intelligence/trickster/share/${shareId}`)).json();
assert.equal(frozen.ok,true,'The saved VERIFY manifest did not resolve');
assert.equal(frozen.frozen,true,'The saved VERIFY manifest is not frozen');
assert.equal(frozen.verifyUrl,`/?cut=${shareId}`,'The saved VERIFY path changed');
const verifyPage=await (await get(`/?cut=${shareId}`)).text();
assert.match(verifyPage,/Galaxy Zero|A Bulls/i,'The saved VERIFY frontend route did not load');

console.log(JSON.stringify({liveAcceptance:{wallet:active.wallet,mint:active.mint,round:chosen.id,replayEvents:replay.bundle?.events?.length??0,verifyPath:frozen.verifyUrl}}));
console.log('HTTP, JavaScript MIME, known wallet/token, Replay, and saved VERIFY checks passed. This does not certify WebGL rendering or phone interaction.');
