/* LIFE — sophisticated, supportive reflection from public Solana trading activity. */
(function (global) {
  'use strict';

  const byId = id => document.getElementById(id);
  const safe = value => global.BBRPlatform?.escapeHtml ? BBRPlatform.escapeHtml(value) : String(value ?? '');
  const ranges = new Set(['30d', '90d', 'all']);

  function walletState() {
    return global.BBRWalletAnalytics?.getState?.() || {};
  }

  function reflectiveQuestions(overview, activity) {
    const trading = activity?.trading || {};
    const flow = activity?.flow || {};
    const txs = Number(activity?.signaturesAnalyzed || 0);
    const swaps = Number(trading.swapCount || 0);
    const activeDays = Number(trading.activeDays || 0);
    const failureRate = txs ? Number(activity?.failedCount || 0) / txs : 0;
    const topHolding = Number(overview?.topHoldingPercent);
    const busiestDay = String(trading.busiestWeekday || '');
    const uniqueMints = Number(trading.uniqueMints || 0);
    const solNet = Number(flow.solNet || 0);
    const questions = [];

    if (txs && activeDays) {
      const density = txs / Math.max(1, activeDays);
      questions.push(density >= 8
        ? 'During the periods with the most transactions, what information would you want available before making another choice?'
        : 'What conditions were present during the quieter gaps between the transactions shown here?');
    }
    if (swaps >= 8) {
      questions.push('Looking only at the frequent swaps in this period, which decisions would you want to examine more slowly?');
    } else if (swaps > 0) {
      questions.push('What was different about the moments when this wallet swapped compared with the moments when it did not?');
    }
    if (Number.isFinite(topHolding) && topHolding >= 45) {
      questions.push('What evidence originally supported the largest observed holding, and what evidence would cause that reasoning to be reconsidered?');
    } else if (uniqueMints >= 8) {
      questions.push('Across the many observed assets, which ones received repeated attention and which appeared only briefly?');
    }
    if (solNet < 0) {
      questions.push('What explains the observed period in which more SOL left than entered, based on the transactions you recognize?');
    } else if (solNet > 0) {
      questions.push('What explains the observed period in which more SOL entered than left, based on the transactions you recognize?');
    }
    if (failureRate > 0.04) {
      questions.push('What can the failed transactions reveal about timing, process, fees, or the tools used during this period?');
    }
    if (busiestDay) {
      questions.push(`What was happening on ${busiestDay}, the busiest observed weekday in this range?`);
    }
    questions.push('Which part of this public trading history would be most useful to inspect with more context?');
    return [...new Set(questions)].filter(question => question.endsWith('?')).slice(0, 6);
  }

  function render() {
    const state = walletState();
    const address = String(state.address || global.profile?.publicWallet || '').trim();
    const input = byId('lifeWalletInput');
    if (input && !input.value && address) input.value = address;
    const root = byId('lifeQuestions');
    const phase = byId('lifePhase');
    const context = byId('lifeContext');
    if (!root || !phase || !context) return;

    if (!state.overview && !state.activity) {
      phase.textContent = '';
      context.innerHTML = '';
      root.innerHTML = '';
      return;
    }

    const txs = Number(state.activity?.signaturesAnalyzed || 0);
    const days = Number(state.activity?.trading?.activeDays || 0);
    const swaps = Number(state.activity?.trading?.swapCount || 0);
    const range = String(state.range || '90d').toUpperCase();
    context.innerHTML = [
      ['Range', range], ['Transactions', txs.toLocaleString()], ['Active days', days.toLocaleString()], ['Swaps', swaps.toLocaleString()]
    ].map(([label, value]) => `<div><small>${safe(label)}</small><b>${safe(value)}</b></div>`).join('');

    const questions = reflectiveQuestions(state.overview, state.activity);
    phase.textContent = '';
    root.innerHTML = `<div class="life-advice-list">${questions.map(question => `<article>${safe(question)}</article>`).join('')}</div>`;
  }

  async function analyze() {
    const input = byId('lifeWalletInput');
    const button = byId('lifeAnalyze');
    const select = byId('lifeRange');
    const address = String(input?.value || '').trim();
    const range = ranges.has(select?.value) ? select.value : '90d';
    if (!global.BBRWalletAnalytics?.isValidSolanaAddress?.(address)) {
      byId('lifePhase').textContent = 'Enter a valid public Solana wallet address.';
      global.toast?.('Enter a valid Solana address');
      return;
    }
    if (button) { button.disabled = true; button.textContent = 'REFLECTING…'; }
    byId('lifeQuestions').innerHTML = '<div class="life-skeleton" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';
    byId('lifePhase').textContent = '';
    try {
      await global.BBRWalletAnalytics.analyze(address, { navigate: false, range });
      render();
    } finally {
      if (button) { button.disabled = false; button.textContent = 'REFLECT'; }
    }
  }

  function init() {
    byId('lifeAnalyze')?.addEventListener('click', analyze);
    byId('lifeWalletInput')?.addEventListener('keydown', event => { if (event.key === 'Enter') analyze(); });
    global.addEventListener('bbrs:wallet-analysis-complete', () => {
      if (document.getElementById('lifeView')?.classList.contains('active')) render();
    });
    global.addEventListener('abulls:bull-vision-life', () => {
      if (document.getElementById('lifeView')?.classList.contains('active')) render();
    });
    global.addEventListener('abulls:bull-intelligence-ready', () => {
      if (document.getElementById('lifeView')?.classList.contains('active')) render();
    });
    render();
  }

  global.BBRLife = Object.freeze({ init, render, analyze });
})(window);
