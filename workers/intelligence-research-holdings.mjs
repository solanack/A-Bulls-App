/**
 * Source-agnostic STAR holdings for the Trickster climax.
 * PnL is matched realized SOL from retained closed rounds only. Missing stays missing.
 */
export const HOLDINGS_PATH = '/api/intelligence/research/holdings';
export const HOLDINGS_METHOD = 'bounded-fifo-observed-swaps-v1';
export const HOLDINGS_LIMIT = 10;

const s = (value) => String(value ?? '').trim();
const finite = (value) => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;

function tokenName(value) {
  const text = s(value);
  return text || null;
}

export function aggregateTraderHoldings(rounds = [], tokens = [], { limit = HOLDINGS_LIMIT } = {}) {
  const cap = Math.max(1, Math.min(HOLDINGS_LIMIT, Math.trunc(Number(limit) || HOLDINGS_LIMIT)));
  const meta = new Map();
  for (const token of Array.isArray(tokens) ? tokens : []) {
    const mint = s(token?.mint);
    if (!mint) continue;
    const current = meta.get(mint) || { name: null, symbol: null };
    meta.set(mint, {
      name: current.name || tokenName(token?.name),
      symbol: current.symbol || tokenName(token?.symbol),
    });
  }
  const byMint = new Map();
  for (const round of Array.isArray(rounds) ? rounds : []) {
    const status = s(round?.status);
    if (status !== 'closed' && status !== 'open') continue;
    const mint = s(round?.mint);
    if (!mint) continue;
    const row = byMint.get(mint) || {
      mint,
      closedCount: 0,
      closedMatchedCount: 0,
      openCount: 0,
      realizedSum: 0,
      hasMatchedRealized: false,
      observedInventory: 0,
      lastObservedAt: 0,
    };
    if (status === 'closed') {
      row.closedCount += 1;
      const realized = finite(round.matchedRealizedSol);
      if (realized != null) {
        row.closedMatchedCount += 1;
        row.hasMatchedRealized = true;
        row.realizedSum += realized;
      }
    } else {
      row.openCount += 1;
      const inventory = finite(round.observedInventory);
      if (inventory != null) row.observedInventory += inventory;
    }
    const ts = Number(round.exitTs ?? round.entryTs ?? round.updatedAt ?? 0);
    if (Number.isFinite(ts) && ts > row.lastObservedAt) row.lastObservedAt = ts;
    byMint.set(mint, row);
  }
  return Object.freeze([...byMint.values()].map((row) => {
    const names = meta.get(row.mint) || { name: null, symbol: null };
    return Object.freeze({
      mint: row.mint,
      name: names.name,
      symbol: names.symbol,
      matchedRealizedSol: row.hasMatchedRealized ? row.realizedSum : null,
      observedInventory: row.openCount ? row.observedInventory : null,
      closedCount: row.closedCount,
      closedMatchedCount: row.closedMatchedCount,
      openCount: row.openCount,
      lastObservedAt: row.lastObservedAt || null,
      sourceKind: 'observed',
      method: HOLDINGS_METHOD,
    });
  }).sort((a, b) => {
    const openDelta = (b.openCount > 0 ? 1 : 0) - (a.openCount > 0 ? 1 : 0);
    if (openDelta) return openDelta;
    const aKnown = a.matchedRealizedSol != null;
    const bKnown = b.matchedRealizedSol != null;
    if (aKnown && bKnown && Math.abs(b.matchedRealizedSol) !== Math.abs(a.matchedRealizedSol)) {
      return Math.abs(b.matchedRealizedSol) - Math.abs(a.matchedRealizedSol);
    }
    if (aKnown !== bKnown) return aKnown ? -1 : 1;
    return (b.lastObservedAt || 0) - (a.lastObservedAt || 0);
  }).slice(0, cap));
}

export function holdingsDisclosure(itemCount) {
  return itemCount
    ? 'Holdings are indexed matched-round observations for this public wallet. Floating PnL is matched realized SOL from closed rounds with known acquisition basis only. Open inventory has no realized result. Unmatched sells are excluded. This is not a skill score or copy-trading signal.'
    : 'No indexed matched holdings exist for this public wallet. Empty coverage stays empty. No PnL was invented.';
}
