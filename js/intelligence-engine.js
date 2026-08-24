/* Bull Intelligence Engine v0.1
 * Pure, read-only derivation helpers. No wallet connection or transaction execution.
 */
(function (global) {
  'use strict';

  const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(n) || 0));
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const days = ms => Math.max(0, ms / 86_400_000);

  function normalizeActivity(input) {
    const rows = Array.isArray(input) ? input : [];
    return rows.map((row, index) => ({
      id: row.signature || row.id || String(index),
      time: Number(new Date(row.blockTime || row.timestamp || row.time || 0)) || 0,
      mint: String(row.mint || row.tokenMint || row.asset || ''),
      kind: String(row.kind || row.type || row.side || 'unknown').toLowerCase(),
      amount: Math.abs(finite(row.amount ?? row.tokenAmount ?? row.quantity)),
      usd: Math.abs(finite(row.usd ?? row.usdValue ?? row.valueUsd)),
      pnl: finite(row.pnl ?? row.realizedPnl ?? row.realizedPnlUsd),
      drawdown: Math.abs(finite(row.drawdown ?? row.drawdownPct)),
      balanceAfter: finite(row.balanceAfter ?? row.postBalance)
    })).filter(row => row.time > 0 || row.mint || row.amount || row.usd);
  }

  function summarize(activity) {
    const rows = normalizeActivity(activity).sort((a, b) => a.time - b.time);
    const mints = new Set(rows.map(x => x.mint).filter(Boolean));
    const buys = rows.filter(x => /buy|swap_in|inflow/.test(x.kind));
    const sells = rows.filter(x => /sell|swap_out|outflow/.test(x.kind));
    const realized = rows.reduce((sum, x) => sum + x.pnl, 0);
    const activeSpanDays = rows.length > 1 ? days(rows.at(-1).time - rows[0].time) : 0;
    const totalUsd = rows.reduce((sum, x) => sum + x.usd, 0);
    const maxTicket = rows.reduce((max, x) => Math.max(max, x.usd), 0);
    const concentration = totalUsd > 0 ? maxTicket / totalUsd : 0;
    const avgDrawdown = rows.length ? rows.reduce((sum, x) => sum + x.drawdown, 0) / rows.length : 0;
    return { rows, mints: mints.size, buys: buys.length, sells: sells.length, realized, activeSpanDays, totalUsd, concentration, avgDrawdown };
  }

  function score(activity) {
    const s = summarize(activity);
    const tx = Math.max(1, s.rows.length);
    const turnover = Math.min(1, (s.buys + s.sells) / tx);
    const diversity = Math.min(1, s.mints / Math.max(1, Math.sqrt(tx) * 3));
    const patienceBasis = Math.min(1, s.activeSpanDays / Math.max(30, tx));
    const exitRatio = s.buys ? Math.min(1, s.sells / s.buys) : 0;

    const dimensions = {
      conviction: clamp(100 * (0.72 * s.concentration + 0.28 * (1 - diversity))),
      curiosity: clamp(100 * diversity),
      patience: clamp(100 * patienceBasis),
      rotation: clamp(100 * turnover),
      concentration: clamp(100 * s.concentration),
      drawdownExposure: clamp(s.avgDrawdown),
      realizedExitTendency: clamp(100 * exitRatio)
    };

    const evidence = {
      transactionCount: s.rows.length,
      distinctAssets: s.mints,
      buyLikeEvents: s.buys,
      sellLikeEvents: s.sells,
      observedSpanDays: Math.round(s.activeSpanDays * 10) / 10,
      observedUsdActivity: Math.round(s.totalUsd * 100) / 100,
      realizedPnlObserved: Math.round(s.realized * 100) / 100
    };

    return { dimensions, evidence, coverage: { eventCount: s.rows.length, historical: s.activeSpanDays > 0 } };
  }

  function archetype(result) {
    const d = result?.dimensions || {};
    if (d.curiosity >= 72 && d.rotation >= 65) return { name: 'The Tourist', reason: 'High asset variety and frequent rotation in the observed history.' };
    if (d.conviction >= 72 && d.patience >= 60) return { name: 'The Diamond Bull', reason: 'Concentrated activity paired with a longer observed time horizon.' };
    if (d.drawdownExposure >= 65 && d.realizedExitTendency <= 35) return { name: 'The Round Tripper', reason: 'Large observed drawdown exposure with relatively few exit-like events.' };
    if (d.curiosity >= 65 && d.patience >= 55) return { name: 'The Archaeologist', reason: 'Broad exploration across assets over a longer observed period.' };
    if (d.realizedExitTendency >= 75 && d.rotation >= 55) return { name: 'The Escape Artist', reason: 'Frequent exit-like activity relative to entries in the observed history.' };
    return { name: 'The Pathfinder', reason: 'A mixed behavioral profile without one dominant observed tendency.' };
  }

  function museum(activity) {
    const rows = normalizeActivity(activity).sort((a, b) => a.time - b.time);
    if (!rows.length) return { exhibits: [] };
    const oldest = rows.find(x => x.mint) || rows[0];
    const bestExit = [...rows].filter(x => x.pnl > 0).sort((a, b) => b.pnl - a.pnl)[0];
    const worst = [...rows].filter(x => x.pnl < 0).sort((a, b) => a.pnl - b.pnl)[0];
    const largestDrawdown = [...rows].sort((a, b) => b.drawdown - a.drawdown)[0];
    const exhibits = [];
    if (oldest) exhibits.push({ key: 'ancient-relic', title: 'Ancient Relic', event: oldest });
    if (bestExit) exhibits.push({ key: 'great-escape', title: 'Great Escape', event: bestExit });
    if (worst) exhibits.push({ key: 'graveyard', title: 'Graveyard', event: worst });
    if (largestDrawdown?.drawdown > 0) exhibits.push({ key: 'round-trip', title: 'Round Trip', event: largestDrawdown });
    return { exhibits };
  }

  function compare(leftActivity, rightActivity) {
    const left = score(leftActivity);
    const right = score(rightActivity);
    const rounds = Object.keys(left.dimensions).map(key => ({
      key,
      left: left.dimensions[key],
      right: right.dimensions[key],
      winner: left.dimensions[key] === right.dimensions[key] ? 'tie' : left.dimensions[key] > right.dimensions[key] ? 'left' : 'right'
    }));
    return { left, right, rounds };
  }

  global.BBRSIntelligenceEngine = Object.freeze({ normalizeActivity, summarize, score, archetype, museum, compare });
})(window);
