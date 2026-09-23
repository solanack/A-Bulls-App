// Two receipts the hackathon demo depends on. Production must always reopen both.
export const GOLDEN_FIXTURES = Object.freeze([
  Object.freeze({
    id: "fomo",
    room: "fomo",
    chainKey: "robinhood",
    wallet: "0x1fce5a5d5b00c8a8cd80e8bdc608ebf8eb17cd7e",
    mint: "0xfe7e19cbce2f896c6c528bc355baf5a768291e18",
    from: 1784685328,
    to: 1788228875,
    minEvents: 1,
  }),
  Object.freeze({
    id: "afterbell",
    room: "afterbell",
    chainKey: "solana",
    wallet: "G39wywquKbHK8F2wZZZFX3fcsyG91VCCbbr6WEVp5axy",
    mint: "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1",
    symbol: "CRCLx",
    from: 1790107200,
    to: 1790170200,
    minEvents: 1,
  }),
]);

const WSOL = "So11111111111111111111111111111111111111112";
const EVM = /^0x[0-9a-f]{40}$/i;

export function goldenReplayRequest(fixture) {
  const evm = EVM.test(fixture.wallet) && EVM.test(fixture.mint);
  return {
    wallets: [fixture.wallet],
    wallet: fixture.wallet,
    mint: fixture.mint,
    chainKey: fixture.chainKey,
    bucketSeconds: fixture.to - fixture.from > 7 * 86_400 ? 3600 : 60,
    ...(evm ? {} : { quoteMint: WSOL }),
    from: fixture.from,
    to: fixture.to,
  };
}

export function goldenReplayPath(fixture) {
  const params = new URLSearchParams({ mode: "replay", wallet: fixture.wallet, mint: fixture.mint, chain: fixture.chainKey, from: String(fixture.from), to: String(fixture.to), room: fixture.room });
  if (fixture.symbol) params.set("symbol", fixture.symbol);
  params.set("t", "1");
  return `/?${params}`;
}

const TRADE_SIDES = new Set(["buy", "sell"]);

export function goldenBundleVerdict(fixture, http, body) {
  const bundle = body?.bundle && typeof body.bundle === "object" ? body.bundle : body;
  const events = Array.isArray(bundle?.events) ? bundle.events : [];
  const trades = events.filter(event => TRADE_SIDES.has(String(event?.side ?? event?.direction ?? "").toLowerCase()));
  const candles = Array.isArray(bundle?.candles) ? bundle.candles : [];
  const problems = [];
  if (http === 404) problems.push("replay bundle returned 404");
  else if (http !== 200) problems.push(`replay bundle returned HTTP ${http}`);
  if (body?.ok === false) problems.push(`replay bundle not ok: ${body?.error ?? "unknown"}`);
  if (trades.length < fixture.minEvents) problems.push(`expected at least ${fixture.minEvents} buy/sell print(s), got ${trades.length}`);
  return { id: fixture.id, http, events: events.length, trades: trades.length, candles: candles.length, ok: problems.length === 0, problems };
}
