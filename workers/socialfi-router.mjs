import { intelligenceDb } from "./intelligence-indexer.mjs";
import {
  requireSocialWrites,
  socialCapabilities,
  walletExecutionPolicy,
} from "./socialfi-policy.mjs";

const json = (body, status = 200, cache = "no-store") =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff",
    },
  });
const s = (value) => String(value ?? "").trim();
const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const LIMIT = 50;
const GALAXIES = new Set(["pump-fun", "galaxy-zero"]);
const GALAXY_TO_UNIVERSE = Object.freeze({
  "pump-fun": "pump-fun",
  "galaxy-zero": "solana",
});
const DEFAULT_GALAXY = "pump-fun";
const LARGE_TRADE_SOL = 5;

const INDEXER_ACTORS = Object.freeze({
  "pump-fun": Object.freeze({
    id: "indexer:pump-fun",
    handle: "pumpfun",
    displayName: "pump.fun index",
    avatarUrl: null,
    reputation: 0,
    evidenceAccuracy: null,
  }),
  "galaxy-zero": Object.freeze({
    id: "indexer:galaxy-zero",
    handle: "galaxyzero",
    displayName: "Galaxy Zero index",
    avatarUrl: null,
    reputation: 0,
    evidenceAccuracy: null,
  }),
});

const DISCLOSURE =
  "Observations are indexed public-chain events with evidence receipts. Not endorsement or investment advice.";

