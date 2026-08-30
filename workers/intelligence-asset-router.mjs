/* Neutral read-only routes for Timeline and NFT Memory. */

import { nftMemory } from './intelligence-nft-layer.mjs';
import { timeMachine } from './intelligence-product-layer.mjs';
import { recordDemand } from './intelligence-mesh-runtime.mjs';

const WALLET_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=v=>String(v==null?'':v).trim();
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
async function body(request){try{return await request.json()}catch{return{}}}

export async function handleIntelligenceAssetRequest(request,env={}){
  const url=new URL(request.url);
  if(url.pathname==='/api/intelligence/timeline'&&request.method==='POST'){
    const payload=await body(request);const wallet=s(payload.wallet||payload.address);
    if(!WALLET_RE.test(wallet))return json({ok:false,error:'invalid_public_wallet'},400);
    const started=Date.now();const result=await timeMachine(env,wallet,payload.limit);await recordDemand(env,'timeline','wallet',wallet,Date.now()-started);
    return json({ok:true,...result,disclaimer:'Timeline reflects indexed public observations and may be partial until history coverage is complete.'});
  }
  if(url.pathname==='/api/intelligence/nft-memory'&&request.method==='POST'){
    const payload=await body(request); const wallet=s(payload.wallet||payload.address);
    if(!WALLET_RE.test(wallet)) return json({ok:false,error:'invalid_public_wallet'},400);
    const started=Date.now(); const memory=await nftMemory(env,wallet,payload.limit); await recordDemand(env,'nft-memory','wallet',wallet,Date.now()-started);
    return json({ok:true,memory});
  }
  return null;
}

