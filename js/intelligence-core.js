/* A Bulls App — Bull Intelligence Core v1
 * Pure, read-only transformation layer for normalized public-chain events.
 * No execution, signing, prediction, identity inference, or fabricated history.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BBRIntelligenceCore = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const EVENT_CLASSES = new Set([
    'swap-like', 'transfer', 'mint', 'burn', 'nft-sale', 'nft-list', 'nft-transfer',
    'staking-like', 'fee', 'unknown'
  ]);

  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamp01 = value => Math.max(0, Math.min(1, num(value)));
  const clamp100 = value => Math.max(0, Math.min(100, num(value)));
  const text = value => String(value == null ? '' : value).trim();

  function classifyEvent(raw = {}) {
    const explicit = text(raw.eventClass || raw.event_class).toLowerCase();
    if (EVENT_CLASSES.has(explicit)) return explicit;
    const type = text(raw.type || raw.kind || raw.description).toLowerCase();
    if (/nft.*sale|sale.*nft/.test(type)) return 'nft-sale';
    if (/nft.*list|list.*nft/.test(type)) return 'nft-list';
    if (/nft.*transfer|transfer.*nft/.test(type)) return 'nft-transfer';
    if (/swap|trade|buy|sell/.test(type)) return 'swap-like';
    if (/mint/.test(type)) return 'mint';
    if (/burn/.test(type)) return 'burn';
    if (/stake|unstake|delegate/.test(type)) return 'staking-like';
    if (/transfer|send|receive/.test(type)) return 'transfer';
    return 'unknown';
  }

  function normalizeEvent(raw = {}, observedWallet = '') {
    const wallet = text(raw.wallet || raw.owner || raw.address || observedWallet);
    const blockTime = num(raw.blockTime || raw.block_time || raw.timestamp || raw.time);
    const feeLamports = Math.max(0, Math.round(num(raw.feeLamports || raw.fee_lamports || raw.fee)));
    const tokenDelta = num(raw.tokenDelta ?? raw.token_delta ?? raw.amountDelta ?? raw.netTokenChange);
    const solDelta = num(raw.solDelta ?? raw.sol_delta ?? raw.netSolChange);
    const priceUsd = num(raw.priceUsd ?? raw.price_usd ?? raw.historicalPriceUsd);
    return {
      signature: text(raw.signature || raw.txid || raw.txHash),
      slot: Math.max(0, Math.round(num(raw.slot))),
      blockTime: Math.max(0, Math.round(blockTime)),
      wallet,
      counterparty: text(raw.counterparty || raw.otherWallet || raw.peer),
      programId: text(raw.programId || raw.program_id || raw.program),
      mint: text(raw.mint || raw.tokenMint || raw.assetId),
      collection: text(raw.collection || raw.collectionId),
      eventClass: classifyEvent(raw),
      solDelta,
      tokenDelta,
      feeLamports,
      priceUsd: priceUsd > 0 ? priceUsd : null,
      source: text(raw.source || 'normalized-client'),
      confidence: clamp01(raw.confidence == null ? 1 : raw.confidence),
      decoderVersion: text(raw.decoderVersion || raw.decoder_version)
    };
  }

  function normalizeEvents(rows = [], observedWallet = '') {
    if (!Array.isArray(rows)) return [];
    return rows
      .map(row => normalizeEvent(row, observedWallet))
      .filter(row => row.signature || row.blockTime || row.mint || row.solDelta || row.tokenDelta)
      .sort((a, b) => a.blockTime - b.blockTime || a.slot - b.slot || a.signature.localeCompare(b.signature));
  }

  function reconstructAt(rows = [], timestamp = Infinity) {
    const cutoff = Number.isFinite(Number(timestamp)) ? Number(timestamp) : Infinity;
    const events = normalizeEvents(rows).filter(event => event.blockTime <= cutoff);
    const tokens = new Map();
    let solBalanceDelta = 0;
    let feesLamports = 0;
    let firstSeen = null;
    let lastSeen = null;

    for (const event of events) {
      if (event.blockTime) {
        firstSeen = firstSeen == null ? event.blockTime : Math.min(firstSeen, event.blockTime);
        lastSeen = lastSeen == null ? event.blockTime : Math.max(lastSeen, event.blockTime);
      }
      solBalanceDelta += event.solDelta;
      feesLamports += event.feeLamports;
      if (event.mint && event.tokenDelta) {
        const current = tokens.get(event.mint) || { mint: event.mint, quantityDelta: 0, events: 0, lastPriceUsd: null, lastSeen: null };
        current.quantityDelta += event.tokenDelta;
        current.events += 1;
        if (event.priceUsd) current.lastPriceUsd = event.priceUsd;
        if (event.blockTime) current.lastSeen = event.blockTime;
        tokens.set(event.mint, current);
      }
    }

    return {
      timestamp: cutoff === Infinity ? null : cutoff,
      eventCount: events.length,
      firstSeen,
      lastSeen,
      solBalanceDelta,
      feesLamports,
      feesSol: feesLamports / 1_000_000_000,
      positions: [...tokens.values()]
        .filter(position => Math.abs(position.quantityDelta) > 1e-12)
        .sort((a, b) => Math.abs(b.quantityDelta) - Math.abs(a.quantityDelta)),
      coverage: {
        source: 'normalized-events',
        complete: false,
        statement: 'Reconstruction includes only the normalized events supplied to this calculation.'
      }
    };
  }

  function priceObservations(events, mint) {
    return events
      .filter(event => event.mint === mint && event.priceUsd && event.blockTime)
      .map(event => ({ time: event.blockTime, priceUsd: event.priceUsd }))
      .sort((a, b) => a.time - b.time);
  }

  function firstObservationAtOrAfter(observations, time) {
    for (const point of observations) if (point.time >= time) return point;
    return null;
  }

  function simulateFixedHold(rows = [], options = {}) {
    const holdSeconds = Math.max(60, Math.round(num(options.holdSeconds || options.hold_seconds || 86400)));
    const events = normalizeEvents(rows);
    const buys = events.filter(event => event.mint && event.tokenDelta > 0 && event.priceUsd && event.blockTime);
    const observations = new Map();
    for (const event of events) {
      if (!event.mint || !event.priceUsd || !event.blockTime) continue;
      if (!observations.has(event.mint)) observations.set(event.mint, []);
      observations.get(event.mint).push({ time: event.blockTime, priceUsd: event.priceUsd });
    }
    for (const list of observations.values()) list.sort((a, b) => a.time - b.time);

    const legs = [];
    let entryValueUsd = 0;
    let simulatedExitValueUsd = 0;
    let missingExitPrice = 0;

    for (const buy of buys) {
      const quantity = buy.tokenDelta;
      const entry = quantity * buy.priceUsd;
      const targetTime = buy.blockTime + holdSeconds;
      const exit = firstObservationAtOrAfter(observations.get(buy.mint) || [], targetTime);
      entryValueUsd += entry;
      if (!exit) {
        missingExitPrice += 1;
        legs.push({ mint: buy.mint, quantity, entryTime: buy.blockTime, entryPriceUsd: buy.priceUsd, targetTime, exitTime: null, exitPriceUsd: null, entryValueUsd: entry, simulatedExitValueUsd: null, pnlUsd: null });
        continue;
      }
      const exitValue = quantity * exit.priceUsd;
      simulatedExitValueUsd += exitValue;
      legs.push({ mint: buy.mint, quantity, entryTime: buy.blockTime, entryPriceUsd: buy.priceUsd, targetTime, exitTime: exit.time, exitPriceUsd: exit.priceUsd, entryValueUsd: entry, simulatedExitValueUsd: exitValue, pnlUsd: exitValue - entry });
    }

    const pricedEntryValue = legs.filter(leg => leg.simulatedExitValueUsd != null).reduce((sum, leg) => sum + leg.entryValueUsd, 0);
    return {
      rule: { type: 'fixed-hold', holdSeconds },
      buyLegs: buys.length,
      pricedLegs: buys.length - missingExitPrice,
      missingExitPrice,
      entryValueUsd,
      pricedEntryValueUsd,
      simulatedExitValueUsd,
      simulatedPnlUsd: simulatedExitValueUsd - pricedEntryValue,
      returnPercent: pricedEntryValue > 0 ? (simulatedExitValueUsd / pricedEntryValue - 1) * 100 : null,
      legs,
      coverage: {
        complete: buys.length > 0 && missingExitPrice === 0,
        statement: missingExitPrice ? 'Some buy legs have no later observed historical price at the requested holding horizon.' : 'Every simulated leg uses an observed historical price supplied in the event set.'
      }
    };
  }

  function ratioScore(current, baseline, neutral = 50, scale = 50) {
    const c = num(current), b = num(baseline);
    if (b <= 0) return c > 0 ? Math.min(100, neutral + scale) : neutral;
    const ratio = c / b;
    return clamp100(neutral + (ratio - 1) * scale);
  }

  function scoreRadar(current = {}, baseline = {}) {
    const cWallets = num(current.uniqueWallets);
    const bWallets = num(baseline.uniqueWallets);
    const cInbound = num(current.inboundWallets);
    const bInbound = num(baseline.inboundWallets);
    const cOutbound = num(current.outboundWallets);
    const bOutbound = num(baseline.outboundWallets);
    const cLong = num(current.longDurationWallets);
    const bLong = num(baseline.longDurationWallets);
    const cNew = num(current.newWallets);
    const bNew = num(baseline.newWallets);

    const convergence = ratioScore(cWallets, bWallets, 35, 45);
    const accumulation = ratioScore(cInbound, bInbound, 35, 42);
    const distribution = ratioScore(cOutbound, bOutbound, 35, 42);
    const longDurationShift = ratioScore(cLong, bLong, 35, 38);
    const freshWalletShift = ratioScore(cNew, bNew, 35, 38);
    const strongest = Math.max(convergence, accumulation, distribution, longDurationShift, freshWalletShift);
    const sampleFactor = clamp01(cWallets / 25);
    const severity = clamp100(strongest * (.55 + sampleFactor * .45));

    let type = 'activity-shift';
    const scores = [
      ['wallet-convergence', convergence],
      ['inbound-convergence', accumulation],
      ['outbound-distribution', distribution],
      ['long-duration-shift', longDurationShift],
      ['fresh-wallet-shift', freshWalletShift]
    ].sort((a, b) => b[1] - a[1]);
    if (scores[0]) type = scores[0][0];

    return {
      type,
      severity,
      sampleSize: cWallets,
      scores: { convergence, accumulation, distribution, longDurationShift, freshWalletShift },
      evidence: { current: { uniqueWallets: cWallets, inboundWallets: cInbound, outboundWallets: cOutbound, longDurationWallets: cLong, newWallets: cNew }, baseline: { uniqueWallets: bWallets, inboundWallets: bInbound, outboundWallets: bOutbound, longDurationWallets: bLong, newWallets: bNew } },
      interpretation: 'Anomaly score describes deviation from the supplied historical baseline; it is not a price prediction or trading recommendation.'
    };
  }

  function scoreWeather(input = {}) {
    const scores = {
      activity: clamp100(input.activityScore ?? input.activity),
      volatility: clamp100(input.volatilityScore ?? input.volatility),
      concentration: clamp100(input.concentrationScore ?? input.concentration),
      rotation: clamp100(input.rotationScore ?? input.rotation),
      convergence: clamp100(input.convergenceScore ?? input.convergence),
      nftActivity: clamp100(input.nftActivityScore ?? input.nftActivity)
    };
    const average = Object.values(scores).reduce((sum, value) => sum + value, 0) / 6;
    let regime = 'clear';
    if (scores.volatility >= 72 && scores.activity >= 65) regime = 'storm';
    else if (scores.rotation >= 72 && scores.activity >= 60) regime = 'migration';
    else if (scores.activity >= 78 && scores.volatility < 72) regime = 'heat-wave';
    else if (scores.convergence >= 72 && scores.concentration >= 62) regime = 'whale-migration';
    else if (scores.activity <= 35 && scores.volatility <= 40) regime = 'calm';
    else if (scores.concentration >= 70 && scores.activity <= 55) regime = 'fog';

    return {
      regime,
      compositeScore: clamp100(average),
      scores,
      interpretation: 'Solana Weather is a visual metaphor for supplied aggregate chain metrics, not a market forecast.'
    };
  }

  return Object.freeze({
    EVENT_CLASSES,
    classifyEvent,
    normalizeEvent,
    normalizeEvents,
    reconstructAt,
    simulateFixedHold,
    scoreRadar,
    scoreWeather
  });
});
