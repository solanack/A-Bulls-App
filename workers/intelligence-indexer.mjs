/* A Bulls App — staged Bull Intelligence indexer
 * Source-agnostic normalization/persistence layer inspired by the indexing patterns
 * studied in Carbon/Squid. It accepts decoded public-chain observations; it does not
 * fetch, sign, submit, or control transactions.
 */

const EVENT_CLASSES = new Set([
  'swap-like', 'transfer', 'mint', 'burn', 'nft-sale', 'nft-list', 'nft-transfer',
  'staking-like', 'fee', 'unknown'
]);

const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const s = value => String(value == null ? '' : value).trim();
const clamp01 = value => Math.max(0, Math.min(1, n(value)));

export function intelligenceDb(env = {}) {
  const db = env.INTELLIGENCE_DB || env.BULL_INTELLIGENCE_DB || env.LEADERBOARD_DB || env.DB;
  return db && typeof db.prepare === 'function' ? db : null;
}

export function normalizeIndexedEvent(raw = {}, observedWallet = '') {
  const explicit = s(raw.eventClass || raw.event_class).toLowerCase();
  const type = s(raw.type || raw.kind || raw.description).toLowerCase();
  let eventClass = EVENT_CLASSES.has(explicit) ? explicit : 'unknown';
  if (eventClass === 'unknown') {
    if (/nft.*sale|sale.*nft/.test(type)) eventClass = 'nft-sale';
    else if (/nft.*list|list.*nft/.test(type)) eventClass = 'nft-list';
    else if (/nft.*transfer|transfer.*nft/.test(type)) eventClass = 'nft-transfer';
    else if (/swap|trade|buy|sell/.test(type)) eventClass = 'swap-like';
    else if (/mint/.test(type)) eventClass = 'mint';
    else if (/burn/.test(type)) eventClass = 'burn';
    else if (/stake|unstake|delegate/.test(type)) eventClass = 'staking-like';
    else if (/transfer|send|receive/.test(type)) eventClass = 'transfer';
  }
  return {
    signature: s(raw.signature || raw.txid || raw.txHash),
    slot: Math.max(0, Math.round(n(raw.slot))),
    blockTime: Math.max(0, Math.round(n(raw.blockTime || raw.block_time || raw.timestamp || raw.time))),
    wallet: s(raw.wallet || raw.owner || raw.address || observedWallet),
    counterparty: s(raw.counterparty || raw.otherWallet || raw.peer),
    programId: s(raw.programId || raw.program_id || raw.program),
    mint: s(raw.mint || raw.tokenMint || raw.assetId),
    collection: s(raw.collection || raw.collectionId),
    eventClass,
    solDelta: n(raw.solDelta ?? raw.sol_delta ?? raw.netSolChange),
    tokenDelta: n(raw.tokenDelta ?? raw.token_delta ?? raw.amountDelta ?? raw.netTokenChange),
    feeLamports: Math.max(0, Math.round(n(raw.feeLamports || raw.fee_lamports || raw.fee))),
    source: s(raw.source || 'worker-decoder'),
    confidence: clamp01(raw.confidence == null ? 1 : raw.confidence),
    decoderVersion: s(raw.decoderVersion || raw.decoder_version)
  };
}

export function normalizeIndexedEvents(rows = [], observedWallet = '') {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(row => normalizeIndexedEvent(row, observedWallet))
    .filter(row => row.wallet && (row.signature || row.blockTime || row.mint || row.solDelta || row.tokenDelta))
    .sort((a, b) => a.blockTime - b.blockTime || a.slot - b.slot || a.signature.localeCompare(b.signature));
}

