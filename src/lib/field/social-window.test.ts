import assert from "node:assert/strict";
import test from "node:test";
import { emptySocialWindow, parseSocialWindow, socialCountLine, socialDay0, socialRailCopy, SOCIAL_THAT_DAY_MAX } from "./social-window.ts";

const token = { symbol: "UNIPCS", name: null, mint: "0xfe7e19cbce2f896c6c528bc355baf5a768291e18" };
const post = (id: string, extra: Record<string, unknown> = {}) => ({ id, handle: "@someone", postedAt: 1_790_000_000_000, excerpt: "UNIPCS listing today", url: "https://x.com/someone/status/1", source: "x-observed", role: "public", bucket: "day0", ...extra });

test("day_0 is the UTC date of the first print", () => {
  assert.equal(socialDay0(Date.UTC(2026, 8, 24, 23, 59)), "2026-09-24");
});

test("rail copy is the exact contract and never claims causation", () => {
  const [line, source] = socialRailCopy({ day0: "2026-09-24", token, source: "none" });
  assert.equal(line, "Public posts mentioning UNIPCS on Sep 24, 2026. Not claimed as the reason for this print.");
  assert.equal(source, "Source: none retained.");
  assert.equal(socialRailCopy({ day0: "2026-09-24", token, source: "x-observed" })[1], "Source: X-observed.");
});

test("empty payloads stay honest and counts carry no sentiment", () => {
  const empty = emptySocialWindow(token, "2026-09-24");
  assert.equal(parseSocialWindow({ ok: false }, empty), empty);
  assert.equal(socialCountLine(empty), "0 posts");
  assert.equal(socialCountLine({ total: 12, keywords: [{ keyword: "unlock", count: 3 }] }), "12 posts · 3 mention unlock");
});

test("parser caps That day, drops unsourced team posts and non-https links", () => {
  const empty = emptySocialWindow(token, "2026-09-24");
  const parsed = parseSocialWindow({ ok: true, day0: "2026-09-24", thatDay: Array.from({ length: 12 }, (_, i) => post(`p${i}`, i === 0 ? { url: "javascript:alert(1)" } : {})), team: [post("t1", { role: "team" }), post("t2", { role: "team", roleSource: "deployer" })], after: {}, total: 14 }, empty);
  assert.equal(parsed.thatDay.length, SOCIAL_THAT_DAY_MAX);
  assert.equal(parsed.thatDay[0].url, null);
  assert.equal(parsed.thatDay[0].handle, "someone");
  assert.deepEqual(parsed.team.map((row) => row.id), ["t2"]);
  assert.equal(parsed.source, "x-observed");
});