async function principal(request, env = {}) {
  const verifier = env.SOCIAL_AUTH;
  if (!verifier || typeof verifier.fetch !== "function") return null;
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  try {
    const response = await verifier.fetch("https://social-auth.internal/verify", {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({ audience: "a-bulls-social" }),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const id = s(body?.subject || body?.userId);
    return id ? { id } : null;
  } catch {
    return null;
  }
}

async function readBody(request) {
  const declared = n(request.headers.get("content-length"));
  if (declared > 16_384) throw new Error("request_body_too_large");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 16_384) throw new Error("request_body_too_large");
  try {
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

function shortMint(mint) {
  const id = s(mint);
  if (id.length <= 10) return id || "unknown mint";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function coverageFromAge(observedAtSec, hasItems) {
  if (!hasItems) return "empty";
  const age = Math.max(0, Math.floor(Date.now() / 1000) - Math.trunc(n(observedAtSec)));
  if (age > 900) return "stale";
  return "fresh";
}

function mapMembershipEvent(galaxyId, row) {
  const eventKind = s(row.event_kind);
  const mint = s(row.entity_id);
  const evidenceId = s(row.source_snapshot_id)
    ? `membership:${s(row.source_snapshot_id)}:${eventKind}:${mint}`
    : `membership:${n(row.id)}:${eventKind}:${mint}`;
  if (!mint || !evidenceId) return null;
  if (eventKind === "entered") {
    return {
      id: `obs:${galaxyId}:${evidenceId}`,
      kind: "observation",
      body: `New mint entered the indexed ${galaxyId === "pump-fun" ? "pump.fun" : "Galaxy Zero"} set · ${shortMint(mint)}`,
      createdAt: n(row.observed_at) * 1000,
      galaxyId,
      tokenId: mint,
      evidenceId,
      coverage: null,
      actor: INDEXER_ACTORS[galaxyId],
      reactions: 0,
      replies: 0,
    };
  }
  if (eventKind === "exited") {
    return {
      id: `obs:${galaxyId}:${evidenceId}`,
      kind: "alert",
      body: `Mint exited the indexed ${galaxyId === "pump-fun" ? "pump.fun" : "Galaxy Zero"} set · ${shortMint(mint)}`,
      createdAt: n(row.observed_at) * 1000,
      galaxyId,
      tokenId: mint,
      evidenceId,
      coverage: null,
      actor: INDEXER_ACTORS[galaxyId],
      reactions: 0,
      replies: 0,
    };
  }
  // rank-changed intentionally omitted in step 1 — too noisy for discover.
  return null;
}

function mapPumpTrade(galaxyId, row) {
  const evidenceId = s(row.event_id);
  const mint = s(row.mint);
  const side = s(row.side).toLowerCase();
  const sol = n(row.sol_amount);
  if (!evidenceId || !mint) return null;
  if (side === "sell") {
    return {
      id: `obs:${galaxyId}:${evidenceId}`,
      kind: "alert",
      body: `Large sell indexed on pump.fun · ${shortMint(mint)} · ${sol.toFixed(2)} SOL`,
      createdAt: n(row.block_time) * 1000,
      galaxyId,
      tokenId: mint,
      evidenceId,
      coverage: null,
      actor: INDEXER_ACTORS[galaxyId],
      reactions: 0,
      replies: 0,
    };
  }
  return {
    id: `obs:${galaxyId}:${evidenceId}`,
    kind: "observation",
    body: `Large ${side || "trade"} indexed on pump.fun · ${shortMint(mint)} · ${sol.toFixed(2)} SOL`,
    createdAt: n(row.block_time) * 1000,
    galaxyId,
    tokenId: mint,
    evidenceId,
    coverage: null,
    actor: INDEXER_ACTORS[galaxyId],
    reactions: 0,
    replies: 0,
  };
}

function filterKinds(items, kindsParam) {
  const raw = s(kindsParam);
  if (!raw) return items;
  const allowed = new Set(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!allowed.size) return items;
  return items.filter((item) => allowed.has(s(item.kind)));
}

async function discoverFeed(db, { galaxyId, limit, kinds }) {
  const universeId = GALAXY_TO_UNIVERSE[galaxyId];
  const actor = INDEXER_ACTORS[galaxyId];
  const sources =
    galaxyId === "pump-fun"
      ? ["pump.fun indexed stream", "Helius indexed history", "universe-membership"]
      : ["synthetic-prototype", "indexed Solana field", "universe-membership"];

  const items = [];
  let latest = 0;
  let membershipOk = false;
  let tradesOk = false;

  try {
    const membership = await db
      .prepare(
        `
      SELECT id, entity_id, event_kind, observed_at, source_snapshot_id, rank
      FROM intelligence_universe_membership_events
      WHERE universe_id = ?
        AND event_kind IN ('entered', 'exited')
      ORDER BY observed_at DESC, id DESC
      LIMIT ?
    `,
      )
      .bind(universeId, limit)
      .all();
    membershipOk = true;
    for (const row of membership?.results || []) {
      const item = mapMembershipEvent(galaxyId, row);
      if (!item?.evidenceId) continue;
      items.push(item);
      latest = Math.max(latest, Math.floor(n(item.createdAt) / 1000));
    }
  } catch {
    membershipOk = false;
  }

  if (galaxyId === "pump-fun") {
    try {
      const remaining = Math.max(0, limit - items.length);
      if (remaining > 0) {
        const trades = await db
          .prepare(
            `
          SELECT event_id, mint, side, sol_amount, block_time
          FROM pump_trades
          WHERE sol_amount >= ?
          ORDER BY block_time DESC
          LIMIT ?
        `,
          )
          .bind(LARGE_TRADE_SOL, remaining)
          .all();
        tradesOk = true;
        for (const row of trades?.results || []) {
          const item = mapPumpTrade(galaxyId, row);
          if (!item?.evidenceId) continue;
          items.push(item);
          latest = Math.max(latest, Math.floor(n(item.createdAt) / 1000));
        }
      } else {
        tradesOk = true;
      }
    } catch {
      tradesOk = false;
    }
  } else {
    tradesOk = true;
  }

  items.sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.evidenceId)) continue;
    seen.add(item.evidenceId);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }

  const filtered = filterKinds(deduped, kinds);
  let coverage = coverageFromAge(latest, filtered.length > 0);
  if (!membershipOk && !tradesOk) coverage = "degraded";
  if (!membershipOk && galaxyId !== "pump-fun") coverage = filtered.length ? coverage : "degraded";
  if (galaxyId === "pump-fun" && !membershipOk && !tradesOk) coverage = "degraded";
  if (galaxyId === "pump-fun" && !membershipOk && tradesOk && !filtered.length) coverage = "empty";

  return {
    ok: true,
    scope: "discover",
    items: filtered,
    nextCursor: null,
    disclosure: DISCLOSURE,
    coverage,
    galaxyId,
    sources,
    actorHint: actor.id,
  };
}

async function accountFeed(request, env, db, { scope, limit }) {
  const viewer =
    scope === "discover" || scope === "creators" ? null : await principal(request, env);
  if (!viewer) {
    if (scope === "following" || scope === "watchlist")
      return json({ ok: false, error: "account_required" }, 401);
  }
  let where = "p.status='published'";
  const bindings = [];
  if (scope === "following") {
    where +=
      " AND EXISTS (SELECT 1 FROM social_follows f WHERE f.follower_id=? AND f.followed_id=p.author_id AND f.status='active')";
    bindings.push(viewer.id);
  }
  if (scope === "watchlist") {
    where += ` AND EXISTS (
      SELECT 1 FROM social_watchlists w
      JOIN social_watchlist_items wi ON wi.watchlist_id=w.id
      WHERE w.owner_id=? AND (
        (wi.subject_kind='token' AND wi.subject_id=p.token_id) OR
        (wi.subject_kind='galaxy' AND wi.subject_id=p.galaxy_id) OR
        (wi.subject_kind='creator' AND wi.subject_id=p.author_id)
      )
    )`;
    bindings.push(viewer.id);
  }
  if (scope === "creators") where += " AND pr.account_kind='creator'";
  const result = await db
    .prepare(
      `
    SELECT p.id,p.kind,p.body,p.created_at,p.galaxy_id,p.token_id,p.evidence_id,p.coverage,
           pr.id AS actor_id,pr.handle,pr.display_name,pr.avatar_url,
           COALESCE(rs.score,0) AS reputation,rs.evidence_accuracy,
           (SELECT COUNT(*) FROM social_reactions r WHERE r.post_id=p.id AND r.status='active') AS reactions,
           (SELECT COUNT(*) FROM social_posts c WHERE c.parent_id=p.id AND c.status='published') AS replies
    FROM social_posts p
    JOIN social_profiles pr ON pr.id=p.author_id
    LEFT JOIN social_reputation_snapshots rs ON rs.profile_id=pr.id AND rs.window_key='lifetime'
    WHERE ${where}
    ORDER BY p.created_at DESC,p.id DESC LIMIT ?
  `,
    )
    .bind(...bindings, limit)
    .all();
  const items = (result?.results || []).map((row) => ({
    id: s(row.id),
    kind: s(row.kind),
    body: s(row.body),
    createdAt: n(row.created_at) * 1000,
    galaxyId: s(row.galaxy_id) || null,
    tokenId: s(row.token_id) || null,
    evidenceId: s(row.evidence_id) || null,
    coverage: s(row.coverage) || null,
    actor: {
      id: s(row.actor_id),
      handle: s(row.handle),
      displayName: s(row.display_name),
      avatarUrl: s(row.avatar_url) || null,
      reputation: n(row.reputation),
      evidenceAccuracy: row.evidence_accuracy == null ? null : n(row.evidence_accuracy),
    },
    reactions: n(row.reactions),
    replies: n(row.replies),
  }));
  const cache =
    scope === "discover" || scope === "creators"
      ? "public, max-age=5, stale-while-revalidate=15"
      : "private, no-store";
  return json(
    {
      ok: true,
      scope,
      items,
      nextCursor: null,
      disclosure:
        "Social posts are user expression. Evidence badges indicate an attached indexed receipt, not endorsement or investment advice.",
    },
    200,
    cache,
  );
}

async function feed(request, env = {}) {
  const db = intelligenceDb(env);
  if (!db) return json({ ok: false, error: "database_unavailable" }, 503);
  const url = new URL(request.url);
  const allowedScopes = new Set(["discover", "following", "watchlist", "creators"]);
  const scope = allowedScopes.has(url.searchParams.get("scope"))
    ? url.searchParams.get("scope")
    : "discover";
  const limit = Math.max(1, Math.min(LIMIT, Math.trunc(n(url.searchParams.get("limit")) || 30)));

  // Step 1: discover is evidence-linked lifecycle, not social_posts.
  if (scope === "discover") {
    const galaxyParam = s(url.searchParams.get("galaxyId")) || DEFAULT_GALAXY;
    if (!GALAXIES.has(galaxyParam)) return json({ ok: false, error: "unknown_galaxy" }, 400);
    const body = await discoverFeed(db, {
      galaxyId: galaxyParam,
      limit,
      kinds: url.searchParams.get("kinds"),
    });
    return json(body, 200, "public, max-age=5, stale-while-revalidate=15");
  }

  // Account scopes remain behind identity; creators stay closed until step 2 writes.
  if (scope === "creators") {
    return json({ ok: false, error: "scope_not_in_step_1" }, 400);
  }
  return accountFeed(request, env, db, { scope, limit });
}

async function createPost(request, env = {}) {
  const gate = requireSocialWrites(env);
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);
  const actor = await principal(request, env);
  if (!actor) return json({ ok: false, error: "account_required" }, 401);
  const db = intelligenceDb(env);
  if (!db) return json({ ok: false, error: "database_unavailable" }, 503);
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ ok: false, error: s(error.message) }, 413);
  }
  const content = s(body.body);
  if (!content || content.length > 420)
    return json({ ok: false, error: "post_must_be_1_to_420_characters" }, 400);
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO social_posts (id,author_id,parent_id,kind,body,galaxy_id,token_id,evidence_id,coverage,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'published',unixepoch(),unixepoch())`,
    )
    .bind(
      id,
      actor.id,
      s(body.parentId) || null,
      "post",
      content,
      s(body.galaxyId) || null,
      s(body.tokenId) || null,
      s(body.evidenceId) || null,
      s(body.coverage) || null,
    )
    .run();
  return json({ ok: true, id, status: "published" }, 201);
}

async function upsertProfile(request, env = {}) {
  const gate = requireSocialWrites(env);
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);
  const actor = await principal(request, env);
  if (!actor) return json({ ok: false, error: "account_required" }, 401);
  const db = intelligenceDb(env);
  if (!db) return json({ ok: false, error: "database_unavailable" }, 503);
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ ok: false, error: s(error.message) }, 413);
  }
  const handle = s(body.handle).toLowerCase();
  const displayName = s(body.displayName);
  const bio = s(body.bio);
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) return json({ ok: false, error: "invalid_handle" }, 400);
  if (!displayName || displayName.length > 50 || bio.length > 240)
    return json({ ok: false, error: "invalid_profile" }, 400);
  try {
    await db
      .prepare(
        `INSERT INTO social_profiles (id,handle,display_name,bio,account_kind,status,created_at,updated_at) VALUES (?,?,?,?,'member','active',unixepoch(),unixepoch()) ON CONFLICT(id) DO UPDATE SET handle=excluded.handle,display_name=excluded.display_name,bio=excluded.bio,updated_at=unixepoch()`,
      )
      .bind(actor.id, handle, displayName, bio || null)
      .run();
    return json({ ok: true, id: actor.id, handle, displayName, bio }, 200);
  } catch {
    return json({ ok: false, error: "handle_unavailable" }, 409);
  }
}

async function followProfile(request, env = {}) {
  const gate = requireSocialWrites(env);
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);
  const actor = await principal(request, env);
  if (!actor) return json({ ok: false, error: "account_required" }, 401);
  const db = intelligenceDb(env);
  if (!db) return json({ ok: false, error: "database_unavailable" }, 503);
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ ok: false, error: s(error.message) }, 413);
  }
  const followedId = s(body.profileId);
  if (!followedId || followedId === actor.id)
    return json({ ok: false, error: "invalid_follow_target" }, 400);
  const status = body.follow === false ? "removed" : "active";
  await db
    .prepare(
      `INSERT INTO social_follows (follower_id,followed_id,status,created_at,updated_at) VALUES (?,?,?,unixepoch(),unixepoch()) ON CONFLICT(follower_id,followed_id) DO UPDATE SET status=excluded.status,updated_at=unixepoch()`,
    )
    .bind(actor.id, followedId, status)
    .run();
  return json({ ok: true, profileId: followedId, status });
}

async function reactToPost(request, env = {}) {
  const gate = requireSocialWrites(env);
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);
  const actor = await principal(request, env);
  if (!actor) return json({ ok: false, error: "account_required" }, 401);
  const db = intelligenceDb(env);
  if (!db) return json({ ok: false, error: "database_unavailable" }, 503);
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ ok: false, error: s(error.message) }, 413);
  }
  const postId = s(body.postId);
  const reaction = s(body.reaction);
  if (!postId || !new Set(["signal", "bullish", "caution", "evidence"]).has(reaction))
    return json({ ok: false, error: "invalid_reaction" }, 400);
  const status = body.active === false ? "removed" : "active";
  await db
    .prepare(
      `INSERT INTO social_reactions (profile_id,post_id,reaction,status,created_at) VALUES (?,?,?,?,unixepoch()) ON CONFLICT(profile_id,post_id,reaction) DO UPDATE SET status=excluded.status`,
    )
    .bind(actor.id, postId, reaction, status)
    .run();
  return json({ ok: true, postId, reaction, status });
}

async function addWatchlistItem(request, env = {}) {
  const gate = requireSocialWrites(env);
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);
  const actor = await principal(request, env);
  if (!actor) return json({ ok: false, error: "account_required" }, 401);
  const db = intelligenceDb(env);
  if (!db) return json({ ok: false, error: "database_unavailable" }, 503);
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ ok: false, error: s(error.message) }, 413);
  }
  const kind = s(body.subjectKind);
  const subjectId = s(body.subjectId);
  if (
    !new Set(["wallet", "token", "galaxy", "creator"]).has(kind) ||
    !subjectId ||
    subjectId.length > 160
  )
    return json({ ok: false, error: "invalid_watchlist_subject" }, 400);
  const watchlistId = `default:${actor.id}`;
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO social_watchlists (id,owner_id,name,visibility,created_at,updated_at) VALUES (?,?,'WATCHLIST','private',unixepoch(),unixepoch())`,
      )
      .bind(watchlistId, actor.id),
    db
      .prepare(
        `INSERT OR IGNORE INTO social_watchlist_items (watchlist_id,subject_kind,chain_id,subject_id,created_at) VALUES (?,?,?,?,unixepoch())`,
      )
      .bind(watchlistId, kind, s(body.chainId) || null, subjectId),
  ]);
  return json({ ok: true, watchlistId, subjectKind: kind, subjectId }, 201);
}

export async function handleSocialFiRequest(request, env = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/social/")) return null;
  if (url.pathname === "/api/social/capabilities" && request.method === "GET") {
    return json(
      { ...socialCapabilities(env), walletExecution: walletExecutionPolicy(env) },
      200,
      "public, max-age=30",
    );
  }
  if (!socialCapabilities(env).socialEnabled)
    return json({ ok: false, error: "feature_disabled" }, 404);
  if (url.pathname === "/api/social/feed" && request.method === "GET") return feed(request, env);
  if (url.pathname === "/api/social/posts" && request.method === "POST")
    return createPost(request, env);
  if (url.pathname === "/api/social/profile" && request.method === "PUT")
    return upsertProfile(request, env);
  if (url.pathname === "/api/social/follows" && request.method === "POST")
    return followProfile(request, env);
  if (url.pathname === "/api/social/reactions" && request.method === "POST")
    return reactToPost(request, env);
  if (url.pathname === "/api/social/watchlist" && request.method === "POST")
    return addWatchlistItem(request, env);
  return json({ ok: false, error: "not_found" }, 404);
}
