import { intelligenceDb } from './intelligence-indexer.mjs';

const s = value => String(value ?? '').trim();
const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const clamp = value => Math.max(0, Math.min(1, n(value)));
const uniq = values => [...new Set(values.filter(Boolean))];
const keyPair = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;

function side(row) {
  const cls = s(row.event_class).toLowerCase();
  const token = n(row.token_delta);
  const sol = n(row.sol_delta);
  if (!cls.includes('swap')) return 'other';
  if (token > 0 || sol < 0) return 'buy';
  if (token < 0 || sol > 0) return 'sell';
  return 'trade';
}

function normalizeEvent(row) {
  return {
    id: n(row.id),
    signature: s(row.signature),
    time: n(row.block_time),
    wallet: s(row.wallet),
    counterparty: s(row.counterparty),
    mint: s(row.mint),
    side: side(row),
    solDelta: n(row.sol_delta),
    tokenDelta: n(row.token_delta),
    size: Math.abs(n(row.sol_delta)),
    source: s(row.source)
  };
}

async function queryEvents(db, universeId, from, to, limit) {
  const requested = Math.trunc(n(limit) || 20000);
  const cap = Math.max(500, Math.min(50000, requested));
  const result = universeId === 'solana'
    ? await db.prepare(`
        SELECT id,signature,block_time,wallet,counterparty,mint,event_class,sol_delta,token_delta,source
        FROM bull_wallet_events
        WHERE block_time BETWEEN ? AND ?
        ORDER BY block_time ASC,id ASC
        LIMIT ?
      `).bind(from, to, cap).all()
    : await db.prepare(`
        SELECT e.id,e.signature,e.block_time,e.wallet,e.counterparty,e.mint,e.event_class,e.sol_delta,e.token_delta,e.source
        FROM bull_wallet_events e
        JOIN intelligence_universe_event_links l ON l.event_row_id=e.id AND l.universe_id=?
        WHERE e.block_time BETWEEN ? AND ?
        ORDER BY e.block_time ASC,e.id ASC
        LIMIT ?
      `).bind(universeId, from, to, cap).all();
  return (result?.results || []).map(normalizeEvent).filter(item => item.wallet && item.mint && item.time);
}

function finding(kind, subjectKind, subjectId, score, sampleSize, statement, evidence, counterevidence, alternatives) {
  return {
    kind,
    subjectKind,
    subjectId,
    score: clamp(score),
    sampleSize,
    statement,
    evidence,
    counterevidence,
    alternativeExplanations: alternatives
  };
}

function synchronizedEntryFindings(events) {
  const byMint = new Map();
  for (const item of events) {
    if (item.side !== 'buy') continue;
    if (!byMint.has(item.mint)) byMint.set(item.mint, []);
    byMint.get(item.mint).push(item);
  }

  const findings = [];
  const clusters = [];
  for (const [mint, rows] of byMint) {
    rows.sort((a, b) => a.time - b.time || a.id - b.id);
    let right = 0;
    for (let left = 0; left < rows.length; left += 1) {
      if (right < left) right = left;
      while (right < rows.length && rows[right].time <= rows[left].time + 12) right += 1;
      const window = rows.slice(left, right);
      const wallets = uniq(window.map(item => item.wallet));
      if (wallets.length < 4) continue;
      const totalSol = window.reduce((sum, item) => sum + item.size, 0);
      const sizes = window.map(item => item.size).filter(value => value > 0);
      const average = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
      const similarSizeRatio = average > 0
        ? sizes.filter(value => Math.abs(value - average) / average <= 0.15).length / sizes.length
        : 0;
      const score = clamp(0.35 + Math.min(0.3, wallets.length / 20) + similarSizeRatio * 0.25);
      const clusterId = `sync-entry:${mint}:${Math.floor(rows[left].time / 12)}`;
      clusters.push({
        clusterId,
        kind: 'synchronized-entry',
        windowStart: rows[left].time,
        windowEnd: rows[left].time + 12,
        members: wallets,
        tokens: [mint],
        confidence: score,
        evidence: {
          transactionCount: window.length,
          totalSol,
          similarSizeRatio,
          signatures: window.slice(0, 30).map(item => item.signature)
        },
        alternativeExplanations: [
          'Shared social/news reaction',
          'Launch opening event',
          'Aggregator or routing behavior',
          'Copy trading without common control'
        ]
      });
      findings.push(finding(
        'synchronized-entry',
        'token',
        mint,
        score,
        window.length,
        'Several distinct indexed wallets entered this token within a very short interval. The pattern is anomalous enough to investigate, but does not establish coordination or common control.',
        { walletCount: wallets.length, seconds: 12, totalSol, similarSizeRatio, clusterId },
        { otherBuysOutsideWindow: Math.max(0, rows.length - window.length) },
        ['Organic simultaneous demand', 'Shared alerts', 'Copy trading', 'Launch timing']
      ));
      left = Math.max(left, right - 2);
    }
  }

  const uniqueFindings = new Map();
  const uniqueClusters = new Map();
  for (const item of findings) {
    const key = `${item.subjectId}:${item.evidence.clusterId}`;
    if (!uniqueFindings.has(key) || uniqueFindings.get(key).score < item.score) uniqueFindings.set(key, item);
  }
  for (const item of clusters) {
    if (!uniqueClusters.has(item.clusterId) || uniqueClusters.get(item.clusterId).confidence < item.confidence) uniqueClusters.set(item.clusterId, item);
  }
  return { findings: [...uniqueFindings.values()], clusters: [...uniqueClusters.values()] };
}

