/* Intelligence Mesh browser client — neutral, read-only public-address workflows. */
(function (global) {
  'use strict';

  const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const s = v => String(v == null ? '' : v).trim();
  const api = () => global.BBRSApi;

  function requireApi() {
    if (!api()?.envelope) throw new Error('Shared API client is unavailable.');
    return api();
  }

  async function get(path) {
    return requireApi().envelope(path, { method: 'GET' });
  }

  async function post(path, payload) {
    return requireApi().envelope(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
  }

  function validWallet(wallet) { return WALLET_RE.test(s(wallet)); }

  async function status() { return get('/api/intelligence/mesh-status'); }
  async function sourceHealth() { return get('/api/intelligence/source-health'); }
  async function coverage(wallet) {
    if (!validWallet(wallet)) throw new Error('Enter a valid public Solana wallet address.');
    return post('/api/intelligence/index-coverage', { wallet: s(wallet) });
  }
  async function queueHistory(wallet, pageSize = 25) {
    if (!validWallet(wallet)) throw new Error('Enter a valid public Solana wallet address.');
    return post('/api/intelligence/history/queue', { wallet: s(wallet), pageSize });
  }
  async function historyPass(wallet, before = '', pageSize = 25) {
    if (!validWallet(wallet)) throw new Error('Enter a valid public Solana wallet address.');
    return post('/api/intelligence/history/pass', { wallet: s(wallet), before, pageSize });
  }
  async function verification(wallet, signature) {
    if (!validWallet(wallet) || !s(signature)) throw new Error('Wallet and signature are required.');
    return post('/api/intelligence/verification', { wallet: s(wallet), signature: s(signature) });
  }
  async function marketSequence(scopeType, scopeValue, limit = 100) {
    return post('/api/intelligence/market-sequence', { scopeType: s(scopeType), scopeValue: s(scopeValue), limit });
  }

  async function ensureProgressiveIndex(wallet, options = {}) {
    if (!validWallet(wallet)) throw new Error('Enter a valid public Solana wallet address.');
    const current = await coverage(wallet).catch(() => null);
    const row = current?.coverage || null;
    if (row?.complete_to_genesis) return { state: 'complete-history', coverage: row, queued: false };
    const queued = await queueHistory(wallet, options.pageSize || 25);
    return { state: row ? 'partial-history' : 'indexing', coverage: row, queued: true, job: queued };
  }

  function coverageLabel(row) {
    if (!row) return 'INDEXING';
    if (Number(row.complete_to_genesis) === 1) return 'COMPLETE HISTORY';
    return 'PARTIAL HISTORY';
  }

  function formatCoverage(row) {
    if (!row) return { label: 'INDEXING', detail: 'History has not been indexed yet.' };
    const tx = Number(row.indexed_transactions || 0).toLocaleString();
    const from = row.oldest_block_time ? new Date(Number(row.oldest_block_time) * 1000).toLocaleDateString() : 'unknown';
    const to = row.newest_block_time ? new Date(Number(row.newest_block_time) * 1000).toLocaleDateString() : 'present';
    return { label: coverageLabel(row), detail: `${tx} transactions indexed · ${from} → ${to}` };
  }

  global.IntelligenceMesh = Object.freeze({
    validWallet, status, sourceHealth, coverage, queueHistory, historyPass,
    verification, marketSequence, ensureProgressiveIndex, coverageLabel, formatCoverage
  });
})(window);
