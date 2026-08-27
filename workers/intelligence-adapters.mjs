/* A Bulls App — source adapters for Intelligence Mesh.
 * These functions normalize approved read-only source payloads into one contract.
 * Network transport is intentionally kept outside this module.
 */

const s = v => String(v == null ? '' : v).trim();
const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const clamp01 = v => Math.max(0, Math.min(1, n(v)));

export function normalizeYellowstoneObservation(payload = {}, wallet = '', source = 'yellowstone') {
  const tx = payload.transaction || payload.tx || payload;
  return {
    signature: s(tx.signature || tx.transaction?.signatures?.[0]),
    slot: n(payload.slot || tx.slot),
    blockTime: n(payload.blockTime || tx.blockTime),
    wallet: s(wallet),
    counterparty: s(payload.counterparty),
    programId: s(payload.programId || payload.program_id),
    mint: s(payload.mint),
    eventClass: s(payload.eventClass || payload.event_class || 'unknown'),
    solDelta: n(payload.solDelta || payload.sol_delta),
    tokenDelta: n(payload.tokenDelta || payload.token_delta),
    feeLamports: n(payload.feeLamports || payload.fee_lamports || tx.meta?.fee),
    source,
    confidence: clamp01(payload.confidence == null ? 0.9 : payload.confidence),
    decoderVersion: 'intelligence-yellowstone-v1'
  };
}

export function normalizeSubstreamsSwap(payload = {}, wallet = '', source = 'substreams-svm') {
  const inputAmount = n(payload.inputAmount ?? payload.amount_in ?? payload.amountIn);
  const outputAmount = n(payload.outputAmount ?? payload.amount_out ?? payload.amountOut);
  const inputMint = s(payload.inputMint || payload.input_mint);
  const outputMint = s(payload.outputMint || payload.output_mint);
  return {
    event: {
      signature: s(payload.signature || payload.tx_hash || payload.transaction_id),
      slot: n(payload.slot),
      blockTime: n(payload.blockTime || payload.block_time || payload.timestamp),
      wallet: s(wallet || payload.wallet || payload.owner),
      counterparty: s(payload.pool || payload.amm || payload.venue),
      programId: s(payload.programId || payload.program_id),
      mint: outputMint || inputMint,
      eventClass: 'swap-like',
      solDelta: n(payload.solDelta || payload.sol_delta),
      tokenDelta: n(payload.tokenDelta || payload.token_delta || outputAmount - inputAmount),
      feeLamports: n(payload.feeLamports || payload.fee_lamports),
      source,
      confidence: clamp01(payload.confidence == null ? 0.95 : payload.confidence),
      decoderVersion: 'intelligence-substreams-v1'
    },
    hop: {
      programId: s(payload.programId || payload.program_id),
      venue: s(payload.venue || payload.dex || payload.protocol),
      pool: s(payload.pool || payload.pool_address),
      inputMint,
      outputMint,
      inputAmount,
      outputAmount,
      feeAmount: n(payload.feeAmount || payload.fee_amount),
      feeMint: s(payload.feeMint || payload.fee_mint),
      confidence: clamp01(payload.confidence == null ? 0.95 : payload.confidence)
    },
    swap: {
      blockTime: n(payload.blockTime || payload.block_time || payload.timestamp),
      price: inputAmount > 0 ? outputAmount / inputAmount : 0,
      baseAmount: inputAmount,
      quoteAmount: outputAmount,
      wallet: s(wallet || payload.wallet || payload.owner),
      source,
      confidence: clamp01(payload.confidence == null ? 0.95 : payload.confidence)
    }
  };
}

export function normalizeOldFaithfulTransaction(payload = {}, wallet = '', source = 'old-faithful') {
  return {
    event: {
      signature: s(payload.signature || payload.transaction?.signatures?.[0]),
      slot: n(payload.slot),
      blockTime: n(payload.blockTime || payload.block_time),
      wallet: s(wallet),
      counterparty: s(payload.counterparty),
      programId: s(payload.programId || payload.program_id),
      mint: s(payload.mint),
      eventClass: s(payload.eventClass || payload.event_class || 'unknown'),
      solDelta: n(payload.solDelta || payload.sol_delta),
      tokenDelta: n(payload.tokenDelta || payload.token_delta),
      feeLamports: n(payload.feeLamports || payload.fee_lamports || payload.meta?.fee),
      source,
      confidence: clamp01(payload.confidence == null ? 1 : payload.confidence),
      decoderVersion: 'intelligence-old-faithful-v1'
    },
    verified: true,
    archiveRef: s(payload.archiveRef || payload.archive_ref || payload.cid)
  };
}

export function normalizeAdapterBatch(kind = '', rows = [], wallet = '', source = '') {
  if (!Array.isArray(rows)) return { events: [], routes: [], swaps: [], verified: false, archiveRefs: [] };
  const events = [];
  const routes = [];
  const swaps = [];
  const archiveRefs = [];
  let verified = false;

  for (const row of rows) {
    if (kind === 'substreams') {
      const normalized = normalizeSubstreamsSwap(row, wallet, source || 'substreams-svm');
      events.push(normalized.event);
      routes.push({ signature: normalized.event.signature, wallet: normalized.event.wallet, slot: normalized.event.slot, blockTime: normalized.event.blockTime, source: normalized.event.source, confidence: normalized.event.confidence, hops: [normalized.hop] });
      swaps.push(normalized.swap);
    } else if (kind === 'old-faithful') {
      const normalized = normalizeOldFaithfulTransaction(row, wallet, source || 'old-faithful');
      events.push(normalized.event);
      verified = true;
      if (normalized.archiveRef) archiveRefs.push(normalized.archiveRef);
    } else {
      events.push(normalizeYellowstoneObservation(row, wallet, source || 'yellowstone'));
    }
  }

  return { events, routes, swaps, verified, archiveRefs };
}
