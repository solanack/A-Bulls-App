/* A Bulls App — staged NFT intelligence indexer
 * Source-agnostic normalization/persistence for observed public NFT events.
 * No wallet signing, custody, ownership identity inference, or fabricated pricing.
 */

const NFT_CLASSES = new Set(['nft-sale', 'nft-list', 'nft-transfer', 'nft-mint', 'nft-burn', 'unknown']);
const text = value => String(value == null ? '' : value).trim();
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const clamp01 = value => Math.max(0, Math.min(1, num(value)));

function classify(raw = {}) {
  const explicit = text(raw.eventClass || raw.event_class).toLowerCase();
  if (NFT_CLASSES.has(explicit)) return explicit;
  const type = text(raw.type || raw.kind || raw.description).toLowerCase();
  if (/sale|purchase|buy|sold/.test(type)) return 'nft-sale';
  if (/list|listing/.test(type)) return 'nft-list';
  if (/mint/.test(type)) return 'nft-mint';
  if (/burn/.test(type)) return 'nft-burn';
  if (/transfer|send|receive/.test(type)) return 'nft-transfer';
  return 'unknown';
}

export function normalizeNftEvent(raw = {}, observedWallet = '') {
  const blockTimeRaw = num(raw.blockTime || raw.block_time || raw.timestamp || raw.time);
  const blockTime = blockTimeRaw > 1e12 ? Math.floor(blockTimeRaw / 1000) : Math.floor(blockTimeRaw);
  const eventClass = classify(raw);
  const solValue = num(raw.solValue ?? raw.sol_value ?? raw.priceSol);
  const usdValue = num(raw.usdValue ?? raw.usd_value ?? raw.priceUsd);
  return {
    signature: text(raw.signature || raw.txid || raw.txHash),
    slot: Math.max(0, Math.floor(num(raw.slot))),
    blockTime: Math.max(0, blockTime),
    wallet: text(raw.wallet || raw.owner || raw.address || observedWallet),
    assetId: text(raw.assetId || raw.asset_id || raw.mint || raw.id),
    collection: text(raw.collection || raw.collectionId || raw.collection_id),
    eventClass,
    marketplace: text(raw.marketplace || raw.market || raw.programName),
    counterparty: text(raw.counterparty || raw.otherWallet || raw.peer),
    solValue: solValue > 0 ? solValue : null,
    usdValue: usdValue > 0 ? usdValue : null,
    source: text(raw.source || 'normalized-nft-source'),
    confidence: clamp01(raw.confidence == null ? 1 : raw.confidence),
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : null
  };
}

export function normalizeNftEvents(rows = [], observedWallet = '') {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => normalizeNftEvent(row, observedWallet))
    .filter(row => row.wallet && row.assetId && (row.signature || row.blockTime))
    .sort((a, b) => a.blockTime - b.blockTime || a.assetId.localeCompare(b.assetId));
}

function direction(event, wallet) {
  const raw = text(event.metadata?.direction || event.metadata?.side).toLowerCase();
  if (raw === 'in' || raw === 'acquire' || raw === 'buy') return 'in';
  if (raw === 'out' || raw === 'dispose' || raw === 'sell') return 'out';
  if (event.eventClass === 'nft-mint') return 'in';
  if (event.eventClass === 'nft-burn') return 'out';
  const from = text(event.metadata?.from || event.metadata?.fromWallet);
  const to = text(event.metadata?.to || event.metadata?.toWallet);
  if (to && to === wallet) return 'in';
  if (from && from === wallet) return 'out';
  return 'unknown';
}

export function collectionWindows(rows = [], options = {}) {
  const events = normalizeNftEvents(rows, options.wallet || '');
  const bucketSeconds = Math.max(3600, Math.floor(num(options.bucketSeconds || 86400 * 30)));
  const map = new Map();

  for (const event of events) {
    const collection = event.collection || 'UNVERIFIED_COLLECTION';
    const bucket = event.blockTime ? Math.floor(event.blockTime / bucketSeconds) * bucketSeconds : 0;
    const key = `${event.wallet}|${collection}|${bucket}`;
    const item = map.get(key) || {
      wallet: event.wallet,
      collection,
      windowStart: bucket,
      windowEnd: bucket + bucketSeconds,
      acquiredCount: 0,
      disposedCount: 0,
      transferInCount: 0,
      transferOutCount: 0,
      assets: new Set(),
      firstSeen: null,
      lastSeen: null,
      observedSolIn: 0,
      observedSolOut: 0
    };
    item.assets.add(event.assetId);
    if (event.blockTime) {
      item.firstSeen = item.firstSeen == null ? event.blockTime : Math.min(item.firstSeen, event.blockTime);
      item.lastSeen = item.lastSeen == null ? event.blockTime : Math.max(item.lastSeen, event.blockTime);
    }
    const dir = direction(event, event.wallet);
    if (dir === 'in') {
      if (event.eventClass === 'nft-transfer') item.transferInCount += 1;
      else item.acquiredCount += 1;
      if (event.solValue) item.observedSolOut += event.solValue;
    } else if (dir === 'out') {
      if (event.eventClass === 'nft-transfer') item.transferOutCount += 1;
      else item.disposedCount += 1;
      if (event.solValue) item.observedSolIn += event.solValue;
    }
    map.set(key, item);
  }

  return [...map.values()].map(item => ({
    ...item,
    uniqueAssets: item.assets.size,
    assets: undefined
  })).sort((a, b) => b.windowStart - a.windowStart || a.collection.localeCompare(b.collection));
}

