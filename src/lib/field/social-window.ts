/**
 * Dated social strip for one Replay thread (wallet × token). Posts are retained evidence that mention the
 * token around the first print. They are never presented as the reason for a print, and an author is
 * never presented as the trader unless that account is already linked to the wallet.
 */
export type SocialSource = "x-observed" | "provider-reported" | "none";
export type SocialRole = "public" | "team" | "issuer" | "venue";
export type SocialBucket = "day0" | "plus1" | "plus3" | "plus7";

export type SocialPost = {
  id: string;
  handle: string;
  postedAt: number;
  excerpt: string;
  url: string | null;
  source: Exclude<SocialSource, "none">;
  role: SocialRole;
  roleSource: string | null;
  thesisShaped: boolean;
  linkedToWallet: boolean;
  bucket: SocialBucket;
};

export type SocialWindow = {
  ok: boolean;
  day0: string;
  token: { symbol: string | null; name: string | null; mint: string };
  source: SocialSource;
  thatDay: SocialPost[];
  after: Record<Exclude<SocialBucket, "day0">, SocialPost[]>;
  team: SocialPost[];
  thesisShaped: SocialPost[];
  total: number;
  keywords: { keyword: string; count: number }[];
};

export const SOCIAL_THAT_DAY_MAX = 8;
export const SOCIAL_EMPTY_LINE = "No retained posts in this window.";
export const SOCIAL_AFTER_CHIPS: { bucket: Exclude<SocialBucket, "day0">; label: string }[] = [{ bucket: "plus1", label: "+1" }, { bucket: "plus3", label: "+3" }, { bucket: "plus7", label: "+7" }];
const SOURCE_LABEL: Record<SocialSource, string> = { "x-observed": "X-observed", "provider-reported": "provider-reported", none: "none retained" };

/** day_0 is the UTC calendar date of the first print on the thread. */
export function socialDay0(firstPrintMs: number): string {
  return new Date(firstPrintMs).toISOString().slice(0, 10);
}

export function socialDateLabel(day0: string): string {
  const ms = Date.parse(`${day0}T00:00:00Z`);
  return Number.isFinite(ms) ? new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : day0;
}

export function socialTokenLabel(token: SocialWindow["token"]): string {
  return token.symbol?.trim() || token.name?.trim() || `${token.mint.slice(0, 4)}…${token.mint.slice(-4)}`;
}

/** The rail's two contract lines, verbatim. */
export function socialRailCopy(window: Pick<SocialWindow, "day0" | "token" | "source">): [string, string] {
  return [`Public posts mentioning ${socialTokenLabel(window.token)} on ${socialDateLabel(window.day0)}. Not claimed as the reason for this print.`, `Source: ${SOURCE_LABEL[window.source]}.`];
}

export function socialSourceChip(source: SocialPost["source"]): string {
  return SOURCE_LABEL[source];
}

/** Counts only, e.g. "12 posts · 3 mention unlock". No sentiment. */
export function socialCountLine(window: Pick<SocialWindow, "total" | "keywords">): string {
  const head = `${window.total} ${window.total === 1 ? "post" : "posts"}`;
  const top = window.keywords.find((row) => row.count > 0);
  return top ? `${head} · ${top.count} mention ${top.keyword}` : head;
}

export function emptySocialWindow(token: SocialWindow["token"], day0: string): SocialWindow {
  return { ok: true, day0, token, source: "none", thatDay: [], after: { plus1: [], plus3: [], plus7: [] }, team: [], thesisShaped: [], total: 0, keywords: [] };
}

const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const BUCKETS = new Set<SocialBucket>(["day0", "plus1", "plus3", "plus7"]);
const ROLES = new Set<SocialRole>(["public", "team", "issuer", "venue"]);

function parsePost(value: unknown): SocialPost | null {
  const row = obj(value), id = text(row.id), handle = text(row.handle).replace(/^@/, ""), postedAt = Number(row.postedAt), source = text(row.source), bucket = text(row.bucket) as SocialBucket, role = text(row.role) as SocialRole;
  if (!id || !handle || !Number.isFinite(postedAt) || (source !== "x-observed" && source !== "provider-reported") || !BUCKETS.has(bucket)) return null;
  const url = text(row.url);
  return { id, handle, postedAt, excerpt: text(row.excerpt), url: /^https:\/\//.test(url) ? url : null, source, role: ROLES.has(role) ? role : "public", roleSource: text(row.roleSource) || null, thesisShaped: row.thesisShaped === true, linkedToWallet: row.linkedToWallet === true, bucket };
}

/** Accepts the Worker payload and drops anything that does not meet the contract. */
export function parseSocialWindow(value: unknown, fallback: SocialWindow): SocialWindow {
  const row = obj(value);
  if (row.ok !== true) return fallback;
  const list = (input: unknown) => (Array.isArray(input) ? input.map(parsePost).filter((post): post is SocialPost => Boolean(post)) : []);
  const after = obj(row.after), keywords = Array.isArray(row.keywords) ? row.keywords.flatMap((item) => { const k = obj(item), keyword = text(k.keyword), count = Number(k.count); return keyword && Number.isFinite(count) && count > 0 ? [{ keyword, count }] : []; }) : [];
  const thatDay = list(row.thatDay).slice(0, SOCIAL_THAT_DAY_MAX), team = list(row.team).filter((post) => post.roleSource), thesis = list(row.thesisShaped).filter((post) => post.thesisShaped);
  const next = { plus1: list(after.plus1), plus3: list(after.plus3), plus7: list(after.plus7) };
  const total = Number.isFinite(Number(row.total)) ? Number(row.total) : thatDay.length + next.plus1.length + next.plus3.length + next.plus7.length;
  const any = [...thatDay, ...next.plus1, ...next.plus3, ...next.plus7, ...team, ...thesis];
  const source: SocialSource = any.some((post) => post.source === "x-observed") ? "x-observed" : any.length ? "provider-reported" : "none";
  return { ...fallback, day0: /^\d{4}-\d{2}-\d{2}$/.test(text(row.day0)) ? text(row.day0) : fallback.day0, source, thatDay, after: next, team, thesisShaped: thesis, total: any.length ? total : 0, keywords: any.length ? keywords : [] };
}
