import assert from "node:assert/strict";
import test from "node:test";
import { LIVE_FIXTURE, fixtureFromFrozenCut, fomoSolanaTopTokens, validateAfterbellTraders, validateCutPage, validateEvidenceFixture, validateFomoAudit, validateFomoGalaxy, validateFomoTrader, validateReplay, validateTokenSystem, validateWalletSystem } from "./check-live.mjs";

const fixture = Object.freeze({
  wallet: LIVE_FIXTURE.wallet,
  mint: LIVE_FIXTURE.mint,
  quoteMint: LIVE_FIXTURE.quoteMint,
  from: 1_780_000_000,
  to: 1_780_003_600,
  signatures: Object.freeze(["1".repeat(88), "2".repeat(88)]),
});

const response = (overrides = {}) => ({ok: true,bundle: {subject: { wallets: [fixture.wallet], mint: fixture.mint, quoteMint: fixture.quoteMint },window: { from: fixture.from, to: fixture.to },eventCount: 2,events: [{ signature: fixture.signatures[0] }, { signature: fixture.signatures[1] }],candles: [],...overrides}});

test("known retained Replay accepts the exact subject, window, and receipts", () => {assert.equal(validateReplay(response(), fixture).eventCount, 2);});
test("known retained Replay rejects an empty event list", () => {assert.throws(() => validateReplay(response({ eventCount: 0, events: [] }), fixture), /returned no events/);});
test("known retained Replay rejects a mismatched subject", () => {assert.throws(() => validateReplay(response({ subject: { wallets: [fixture.wallet], mint: "different-mint", quoteMint: fixture.quoteMint } }), fixture), /different mint/);});
test("known retained Replay rejects missing expected receipts", () => {assert.throws(() => validateReplay(response({ eventCount: 1, events: [{ signature: fixture.signatures[0] }] }), fixture), new RegExp(fixture.signatures[1]));});

test("retained evidence fixture requires valid addresses, time window, and Solana receipts", () => {
  assert.deepEqual(validateEvidenceFixture(fixture), fixture);
  assert.throws(() => validateEvidenceFixture({ ...fixture, signatures: ["placeholder"] }), /no replayable Solana receipts/);
  assert.throws(() => validateEvidenceFixture({ ...fixture, to: fixture.from - 1 }), /end precedes/);
});

test("saved Cut smoke check stays archival and does not invent blockchain receipts", () => {
  const result = fixtureFromFrozenCut({ok: true,frozen: true,id: LIVE_FIXTURE.cutId,shareUrl: `/?cut=${LIVE_FIXTURE.cutId}`,verifyUrl: `/?cut=${LIVE_FIXTURE.cutId}`,manifest: {subject: { kind: "wallet-token", id: `${LIVE_FIXTURE.wallet}:${LIVE_FIXTURE.mint}` },coverage: { from: fixture.from, to: fixture.to },evidence: [{ id: "provider-context", signature: "placeholder", sourceReference: "provider:context" }]}});
  assert.equal(result.cutId, LIVE_FIXTURE.cutId);assert.equal(result.manifest.evidence[0].signature, "placeholder");
});

test("saved Cut rejects mutable or mismatched archival manifests", () => {
  assert.throws(() => fixtureFromFrozenCut({ ok: true, frozen: false }), /not frozen/);
  assert.throws(() => fixtureFromFrozenCut({ ok: true, frozen: true, id: "wrong" }), /different id/);
  assert.throws(() => fixtureFromFrozenCut({ok: true,frozen: true,id: LIVE_FIXTURE.cutId,shareUrl: `/?cut=${LIVE_FIXTURE.cutId}`,verifyUrl: `/?cut=${LIVE_FIXTURE.cutId}`,manifest: { subject: { kind: "wallet-token", id: "wrong:subject" }, evidence: [] }}), /different subject/);
});

test("canonical /?cut= page must render the hydratable A Bulls app shell", () => {
  assert.doesNotThrow(() => validateCutPage('<html><head><title>A Bulls App</title><script type="module" src="/assets/index.js"></script></head><body><main class="field-shell"></main></body></html>'));
  assert.throws(() => validateCutPage("Cut unavailable"), /application shell/);
});

test("Fomo live checks require real PnL coverage and protect mapped trader token context",()=>{
  const mint=LIVE_FIXTURE.mint,trader={handle:'TraderOne',reportedPnlUsd:12345,solanaWallet:LIVE_FIXTURE.wallet,topTokens:[{mint}]};
  assert.deepEqual(fomoSolanaTopTokens(trader),[mint]);
  assert.throws(()=>validateFomoGalaxy({ok:true,items:[],disclosure:'empty'}),/no trader stars/);
  assert.throws(()=>validateFomoGalaxy({ok:true,items:[{...trader,reportedPnlUsd:null}]}),/no provider-reported PnL/);
  assert.equal(validateFomoGalaxy({ok:true,items:[trader]})[0].handle,'TraderOne');
  assert.throws(()=>validateFomoAudit({ok:true,counts:{traders:10,withPnl:4,withSolanaWallet:8}}),/unexpectedly low/);
  assert.doesNotThrow(()=>validateFomoAudit({ok:true,counts:{traders:10,withPnl:8,withSolanaWallet:8}}));
  assert.throws(()=>validateFomoTrader({ok:true,trader,positions:[],latestTrades:[]},trader),/lost a mapped provider-reported token position/);
  assert.doesNotThrow(()=>validateFomoTrader({ok:true,trader,positions:[{mint,sourceKind:"fomo-reported"}],latestTrades:[]},trader));
});