function repeatedCohortFindings(events) {
  const walletTokens = new Map();
  const counts = new Map();
  for (const item of events) {
    if (item.side !== 'buy') continue;
    if (!walletTokens.has(item.wallet)) walletTokens.set(item.wallet, new Set());
    walletTokens.get(item.wallet).add(item.mint);
    counts.set(item.wallet, (counts.get(item.wallet) || 0) + 1);
  }
  const wallets = [...walletTokens.keys()]
    .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0))
    .slice(0, 400);
  const pairs = [];
  outer: for (let i = 0; i < wallets.length; i += 1) {
    for (let j = i + 1; j < wallets.length; j += 1) {
      const a = wallets[i];
      const b = wallets[j];
      const tokensA = walletTokens.get(a);
      const tokensB = walletTokens.get(b);
      const shared = [...tokensA].filter(token => tokensB.has(token));
      if (shared.length < 3) continue;
      const union = new Set([...tokensA, ...tokensB]);
      const jaccard = shared.length / Math.max(1, union.size);
      if (jaccard < 0.45) continue;
      pairs.push({ a, b, shared, jaccard, unionSize: union.size });
      if (pairs.length >= 500) break outer;
    }
  }
  return pairs
    .sort((a, b) => b.jaccard - a.jaccard || b.shared.length - a.shared.length)
    .slice(0, 250)
    .map(pair => finding(
      'repeated-cohort',
      'wallet-pair',
      keyPair(pair.a, pair.b),
      clamp(0.3 + pair.jaccard * 0.5 + Math.min(0.15, pair.shared.length / 30)),
      pair.shared.length,
      'Two wallets repeatedly appear on the buy side of the same indexed tokens. This recurring overlap is useful for investigation, but by itself does not imply shared ownership or coordination.',
      { walletA: pair.a, walletB: pair.b, sharedTokens: pair.shared.slice(0, 50), jaccard: pair.jaccard },
      { unsharedTokenCount: Math.max(0, pair.unionSize - pair.shared.length) },
      ['Popular-token overlap', 'Similar independent strategy', 'Copy trading', 'Common information source']
    ));
}

