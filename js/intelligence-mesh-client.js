/* Intelligence Mesh browser client — neutral, read-only public-address workflows. */
(function (global) {
  'use strict';

  const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const s = v => String(v == null ? '' : v).trim();
  const api = () => global.BBRSApi;

  function requireApi() { if (!api()?.envelope) throw new Error('Shared API client is unavailable.'); return api(); }
  async function get(path) { return requireApi().envelope(path, { method:'GET' }); }
  async function post(path, payload) { return requireApi().envelope(path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload || {}) }); }
  function validWallet(wallet) { return WALLET_RE.test(s(wallet)); }
  function needWallet(wallet) { if (!validWallet(wallet)) throw new Error('Enter a valid public Solana wallet address.'); return s(wallet); }

  const status = () => get('/api/intelligence/mesh-status');
  const sourceHealth = () => get('/api/intelligence/source-health');
  const communityIntegrations = () => get('/api/intelligence/community-integrations');
  const chainRadar = () => get('/api/intelligence/chain-radar');
  const chainWeather = () => get('/api/intelligence/chain-weather');
  const coverage = wallet => post('/api/intelligence/index-coverage', { wallet:needWallet(wallet) });
  const walletDna = wallet => post('/api/intelligence/wallet-dna', { wallet:needWallet(wallet) });
  const timeMachine = (wallet,limit=250) => post('/api/intelligence/time-machine', { wallet:needWallet(wallet),limit });
  const constellation = (wallet,limit=100) => post('/api/intelligence/constellation', { wallet:needWallet(wallet),limit });
  const museum = wallet => post('/api/intelligence/museum', { wallet:needWallet(wallet) });
  const nftMemory = (wallet,limit=250) => post('/api/intelligence/nft-memory', { wallet:needWallet(wallet),limit });
  const chainLens = (wallet,signature) => post('/api/intelligence/chain-lens', { wallet:needWallet(wallet),signature:s(signature) });
  const candles = (mint,quoteMint,bucketSeconds=60,limit=300) => post('/api/intelligence/candles',{mint:s(mint),quoteMint:s(quoteMint),bucketSeconds,limit});
  const ghostPortfolio = (wallet,quoteMint,limit=80) => post('/api/intelligence/ghost-portfolio',{wallet:needWallet(wallet),quoteMint:s(quoteMint),limit});
  const parallelUniverse = (wallet,quoteMint,holdDays=7,limit=60) => post('/api/intelligence/parallel-universe',{wallet:needWallet(wallet),quoteMint:s(quoteMint),holdDays,limit});
  const walletRivalry = (walletA,walletB) => post('/api/intelligence/wallet-rivalry',{walletA:needWallet(walletA),walletB:needWallet(walletB)});

  async function queueHistory(wallet, pageSize = 25) { return post('/api/intelligence/history/queue', { wallet:needWallet(wallet), pageSize }); }
  async function historyPass(wallet, before = '', pageSize = 25) { return post('/api/intelligence/history/pass', { wallet:needWallet(wallet), before, pageSize }); }
  async function verification(wallet, signature) { const w=needWallet(wallet); if(!s(signature)) throw new Error('Wallet and signature are required.'); return post('/api/intelligence/verification', { wallet:w, signature:s(signature) }); }
  async function marketSequence(scopeType, scopeValue, limit = 100) { return post('/api/intelligence/market-sequence', { scopeType:s(scopeType), scopeValue:s(scopeValue), limit }); }

  async function ensureProgressiveIndex(wallet, options = {}) {
    const w=needWallet(wallet);
    const current = await coverage(w).catch(() => null);
    const row = current?.coverage || null;
    if (row?.complete_to_genesis) return { state:'complete-history', coverage:row, queued:false };
    const queued = await queueHistory(w, options.pageSize || 25);
    return { state:row?'partial-history':'indexing', coverage:row, queued:true, job:queued };
  }

  function coverageLabel(row) { if (!row) return 'INDEXING'; return Number(row.complete_to_genesis) === 1 ? 'COMPLETE HISTORY' : 'PARTIAL HISTORY'; }
  function formatCoverage(row) {
    if (!row) return { label:'INDEXING', detail:'History has not been indexed yet.' };
    const tx=Number(row.indexed_transactions||0).toLocaleString();
    const from=row.oldest_block_time?new Date(Number(row.oldest_block_time)*1000).toLocaleDateString():'unknown';
    const to=row.newest_block_time?new Date(Number(row.newest_block_time)*1000).toLocaleDateString():'present';
    return { label:coverageLabel(row), detail:`${tx} transactions indexed · ${from} → ${to}` };
  }

  global.IntelligenceMesh = Object.freeze({
    validWallet,status,sourceHealth,communityIntegrations,chainRadar,chainWeather,coverage,walletDna,timeMachine,
    constellation,museum,nftMemory,chainLens,candles,ghostPortfolio,parallelUniverse,walletRivalry,
    queueHistory,historyPass,verification,marketSequence,ensureProgressiveIndex,coverageLabel,formatCoverage
  });
})(window);
