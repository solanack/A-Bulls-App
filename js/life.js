/* LIFE — sophisticated, supportive reflection from public Solana trading activity. */
(function (global) {
  'use strict';

  const byId = id => document.getElementById(id);
  const safe = value => global.BBRPlatform?.escapeHtml ? BBRPlatform.escapeHtml(value) : String(value ?? '');
  const ranges = new Set(['30d', '90d', 'all']);

  function walletState() {
    return global.BBRWalletAnalytics?.getState?.() || {};
  }

  function adviceSet(overview, activity) {
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
    const ansemNet = Number(activity?.ansem?.net || 0);
    const pieces = [];

    if (txs && activeDays) {
      const density = txs / Math.max(1, activeDays);
      pieces.push(density >= 8
        ? 'Your history contains periods of concentrated action. Urgency and importance are different things; give the next consequential choice enough silence to become deliberate.'
        : 'Your activity leaves room between decisions. Keep protecting that space. A measured pace is often where conviction becomes easier to distinguish from impulse.');
    }

    if (swaps >= 8) {
      pieces.push('Frequent rotation can make motion feel like progress. Let a decision earn its place before replacing it; consistency is a form of intelligence when it is chosen rather than automatic.');
    } else if (swaps > 0) {
      pieces.push('You have changed positions without turning every moment into a reaction. Carry that same selectivity beyond markets: not every opportunity deserves a response.');
    }

    if (Number.isFinite(topHolding) && topHolding >= 45) {
      pieces.push('A concentrated position reflects commitment, but commitment is strongest when it remains revisable. Confidence and flexibility can occupy the same room.');
    } else if (uniqueMints >= 8) {
      pieces.push('Your attention has been distributed across many assets. Breadth can reveal possibility, but a smaller number of priorities often creates a deeper life.');
    }

    if (solNet < 0) {
      pieces.push('This period shows more SOL leaving than entering. Treat expenditure of capital, time, and attention the same way: spend them where the return is meaning, learning, or genuine joy.');
    } else if (solNet > 0) {
      pieces.push('This period shows more SOL entering than leaving. Accumulation is useful when it creates optionality, not pressure. Resources are most valuable when they widen your choices.');
    }

    if (ansemNet > 0) {
      pieces.push('Your $ANSEM flow leaned inward. The useful lesson is not to cling harder, but to know why you chose to accumulate and to keep that reason separate from the noise around it.');
    } else if (ansemNet < 0) {
      pieces.push('Your $ANSEM flow leaned outward. Let exits be clean when the reason for staying has changed. Releasing a position, plan, or expectation can be an act of clarity.');
    }

    if (failureRate > 0.04) {
      pieces.push('A few transactions did not land as intended. Friction is information. Refine the process rather than judging the person using it.');
    }

    if (busiestDay) {
      pieces.push(`${busiestDay} carried the most activity in this window. Notice the conditions around your most active periods and design your environment so your best decisions are easier to repeat.`);
    }

    pieces.push('A good life, like a good strategy, does not require predicting every turn. It asks for clear principles, enough patience to hear them, and the courage to adjust when reality changes.');
    pieces.push('Keep some part of your day unoptimized. Not everything valuable needs to compound.');

    return [...new Set(pieces)].slice(0, 6);
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
      ['Range', range],
      ['Transactions', txs.toLocaleString()],
      ['Active days', days.toLocaleString()],
      ['Swaps', swaps.toLocaleString()]
    ].map(([label, value]) => `<div><small>${safe(label)}</small><b>${safe(value)}</b></div>`).join('');

    const advice = adviceSet(state.overview, state.activity);
    phase.textContent = '';
    root.innerHTML = `<div class="life-advice-list">${advice.map(piece => `<article>${safe(piece)}</article>`).join('')}</div>`;
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
    render();
  }

  global.BBRLife = Object.freeze({ init, render, analyze });
})(window);
