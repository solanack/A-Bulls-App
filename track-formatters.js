/* Track Data formatters + CSV helpers */
(function (global) {
  'use strict';

  function escapeCsv(v) {
    const s = v == null ? '' : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCsv(rows) {
    return rows.map(r => r.map(escapeCsv).join(',')).join('\n');
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function fmtUsd(n) {
    if (n == null || isNaN(n)) return '—';
    const x = Number(n);
    if (Math.abs(x) < 0.01) return '$' + x.toFixed(6);
    return '$' + x.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function fmtSol(n, d) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toFixed(d == null ? 4 : d) + ' SOL';
  }

  /** Simple FIFO lots for estimated trading PnL (SOL-normalized when possible). */
  function fifoPnl(fills) {
    // fills: [{side:'buy'|'sell', amount:number, priceUsd:number|null, ts:number, mint:string}]
    const lots = {}; // mint -> [{amount, costUsd}]
    let realized = 0;
    let closedWins = 0;
    let closedLosses = 0;
    let skipped = 0;
    let priced = 0;

    for (const f of fills || []) {
      if (!f.mint || !(f.amount > 0)) continue;
      if (f.priceUsd == null || isNaN(f.priceUsd)) {
        skipped++;
        continue;
      }
      priced++;
      if (!lots[f.mint]) lots[f.mint] = [];
      if (f.side === 'buy') {
        lots[f.mint].push({ amount: f.amount, costUsd: f.priceUsd * f.amount });
      } else if (f.side === 'sell') {
        let remain = f.amount;
        let proceeds = f.priceUsd * f.amount;
        let cost = 0;
        while (remain > 1e-12 && lots[f.mint].length) {
          const lot = lots[f.mint][0];
          const take = Math.min(lot.amount, remain);
          const lotCost = (lot.costUsd / lot.amount) * take;
          cost += lotCost;
          lot.amount -= take;
          lot.costUsd -= lotCost;
          remain -= take;
          if (lot.amount <= 1e-12) lots[f.mint].shift();
        }
        if (remain > 1e-6) {
          // sold more than tracked basis
          skipped++;
        }
        const pnl = proceeds - cost;
        realized += pnl;
        if (pnl >= 0) closedWins++;
        else closedLosses++;
      }
    }

    let openCost = 0;
    let openAmount = 0;
    Object.values(lots).forEach(arr => {
      arr.forEach(l => {
        openCost += l.costUsd;
        openAmount += l.amount;
      });
    });

    const coverage = priced + skipped === 0 ? 0 : Math.round((priced / (priced + skipped)) * 100);

    return {
      realizedUsd: realized,
      openCostUsd: openCost,
      openLots: openAmount,
      closedWins,
      closedLosses,
      pricedFills: priced,
      skippedFills: skipped,
      coveragePercent: coverage,
      method: 'FIFO',
      label: 'ESTIMATED TRADING PNL',
      disclaimer: 'Analytical estimate only. Not tax, accounting, or financial advice.'
    };
  }

  global.TrackFormatters = {
    escapeCsv,
    toCsv,
    downloadText,
    fmtUsd,
    fmtSol,
    fifoPnl
  };
})(window);
