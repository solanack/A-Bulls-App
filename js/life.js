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

  function bullVisionAdvice(address) {
    try {
      const saved = JSON.parse(sessionStorage.getItem('abulls_bull_vision_life') || 'null');
      if (!saved || String(saved.wallet || '') !== String(address || '')) return [];
      const ids = new Set((saved.observed?.signals || []).map(signal => signal?.id));
      const pieces = [];
      if (ids.has('rapid-rotation')) pieces.push('One reconstructed trade replay showed decisions arriving in quick succession. Speed can be useful, but clarity usually improves when there is enough room to notice whether the next move is necessary or merely available.');
      if (ids.has('scaled-entry')) pieces.push('A reconstructed position was built in stages. That same patience has value away from markets: meaningful things often become stronger when they are built deliberately rather than demanded all at once.');
      if (ids.has('staged-exit')) pieces.push('A reconstructed position was released in stages. Completion does not always need a single dramatic moment; sometimes good judgment is simply knowing how to loosen your grip a little at a time.');
      if (ids.has('gave-back-peak')) pieces.push('One replay moved well beyond its eventual result before giving some of that ground back. Peaks are information, not obligations. A life measured only against its best moment will always feel smaller than it really is.');
      if (ids.has('deep-drawdown')) pieces.push('One replay passed through a deep drawdown. Endurance matters, but so does remembering that persistence is a choice rather than a debt you owe to an earlier decision.');
      return pieces.slice(0, 2);
    } catch (_) {
      return [];
    }
  }

  function bullIntelligenceAdvice(address, overview, activity, range) {
    try {
      if (!global.BBRBullIntelligence?.deriveDNA || !address || !overview || !activity) return [];
      const dna = global.BBRBullIntelligence.deriveDNA({ address, overview, activity, range });
      const scores = Object.fromEntries((dna?.dimensions || []).map(item => [item.key, Number(item.score || 0)]));
      const pieces = [];

      if (scores.conviction >= 72) {
        pieces.push('Your Bull DNA shows a concentrated visible footprint. Conviction can make a life coherent; the useful discipline is remembering that a strong commitment is still something you are allowed to examine again.');
      }
      if (scores.curiosity >= 72) {
        pieces.push('Your Bull DNA shows broad exploration. Curiosity keeps a life open, but depth often begins where novelty stops being necessary. Give a few worthwhile things permission to become familiar.');
      }
      if (scores.pacing >= 78) {
        pieces.push('Your Bull DNA shows comparatively measured pacing in the loaded history. Protect that rhythm. Space between actions is not inactivity when it helps you see more clearly.');
      } else if (scores.pacing > 0 && scores.pacing <= 35) {
        pieces.push('Your Bull DNA shows dense periods of activity. Motion can be energizing, but the quality of a decision is rarely improved simply because another decision follows it quickly.');
      }
      if (scores.rotation >= 75) {
        pieces.push('Your Bull DNA shows substantial rotation across the visible range. Variety can be useful; so can learning which choices deserve enough time to reveal what they actually are.');
      }
      if (scores.reliability >= 96) {
        pieces.push('Most visible transactions landed successfully. Quiet competence is easy to overlook because it rarely announces itself. Reliable process is worth appreciating even when the outcome is ordinary.');
      }
      if (dna?.archetype?.name === 'THE WATCHTOWER') {
        pieces.push('The Watchtower pattern is less about waiting forever than about choosing what deserves attention. A calm vantage point can be its own form of progress.');
      }
      return pieces.slice(0, 2);
    } catch (_) {
      return [];
    }
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
