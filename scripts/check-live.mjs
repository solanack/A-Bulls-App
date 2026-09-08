import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const origin='https://abullsapp.com';
async function get(path){
  const response=await fetch(`${origin}${path}`,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30_000)});
  assert.equal(response.status,200,`${path}: HTTP ${response.status}`);
  return response;
}
const document=await (await get('/')).text();
const expected=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const release=await (await get(`/release.json?commit=${expected}`)).json();
assert.equal(release.commit,expected,'The public domain is serving a different frontend release');
assert.match(document,/Galaxy Zero|A Bulls/i,'Application HTML is missing');
const assets=[...new Set([...document.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.js)(?:\?[^" ]*)?"/g)].map(match=>match[1]))];
assert.ok(assets.length,'Application JavaScript references are missing');
for(const path of assets){
  const asset=await get(path);
  assert.match(asset.headers.get('content-type')||'',/javascript/,'JavaScript has incorrect MIME type');
}
for(const path of [
  '/api/health',
  '/api/intelligence/field/resolve?query=So11111111111111111111111111111111111111112',
  '/api/intelligence/field/resolve?query=0x39dbed3a2bd333467115de45665cc57f813c4571',
  '/api/intelligence/field/snapshot?galaxy=solana-core&window=300',
  '/api/intelligence/field/v0/tokens?limit=10',
  '/api/intelligence/pons/galaxy',
]){
  const response=await get(path);
  assert.match(response.headers.get('content-type')||'',/application\/json/);
  const body=await response.json();
  assert.equal(body.ok,true,`${path}: ${body.error||'not ok'}`);
  if(path.includes('/resolve')){
    assert.equal(body.state,'resolved');
    assert.ok(Number.isFinite(body.market?.priceUsd),'Live token price is unavailable');
  }
  const count=body.snapshot?.particles?.length??body.stars?.length??body.data?.launches?.length;
  console.log(JSON.stringify({path,ok:true,...(count==null?{}:{records:count,empty:count===0})}));
}
console.log('HTTP, JavaScript MIME, and live resolver checks passed. This does not certify WebGL rendering or phone interaction.');