export function deriveWalletWindow(events = [], wallet = '', windowKey = 'custom') {
  const rows = normalizeIndexedEvents(events, wallet).filter(row => !wallet || row.wallet === wallet);
  const days = new Set();
  const mints = new Set();
  let swaps = 0;
  let failures = 0;
  let solIn = 0;
  let solOut = 0;
  let feesLamports = 0;
  let first = null;
  let last = null;

  for (const row of rows) {
    if (row.blockTime) {
      first = first == null ? row.blockTime : Math.min(first, row.blockTime);
      last = last == null ? row.blockTime : Math.max(last, row.blockTime);
      days.add(new Date(row.blockTime * 1000).toISOString().slice(0, 10));
    }
    if (row.mint) mints.add(row.mint);
    if (row.eventClass === 'swap-like') swaps += 1;
    if (row.confidence <= 0) failures += 1;
    if (row.solDelta > 0) solIn += row.solDelta;
    if (row.solDelta < 0) solOut += Math.abs(row.solDelta);
    feesLamports += row.feeLamports;
  }

  return {
    wallet: wallet || rows[0]?.wallet || '',
    windowKey,
    windowStart: first || 0,
    windowEnd: last || 0,
    txCount: new Set(rows.map(row => row.signature).filter(Boolean)).size || rows.length,
    activeDays: days.size,
    swaps,
    uniqueMints: mints.size,
    failures,
    solIn,
    solOut,
    feesSol: feesLamports / 1_000_000_000
  };
}

export function deriveRelationships(events = [], wallet = '') {
  const rows = normalizeIndexedEvents(events, wallet).filter(row => row.wallet && row.counterparty);
  const map = new Map();
  for (const row of rows) {
    const a = row.wallet;
    const b = row.counterparty;
    if (!a || !b || a === b) continue;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const current = map.get(key) || {
      walletA: a < b ? a : b,
      walletB: a < b ? b : a,
      firstSeen: null,
      lastSeen: null,
      interactionCount: 0,
      solVolume: 0,
      tokenEventCount: 0,
      relationshipTypes: new Set()
    };
    current.interactionCount += 1;
    current.solVolume += Math.abs(row.solDelta);
    if (row.mint && row.tokenDelta) current.tokenEventCount += 1;
    current.relationshipTypes.add(row.eventClass);
    if (row.blockTime) {
      current.firstSeen = current.firstSeen == null ? row.blockTime : Math.min(current.firstSeen, row.blockTime);
      current.lastSeen = current.lastSeen == null ? row.blockTime : Math.max(current.lastSeen, row.blockTime);
    }
    map.set(key, current);
  }
  return [...map.values()].map(item => ({ ...item, relationshipTypes: [...item.relationshipTypes].sort() }));
}

export function deriveTokenCohorts(events = [], bucketStart = 0, bucketSeconds = 3600) {
  const rows = normalizeIndexedEvents(events);
  const map = new Map();
  for (const row of rows) {
    if (!row.mint || !row.wallet) continue;
    const current = map.get(row.mint) || {
      mint: row.mint,
      bucketStart,
      bucketSeconds,
      wallets: new Set(),
      inboundWallets: new Set(),
      outboundWallets: new Set(),
      eventCount: 0
    };
    current.wallets.add(row.wallet);
    if (row.tokenDelta > 0) current.inboundWallets.add(row.wallet);
    if (row.tokenDelta < 0) current.outboundWallets.add(row.wallet);
    current.eventCount += 1;
    map.set(row.mint, current);
  }
  return [...map.values()].map(item => ({
    mint: item.mint,
    bucketStart: item.bucketStart,
    bucketSeconds: item.bucketSeconds,
    uniqueWallets: item.wallets.size,
    inboundWallets: item.inboundWallets.size,
    outboundWallets: item.outboundWallets.size,
    eventCount: item.eventCount
  }));
}