test("Fomo checks reject unmapped stars and lost or misattributed provider context",()=>{
  const trader={handle:"one",solanaWallet:LIVE_FIXTURE.wallet,reportedPnlUsd:1,topTokens:[{mint:LIVE_FIXTURE.mint}]};
  assert.throws(()=>validateFomoGalaxy({ok:true,items:[{...trader,solanaWallet:null}]}),/addressable Solana/);
  const body={ok:true,trader,positions:[{mint:LIVE_FIXTURE.mint,sourceKind:"fomo-reported"}],latestTrades:[]};
  assert.throws(()=>validateFomoTrader({...body,trader:{...trader,handle:"other"}},trader),/different handle/);
  assert.throws(()=>validateFomoTrader({...body,positions:[{mint:LIVE_FIXTURE.mint}]},trader),/source provenance/);
  assert.throws(()=>validateFomoTrader({...body,positions:[{mint:LIVE_FIXTURE.mint,sourceKind:"a-bulls-observed"}]},trader),/lost a mapped/);
  assert.throws(()=>validateFomoTrader({...body,latestTrades:[{},{},{},{}]},trader),/bounded system/);
});

test("live route probes cover depths 1–4 and reject broken segments or HTML fallbacks", async () => {
  const { checkRouteFamilies } = await import("./check-live.mjs");
  const bodies = [
    { ok: true, status: {} }, { ok: true, items: [] },
    { ok: true, contractVersion: "field-v0", stars: [] },
    { ok: true, contractVersion: "field-v0", planet: { wallet: LIVE_FIXTURE.wallet } },
  ];
  const makeFetch = (broken = -1, html = false) => {
    let index = 0;
    return async url => {
      const depth = new URL(url).pathname.split("/").filter(Boolean).length - 2;
      assert.equal(depth, index + 1);
      const body = bodies[index];
      const fail = index++ === broken;
      return new Response(html && fail ? "<html>app</html>" : JSON.stringify(body), {
        status: fail && !html ? 404 : 200,
        headers: { "content-type": html && fail ? "text/html" : "application/json", "x-a-bulls-intelligence-proxy": "1" },
      });
    };
  };
  assert.deepEqual(await checkRouteFamilies({ origin: "https://frontend.example.test", fetchImpl: makeFetch() }), [1, 2, 3, 4]);
  for (let i = 0; i < 4; i++) await assert.rejects(checkRouteFamilies({ fetchImpl: makeFetch(i) }), /HTTP 404/);
  await assert.rejects(checkRouteFamilies({ fetchImpl: makeFetch(3, true) }), /returned HTML/);
});


test("Afterbell Top 50 smoke preserves rank, provenance, and unavailable PnL",()=>{
  const body={ok:true,coverage:"fresh",window:{from:100,to:200,timezone:"America/New_York"},items:[
    {rank:1,wallet:LIVE_FIXTURE.wallet,transactionCount:4,realizedPnlUsd:null,realizedPnlSol:1.25,sourceKind:"observed"}
  ]};
  assert.equal(validateAfterbellTraders(body).length,1);
  assert.throws(()=>validateAfterbellTraders({...body,items:[{...body.items[0],rank:2}]}),/ranks are not contiguous/);
  assert.throws(()=>validateAfterbellTraders({...body,items:[{...body.items[0],transactionCount:0}]}),/no counted transactions/);
});

test("wallet-system smoke accepts bounded chain-qualified honest-empty coverage",()=>{
  const wallet=LIVE_FIXTURE.wallet;
  assert.deepEqual(validateWalletSystem({ok:true,wallet,walletKind:"solana",coverage:"empty",items:[]},wallet,"solana"),[]);
  const evm="0x1111111111111111111111111111111111111111";
  const items=validateWalletSystem({ok:true,wallet:evm,walletKind:"evm",coverage:"fresh",items:[{chainKey:"base",mint:"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",sourceKind:"provider-reported"}]},evm,"evm");
  assert.equal(items[0].chainKey,"base");
  assert.throws(()=>validateWalletSystem({ok:true,wallet:evm,walletKind:"evm",items:[{chainKey:"arc",mint:"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",sourceKind:"provider-reported"}]},evm,"evm"),/unsupported chain key/);
});

test("EVM token-system smoke rejects invented SOL valuation",()=>{
  const ok={ok:true,chainKey:"base",holders:[{chainKey:"base",buySolObserved:null,sellSolObserved:null}],trades:[]};
  assert.equal(validateTokenSystem(ok,"base").chainKey,"base");
  assert.throws(()=>validateTokenSystem({...ok,holders:[{chainKey:"base",buySolObserved:1,sellSolObserved:null}]},"base"),/invented SOL buy value/);
  assert.throws(()=>validateTokenSystem({...ok,chainKey:"solana"},"base"),/lost chain identity/);
});