export function collectionCohorts(rows = [], options = {}) {
  const events = normalizeNftEvents(rows, options.wallet || '');
  const bucketSeconds = Math.max(3600, Math.floor(num(options.bucketSeconds || 86400)));
  const map = new Map();
  for (const event of events) {
    const collection = event.collection || 'UNVERIFIED_COLLECTION';
    const bucket = event.blockTime ? Math.floor(event.blockTime / bucketSeconds) * bucketSeconds : 0;
    const key = `${collection}|${bucket}`;
    const item = map.get(key) || {
      collection,
      bucketStart: bucket,
      bucketSeconds,
      activeWallets: new Set(),
      acquiringWallets: new Set(),
      disposingWallets: new Set(),
      transferWallets: new Set(),
      eventCount: 0
    };
    item.activeWallets.add(event.wallet);
    item.eventCount += 1;
    const dir = direction(event, event.wallet);
    if (event.eventClass === 'nft-transfer') item.transferWallets.add(event.wallet);
    else if (dir === 'in') item.acquiringWallets.add(event.wallet);
    else if (dir === 'out') item.disposingWallets.add(event.wallet);
    map.set(key, item);
  }
  return [...map.values()].map(item => ({
    collection: item.collection,
    bucketStart: item.bucketStart,
    bucketSeconds: item.bucketSeconds,
    activeWallets: item.activeWallets.size,
    acquiringWallets: item.acquiringWallets.size,
    disposingWallets: item.disposingWallets.size,
    transferWallets: item.transferWallets.size,
    eventCount: item.eventCount
  }));
}

export async function persistNftObservations(db, rows = [], options = {}) {
  if (!db || typeof db.prepare !== 'function') return { events: 0, windows: 0, cohorts: 0 };
  const events = normalizeNftEvents(rows, options.wallet || '');
  const windows = collectionWindows(events, options);
  const cohorts = collectionCohorts(events, options);

  let eventWrites = 0;
  for (const event of events) {
    await db.prepare(`INSERT OR IGNORE INTO bull_nft_wallet_events
      (signature,slot,block_time,wallet,asset_id,collection,event_class,marketplace,counterparty,sol_value,usd_value,source,confidence,metadata_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        event.signature, event.slot, event.blockTime, event.wallet, event.assetId,
        event.collection || null, event.eventClass, event.marketplace || null,
        event.counterparty || null, event.solValue, event.usdValue, event.source,
        event.confidence, event.metadata ? JSON.stringify(event.metadata) : null
      ).run();
    eventWrites += 1;
  }

  for (const item of windows) {
    await db.prepare(`INSERT INTO bull_nft_wallet_collection_windows
      (wallet,collection,window_start,window_end,acquired_count,disposed_count,transfer_in_count,transfer_out_count,unique_assets,first_seen,last_seen,observed_sol_in,observed_sol_out,payload_json,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,unixepoch())
      ON CONFLICT(wallet,collection,window_start) DO UPDATE SET
        window_end=excluded.window_end, acquired_count=excluded.acquired_count,
        disposed_count=excluded.disposed_count, transfer_in_count=excluded.transfer_in_count,
        transfer_out_count=excluded.transfer_out_count, unique_assets=excluded.unique_assets,
        first_seen=excluded.first_seen, last_seen=excluded.last_seen,
        observed_sol_in=excluded.observed_sol_in, observed_sol_out=excluded.observed_sol_out,
        payload_json=excluded.payload_json, updated_at=unixepoch()`).bind(
          item.wallet, item.collection, item.windowStart, item.windowEnd,
          item.acquiredCount, item.disposedCount, item.transferInCount, item.transferOutCount,
          item.uniqueAssets, item.firstSeen, item.lastSeen, item.observedSolIn,
          item.observedSolOut, JSON.stringify({ coverage: 'observed-indexed' })
        ).run();
  }

  for (const item of cohorts) {
    await db.prepare(`INSERT INTO bull_nft_collection_cohorts
      (collection,bucket_start,bucket_seconds,active_wallets,acquiring_wallets,disposing_wallets,transfer_wallets,event_count,payload_json,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,unixepoch())
      ON CONFLICT(collection,bucket_start,bucket_seconds) DO UPDATE SET
        active_wallets=excluded.active_wallets, acquiring_wallets=excluded.acquiring_wallets,
        disposing_wallets=excluded.disposing_wallets, transfer_wallets=excluded.transfer_wallets,
        event_count=excluded.event_count, payload_json=excluded.payload_json, updated_at=unixepoch()`).bind(
          item.collection, item.bucketStart, item.bucketSeconds, item.activeWallets,
          item.acquiringWallets, item.disposingWallets, item.transferWallets,
          item.eventCount, JSON.stringify({ coverage: 'observed-indexed' })
        ).run();
  }

  return { events: eventWrites, windows: windows.length, cohorts: cohorts.length };
}