async function persistEvents(db, events) {
  if (!events.length) return 0;
  const statements = events.map(row => db.prepare(`
    INSERT OR IGNORE INTO bull_wallet_events
      (signature, slot, block_time, wallet, counterparty, program_id, mint, collection,
       event_class, sol_delta, token_delta, fee_lamports, source, confidence, decoder_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    row.signature, row.slot || null, row.blockTime || null, row.wallet,
    row.counterparty || null, row.programId || null, row.mint || null, row.collection || null,
    row.eventClass, row.solDelta, row.tokenDelta, row.feeLamports, row.source,
    row.confidence, row.decoderVersion || null
  ));
  if (typeof db.batch === 'function') await db.batch(statements);
  else for (const stmt of statements) await stmt.run();
  return statements.length;
}

async function persistWindow(db, summary) {
  if (!summary.wallet) return;
  await db.prepare(`
    INSERT INTO bull_wallet_windows
      (wallet, window_key, window_start, window_end, tx_count, active_days, swaps,
       unique_mints, failures, sol_in, sol_out, fees_sol, payload_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(wallet, window_key, window_start) DO UPDATE SET
      window_end=excluded.window_end, tx_count=excluded.tx_count, active_days=excluded.active_days,
      swaps=excluded.swaps, unique_mints=excluded.unique_mints, failures=excluded.failures,
      sol_in=excluded.sol_in, sol_out=excluded.sol_out, fees_sol=excluded.fees_sol,
      payload_json=excluded.payload_json, updated_at=unixepoch()
  `).bind(
    summary.wallet, summary.windowKey, summary.windowStart, summary.windowEnd,
    summary.txCount, summary.activeDays, summary.swaps, summary.uniqueMints,
    summary.failures, summary.solIn, summary.solOut, summary.feesSol,
    JSON.stringify({ coverage: 'normalized-observations' })
  ).run();
}

async function persistRelationships(db, relationships) {
  for (const row of relationships) {
    await db.prepare(`
      INSERT INTO bull_wallet_relationships
        (wallet_a, wallet_b, first_seen, last_seen, interaction_count, sol_volume,
         token_event_count, relationship_types, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(wallet_a, wallet_b) DO UPDATE SET
        first_seen=MIN(COALESCE(first_seen, excluded.first_seen), COALESCE(excluded.first_seen, first_seen)),
        last_seen=MAX(COALESCE(last_seen, excluded.last_seen), COALESCE(excluded.last_seen, last_seen)),
        interaction_count=MAX(interaction_count, excluded.interaction_count),
        sol_volume=MAX(sol_volume, excluded.sol_volume),
        token_event_count=MAX(token_event_count, excluded.token_event_count),
        relationship_types=excluded.relationship_types,
        updated_at=unixepoch()
    `).bind(
      row.walletA, row.walletB, row.firstSeen, row.lastSeen, row.interactionCount,
      row.solVolume, row.tokenEventCount, JSON.stringify(row.relationshipTypes)
    ).run();
  }
}

async function persistCohorts(db, cohorts) {
  for (const row of cohorts) {
    await db.prepare(`
      INSERT INTO bull_token_cohorts
        (mint, bucket_start, bucket_seconds, unique_wallets, inbound_wallets, outbound_wallets,
         long_duration_wallets, new_wallets, payload_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, unixepoch())
      ON CONFLICT(mint, bucket_start, bucket_seconds) DO UPDATE SET
        unique_wallets=excluded.unique_wallets,
        inbound_wallets=excluded.inbound_wallets,
        outbound_wallets=excluded.outbound_wallets,
        payload_json=excluded.payload_json,
        updated_at=unixepoch()
    `).bind(
      row.mint, row.bucketStart, row.bucketSeconds, row.uniqueWallets,
      row.inboundWallets, row.outboundWallets, JSON.stringify({ eventCount: row.eventCount })
    ).run();
  }
}

export async function ingestDecodedObservations(env = {}, observedWallet = '', rows = [], options = {}) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('Bull Intelligence D1 binding is unavailable.');
  const events = normalizeIndexedEvents(rows, observedWallet);
  const windowKey = s(options.windowKey || 'observed');
  const bucketSeconds = Math.max(60, Math.round(n(options.bucketSeconds || 3600)));
  const bucketStart = Math.floor(n(options.bucketStart || (events[0]?.blockTime || 0)) / bucketSeconds) * bucketSeconds;
  const window = deriveWalletWindow(events, observedWallet, windowKey);
  const relationships = deriveRelationships(events, observedWallet);
  const cohorts = deriveTokenCohorts(events, bucketStart, bucketSeconds);

  await persistEvents(db, events);
  await persistWindow(db, window);
  await persistRelationships(db, relationships);
  await persistCohorts(db, cohorts);

  return {
    accepted: events.length,
    window,
    relationships: relationships.length,
    cohorts: cohorts.length,
    coverage: 'normalized-observations',
    source: 'bull-intelligence-indexer'
  };
}