function rapidAlternationFindings(events) {
  const groups = new Map();
  for (const item of events) {
    if (item.side !== 'buy' && item.side !== 'sell') continue;
    const key = `${item.wallet}|${item.mint}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const output = [];
  for (const [key, rows] of groups) {
    rows.sort((a, b) => a.time - b.time);
    let alternating = 0;
    let rapid = 0;
    for (let index = 1; index < rows.length; index += 1) {
      if (rows[index].side === rows[index - 1].side) continue;
      alternating += 1;
      if (rows[index].time - rows[index - 1].time <= 30) rapid += 1;
    }
    if (rows.length < 10 || rapid < 4) continue;
    const ratio = rapid / Math.max(1, rows.length - 1);
    if (ratio < 0.35) continue;
    const split = key.lastIndexOf('|');
    const wallet = key.slice(0, split);
    const mint = key.slice(split + 1);
    output.push(finding(
      'rapid-alternation',
      'wallet',
      wallet,
      clamp(0.25 + ratio * 0.55 + Math.min(0.15, rows.length / 100)),
      rows.length,
      'This wallet repeatedly alternates buy and sell activity in the same token over short intervals. The behavior may merit review for execution or market-activity patterns, but it is not proof of wash trading or manipulation.',
      { mint, rapidAlternations: rapid, alternationRatio: ratio, windowStart: rows[0].time, windowEnd: rows.at(-1).time, signatures: rows.slice(0, 40).map(item => item.signature) },
      { nonRapidTransitions: Math.max(0, alternating - rapid) },
      ['Market making', 'Manual scalping', 'Arbitrage', 'Aggregator splitting', 'Incomplete counterparty context']
    ));
  }
  return output;
}

function counterpartyConcentrationFindings(events) {
  const byCounterparty = new Map();
  for (const item of events) {
    if (!item.counterparty || item.counterparty === item.wallet) continue;
    if (!byCounterparty.has(item.counterparty)) byCounterparty.set(item.counterparty, []);
    byCounterparty.get(item.counterparty).push(item);
  }
  const output = [];
  for (const [counterparty, rows] of byCounterparty) {
    const wallets = uniq(rows.map(item => item.wallet));
    const tokens = uniq(rows.map(item => item.mint));
    if (wallets.length < 5 || rows.length < 12) continue;
    const score = clamp(0.25 + Math.min(0.35, wallets.length / 30) + Math.min(0.2, tokens.length / 20));
    output.push(finding(
      'shared-counterparty',
      'counterparty',
      counterparty,
      score,
      rows.length,
      'Many indexed wallets in this universe interact with the same counterparty across repeated events. This may identify shared infrastructure or a relationship hub and should not be interpreted as common ownership without additional evidence.',
      { walletCount: wallets.length, tokenCount: tokens.length, wallets: wallets.slice(0, 50), tokens: tokens.slice(0, 50) },
      {},
      ['DEX/router/vault infrastructure', 'Exchange hot wallet', 'Shared service provider', 'Popular protocol account']
    ));
  }
  return output;
}

async function persistFinding(db, universeId, item, now) {
  const findingId = `${universeId}:${s(item.kind)}:${s(item.subjectId)}`.slice(0, 500);
  await db.prepare(`
    INSERT INTO intelligence_anomaly_findings
      (finding_id,universe_id,subject_kind,subject_id,finding_kind,state,score,sample_size,
       statement,evidence_json,counterevidence_json,alternative_explanations_json,
       first_seen_at,last_seen_at,finding_version,updated_at)
    VALUES (?,?,?,?,?,'candidate',?,?,?,?,?,?,?,?, 'v1',unixepoch())
    ON CONFLICT(finding_id) DO UPDATE SET
      score=excluded.score,
      sample_size=excluded.sample_size,
      statement=excluded.statement,
      evidence_json=excluded.evidence_json,
      counterevidence_json=excluded.counterevidence_json,
      alternative_explanations_json=excluded.alternative_explanations_json,
      last_seen_at=excluded.last_seen_at,
      updated_at=unixepoch()
  `).bind(
    findingId,
    universeId,
    item.subjectKind,
    s(item.subjectId),
    item.kind,
    item.score,
    item.sampleSize,
    item.statement,
    JSON.stringify(item.evidence || {}),
    JSON.stringify(item.counterevidence || {}),
    JSON.stringify(item.alternativeExplanations || []),
    now,
    now
  ).run();
}

async function persistCluster(db, universeId, cluster) {
  await db.prepare(`
    INSERT INTO intelligence_behavior_clusters
      (cluster_id,universe_id,cluster_kind,window_start,window_end,member_count,token_count,
       confidence,members_json,evidence_json,alternative_explanations_json,cluster_version,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,'v1',unixepoch())
    ON CONFLICT(cluster_id) DO UPDATE SET
      member_count=excluded.member_count,
      token_count=excluded.token_count,
      confidence=excluded.confidence,
      members_json=excluded.members_json,
      evidence_json=excluded.evidence_json,
      alternative_explanations_json=excluded.alternative_explanations_json,
      updated_at=unixepoch()
  `).bind(
    cluster.clusterId,
    universeId,
    cluster.kind,
    cluster.windowStart,
    cluster.windowEnd,
    cluster.members.length,
    cluster.tokens.length,
    cluster.confidence,
    JSON.stringify(cluster.members),
    JSON.stringify(cluster.evidence || {}),
    JSON.stringify(cluster.alternativeExplanations || [])
  ).run();
}

export async function analyzeUniverseAnomalies(env = {}, universeId = 'solana', {
  windowSeconds = 7 * 86400,
  now = Math.floor(Date.now() / 1000),
  limit = 20000,
  persist = false
} = {}) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('database_unavailable');
  const id = s(universeId) || 'solana';
  const window = Math.max(3600, Math.min(30 * 86400, Math.trunc(n(windowSeconds) || 7 * 86400)));
  const from = now - window;
  const events = await queryEvents(db, id, from, now, limit);
  const synchronized = synchronizedEntryFindings(events);
  const findings = [
    ...synchronized.findings,
    ...repeatedCohortFindings(events),
    ...rapidAlternationFindings(events),
    ...counterpartyConcentrationFindings(events)
  ].sort((a, b) => b.score - a.score || b.sampleSize - a.sampleSize).slice(0, 500);
  const clusters = synchronized.clusters.sort((a, b) => b.confidence - a.confidence).slice(0, 250);
  if (persist) {
    for (const item of findings) await persistFinding(db, id, item, now);
    for (const cluster of clusters) await persistCluster(db, id, cluster);
  }
  return {
    universeId: id,
    windowStart: from,
    windowEnd: now,
    eventsAnalyzed: events.length,
    findingCount: findings.length,
    clusterCount: clusters.length,
    persisted: persist === true,
    methodology: 'Anomaly Research detects recurring or statistically unusual structures in bounded indexed public-chain evidence. Findings are investigation leads only. They do not identify a person, prove common ownership, prove manipulation, or establish malicious intent.',
    findings,
    clusters
  };
}

export const __anomalyResearchContract = Object.freeze({
  theoryOnly: true,
  noBadActorLabel: true,
  minimumSynchronizedWallets: 4,
  synchronizedWindowSeconds: 12,
  usesCanonicalEvidenceOnly: true,
  maxCohortWallets: 400
});
