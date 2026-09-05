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

async function feed(request, env = {}) {
  const db = intelligenceDb(env);
  if (!db) return json({ ok: false, error: "database_unavailable" }, 503);
  const url = new URL(request.url);
  const allowedScopes = new Set(["discover", "following", "watchlist", "creators"]);
  const scope = allowedScopes.has(url.searchParams.get("scope"))
    ? url.searchParams.get("scope")
    : "discover";
  const limit = Math.max(1, Math.min(LIMIT, Math.trunc(n(url.searchParams.get("limit")) || 30)));
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
