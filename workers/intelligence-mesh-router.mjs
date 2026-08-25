/* A Bulls App — Intelligence Mesh read-only API router */

import { coverageForWallet, marketSequence, recordDemand, runtimeStatus, sourceHealth, verificationForSignature } from './intelligence-mesh-runtime.mjs';
import { walletDna, timeMachine, constellation, museum, chainLens, candles, chainRadar, chainWeather } from './intelligence-product-layer.mjs';
import { ghostPortfolio, parallelUniverse, compareWallets } from './intelligence-simulations.mjs';

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s = v => String(v == null ? '' : v).trim();
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});
async function body(request) { try { return await request.json(); } catch { return {}; } }
function validWallet(wallet) { return WALLET_RE.test(s(wallet)); }

export async function handleIntelligenceMeshRequest(request, env = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/intelligence/')) return null;

  if (url.pathname === '/api/intelligence/mesh-status' && request.method === 'GET') return json({ ok:true, status:await runtimeStatus(env) });
  if (url.pathname === '/api/intelligence/source-health' && request.method === 'GET') return json({ ok:true, sources:await sourceHealth(env) });
  if (url.pathname === '/api/intelligence/chain-radar' && request.method === 'GET') return json({ ok:true, state:'descriptive-anomaly-feed', anomalies:await chainRadar(env), disclaimer:'Observed anomalies are descriptive and are not price predictions or recommendations.' });
  if (url.pathname === '/api/intelligence/chain-weather' && request.method === 'GET') return json({ ok:true, weather:await chainWeather(env), disclaimer:'Visualization of observed aggregate chain activity; not a market forecast.' });

  if (url.pathname === '/api/intelligence/index-coverage' && request.method === 'POST') {
    const payload=await body(request); const wallet=s(payload.wallet||payload.address);
    if(!validWallet(wallet)) return json({ok:false,error:'invalid_public_wallet'},400);
    const started=Date.now(); const coverage=await coverageForWallet(env,wallet); await recordDemand(env,'index-coverage','wallet',wallet,Date.now()-started);
    return json({ok:true,wallet,coverage,state:coverage?.complete_to_genesis?'complete-history':coverage?'partial-history':'not-indexed'});
  }
  if (url.pathname === '/api/intelligence/wallet-dna' && request.method === 'POST') {
    const payload=await body(request); const wallet=s(payload.wallet||payload.address); if(!validWallet(wallet)) return json({ok:false,error:'invalid_public_wallet'},400);
    const started=Date.now(); const dna=await walletDna(env,wallet); await recordDemand(env,'wallet-dna','wallet',wallet,Date.now()-started); return json({ok:true,wallet,dna});
  }
  if (url.pathname === '/api/intelligence/time-machine' && request.method === 'POST') {
    const payload=await body(request); const wallet=s(payload.wallet||payload.address); if(!validWallet(wallet)) return json({ok:false,error:'invalid_public_wallet'},400);
    const started=Date.now(); const result=await timeMachine(env,wallet,payload.limit); await recordDemand(env,'time-machine','wallet',wallet,Date.now()-started); return json({ok:true,...result});
  }
  if (url.pathname === '/api/intelligence/constellation' && request.method === 'POST') {
    const payload=await body(request); const wallet=s(payload.wallet||payload.address); if(!validWallet(wallet)) return json({ok:false,error:'invalid_public_wallet'},400);
    return json({ok:true,wallet,edges:await constellation(env,wallet,payload.limit),disclaimer:'Observed public transaction relationships do not prove common ownership or identity.'});
  }
  if (url.pathname === '/api/intelligence/museum' && request.method === 'POST') {
    const payload=await body(request); const wallet=s(payload.wallet||payload.address); if(!validWallet(wallet)) return json({ok:false,error:'invalid_public_wallet'},400); return json({ok:true,museum:await museum(env,wallet)});
  }
  if (url.pathname === '/api/intelligence/chain-lens' && request.method === 'POST') {
    const payload=await body(request); const wallet=s(payload.wallet||payload.address), signature=s(payload.signature); if(!validWallet(wallet)||!signature) return json({ok:false,error:'wallet_and_signature_required'},400);
    return json({ok:true,lens:await chainLens(env,wallet,signature),disclaimer:'Reconstruction reflects observed on-chain route evidence only.'});
  }
  if (url.pathname === '/api/intelligence/candles' && request.method === 'POST') {
    const payload=await body(request); const mint=s(payload.mint), quoteMint=s(payload.quoteMint||payload.quote_mint); if(!mint||!quoteMint) return json({ok:false,error:'mint_and_quote_required'},400);
    const rows=await candles(env,mint,quoteMint,payload.bucketSeconds||payload.bucket_seconds||60,payload.limit||300); return json({ok:true,mint,quoteMint,candles:rows.reverse(),source:'observed-on-chain-swaps'});
  }
  if (url.pathname === '/api/intelligence/ghost-portfolio' && request.method === 'POST') {
    const payload=await body(request); const wallet=s(payload.wallet||payload.address), quoteMint=s(payload.quoteMint||payload.quote_mint); if(!validWallet(wallet)||!quoteMint) return json({ok:false,error:'wallet_and_quote_required'},400);
    const started=Date.now(); const simulation=await ghostPortfolio(env,wallet,quoteMint,payload.limit); await recordDemand(env,'ghost-portfolio','wallet',wallet,Date.now()-started); return json({ok:true,simulation});
  }
  if (url.pathname === '/api/intelligence/parallel-universe' && request.method === 'POST') {
    const payload=await body(request); const wallet=s(payload.wallet||payload.address), quoteMint=s(payload.quoteMint||payload.quote_mint); if(!validWallet(wallet)||!quoteMint) return json({ok:false,error:'wallet_and_quote_required'},400);
    const simulation=await parallelUniverse(env,wallet,quoteMint,payload.holdDays,payload.limit); return json({ok:true,simulation});
  }
  if (url.pathname === '/api/intelligence/wallet-rivalry' && request.method === 'POST') {
    const payload=await body(request); const walletA=s(payload.walletA||payload.a), walletB=s(payload.walletB||payload.b); if(!validWallet(walletA)||!validWallet(walletB)) return json({ok:false,error:'two_valid_wallets_required'},400);
    return json({ok:true,comparison:await compareWallets(env,walletA,walletB)});
  }
  if (url.pathname === '/api/intelligence/verification' && request.method === 'POST') {
    const payload=await body(request); const wallet=s(payload.wallet||payload.address), signature=s(payload.signature); if(!validWallet(wallet)||!signature) return json({ok:false,error:'wallet_and_signature_required'},400);
    const started=Date.now(); const verification=await verificationForSignature(env,wallet,signature); await recordDemand(env,'verification','wallet-signature',`${wallet}:${signature.slice(0,16)}`,Date.now()-started); return json({ok:true,wallet,signature,verification});
  }
  if (url.pathname === '/api/intelligence/market-sequence' && request.method === 'POST') {
    const payload=await body(request); const scopeType=s(payload.scopeType||payload.scope_type), scopeValue=s(payload.scopeValue||payload.scope_value); if(!scopeType||!scopeValue) return json({ok:false,error:'scope_required'},400);
    const started=Date.now(); const events=await marketSequence(env,scopeType,scopeValue,payload.limit); await recordDemand(env,'market-sequence',scopeType,scopeValue,Date.now()-started); return json({ok:true,scopeType,scopeValue,events,disclaimer:'Chronological on-chain observations; sequence does not prove economic causation.'});
  }

  return null;
}
