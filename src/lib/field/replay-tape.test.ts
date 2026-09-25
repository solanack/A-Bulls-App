import assert from "node:assert/strict";
import test from "node:test";
import { anchorBolts, cohortTicks, formatUsdNotional, formatUsdPrice, fullTape, groupBolts, hopSchedule, notionalScale, observedPricedPrintCount, priceAxisLabel, replayShareUrl, replaySubjectFrom, replayToolInput, STRIKE_DOWN_MS, STRIKE_MS, STRIKE_UP_MS, strikePhase, tapeAxis, tapeCandles, tapeHeaderLine, tapeEvents, tapeMarkSummary, tapeScaleFor, tapeUsdCoverage, tapeUsdSummary, toMs, WSOL_MINT, type TapeCandle, type TapeEvent } from "./replay-tape.ts";
import { drawTape, tapePrintLabelLayouts } from "./replay-tape-render.ts";

const AB_WALLET = "G39wywquKbHK8F2wZZZFX3fcsyG91VCCbbr6WEVp5axy";
const AB_MINT = "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1";
const FOMO_WALLET = "0x1fce5a5d5b00c8a8cd80e8bdc608ebf8eb17cd7e";
const FOMO_MINT = "0xfe7e19cbce2f896c6c528bc355baf5a768291e18";

test("share URL round-trips the exact Replay: subject, window, room and cursor", () => {
  const subject = replaySubjectFrom(`?mode=replay&wallet=${AB_WALLET}&mint=${AB_MINT}&chain=solana&from=1790107200&to=1790170200&room=afterbell&t=0.4`, {});
  assert.ok(subject);
  assert.equal(subject.fromTs, 1790107200000);
  assert.equal(subject.toTs, 1790170200000);
  assert.equal(subject.room, "afterbell");
  assert.equal(subject.cursor, 0.4);
  const url = replayShareUrl("https://app.example", subject, 0.4);
  assert.deepEqual(replaySubjectFrom(new URL(url).search, {}), subject);
});

test("Replay reads the stored thread when the URL carries no subject, so the menu never opens a blank form", () => {
  const subject = replaySubjectFrom("", { wallet: FOMO_WALLET, mint: FOMO_MINT, chainKey: "robinhood", galaxyId: "fomo", fromTs: 1784685328000, toTs: 1788228875000, displayName: "LP1111", symbol: "SPACEHOOD" });
  assert.ok(subject);
  assert.equal(subject.chainKey, "robinhood");
  assert.equal(subject.displayName, "LP1111");
  assert.equal(replaySubjectFrom("", {}), null);
});

test("tool input keeps EVM subjects off the WSOL quote and passes the selected window", () => {
  const evm = replayToolInput({ wallet: FOMO_WALLET, mint: FOMO_MINT, chainKey: "robinhood", fromTs: 1784685328000, toTs: 1788228875000, room: "fomo", displayName: null, symbol: null, cursor: null });
  assert.equal("quoteMint" in evm, false);
  assert.equal(evm.from, 1784685328);
  assert.equal(evm.bucketSeconds, 3600);
  const sol = replayToolInput({ wallet: AB_WALLET, mint: AB_MINT, chainKey: "solana", fromTs: null, toTs: null, room: null, displayName: null, symbol: null, cursor: null });
  assert.equal(sol.quoteMint, WSOL_MINT);
});

test("bolts anchor to the candle holding each print; unknown sides never become bolts", () => {
  const candles = tapeCandles([{ timestamp: 1790107200000, open: 1, high: 2, low: 0.5, close: 1.5 }, { timestamp: 1790107260000, open: 1.5, high: 3, low: 1, close: 2 }]);
  const events = tapeEvents([{ id: "a", side: "buy", timestamp: 1790107230000, tokenDelta: -2, priceUsd: 0.0004 }, { id: "b", side: "sell", timestamp: 1790107270000 }, { id: "c", side: null, timestamp: 1790107240000 }]);
  assert.equal(events.length, 2);
  const bolts = anchorBolts(events, candles, 1790107200000, 1790107320000);
  assert.equal(bolts[0].candleTime, 1790107200);
  assert.equal(bolts[0].anchorPrice, 0.5);
  assert.equal(bolts[0].amount, 2);
  assert.equal(bolts[1].candleTime, 1790107260);
  assert.equal(bolts[1].anchorPrice, 3);
  const tape = anchorBolts(events, [], 1790107200000, 1790107320000);
  assert.equal(tape[0].anchorPrice, null);
  assert.equal(toMs(1790107200), 1790107200000);
});

test("Cut manifest carries wallet, mint, window, signatures and candle source; no candles means no source claim", async () => {
  const { buildCutManifest } = await import("./replay-tape.ts");
  const subject = { wallet: AB_WALLET, mint: AB_MINT, chainKey: "solana", fromTs: 1790107200000, toTs: 1790170200000, room: "afterbell" as const, displayName: "G39w…5axy", symbol: "CRCLx", cursor: null };
  const bolts = anchorBolts(tapeEvents([{ id: "s1", signature: "sig1", side: "buy", timestamp: 1790110000000 }, { id: "p1", side: "sell", timestamp: 1790120000000, verification: "provider-reported" }]), [], 1790107200000, 1790170200000);
  const manifest = buildCutManifest({ subject, bolts, candleCount: 0, candleSource: "coingecko", start: 1790107200000, end: 1790170200000, replayUrl: "https://app.example/?mode=replay", format: "portrait", greyLine: null, generatedAt: "2026-09-25T00:00:00.000Z" });
  assert.equal(manifest.format.width, 1080);
  assert.equal(manifest.format.height, 1920);
  assert.deepEqual(manifest.signatures, ["sig1"]);
  assert.equal(manifest.candleSource, null);
  assert.equal(manifest.window.fromUnix, 1790107200);
  assert.equal(manifest.buyCount, 1);
  assert.match(manifest.disclosure, /No price path was invented/);
});

test("candle source shows a provider name on screen, never the API tier id", async () => {
  const { candleSourceLabel } = await import("./replay-tape.ts");
  assert.equal(candleSourceLabel("coingecko-demo-onchain:solana:3zozghHn3cCmbAVPF3Bm5AiyT7VorSdHwTt2qJjLfDo2"), "CoinGecko onchain OHLC");
  assert.equal(candleSourceLabel("coingecko-pro-onchain:solana:pool"), "CoinGecko onchain OHLC");
  assert.equal(candleSourceLabel("geckoterminal-public:solana:pool"), "GeckoTerminal OHLC");
  assert.equal(candleSourceLabel(null), "indexed OHLC");
  assert.doesNotMatch(candleSourceLabel("coingecko-demo-onchain:x"), /demo/i);
});

const H = 3_600_000;
const candleAt = (i: number, base = 1_790_000_000_000): TapeCandle => ({ time: (base + i * H) / 1000, timestamp: base + i * H, open: 1, high: 2, low: 0.5, close: 1.5 });
const eventAt = (id: string, timestamp: number, side: "buy" | "sell" = "buy", extra: Partial<TapeEvent> = {}): TapeEvent => ({ id, side, timestamp, signature: null, amount: null, priceUsd: null, verification: "observed", sources: [], kind: "trade", ...extra });

test("full tape spans every retained candle, first to last, not a cropped scene around the print", () => {
  const candles = Array.from({ length: 100 }, (_, i) => candleAt(i));
  const events = [eventAt("a", candles[40].timestamp + 60_000), eventAt("b", candles[50].timestamp + 60_000, "sell")];
  const view = fullTape(candles, events, { start: candles[30].timestamp, end: candles[60].timestamp });
  assert.equal(view.start, candles[0].timestamp);
  assert.equal(view.end, candles[99].timestamp + H);
});

test("tape axis packs candles into equal slots so a gap in the series leaves no empty tape", () => {
  const candles = [candleAt(0), candleAt(1), candleAt(50), candleAt(51)];
  const axis = tapeAxis(candles, candles[0].timestamp, candles[3].timestamp + H);
  assert.equal(axis.frac(candles[0].timestamp), 0);
  assert.equal(axis.frac(candles[2].timestamp), 0.5);
  assert.equal(axis.center(3), 0.875);
  assert.equal(axis.frac(candles[3].timestamp + H), 1);
  assert.equal(axis.timeAt(0.5), candles[2].timestamp);
});

test("full tape without candles keeps a margin around the prints", () => {
  const view = fullTape([], [eventAt("a", 10 * H), eventAt("b", 20 * H)], { start: 0, end: 100 * H });
  assert.ok(view.start < 10 * H && view.start >= 9 * H);
  assert.ok(view.end > 20 * H && view.end <= 21 * H);
});

test("cohort ticks sit on their candle slot and stay inside the tape", () => {
  const candles = Array.from({ length: 4 }, (_, i) => candleAt(i));
  const ticks = cohortTicks([{ id: "x", wallet: "0xabc0000000000000000000000000000000000def", callsign: "@bee", time: candles[2].timestamp + 1, source: "fomoapi.io/trades" }, { id: "late", wallet: "0xabc", time: candles[3].timestamp + 9 * H }], candles, candles[0].timestamp, candles[3].timestamp + H);
  assert.equal(ticks.length, 1);
  assert.equal(ticks[0].id, "cohort:x");
  assert.equal(ticks[0].candleTime, candles[2].time);
  assert.ok(Math.abs(ticks[0].cursor - 0.5) < 0.01);
});

test("header counts the hero and cohort without claiming a follow", () => {
  const bolts = anchorBolts([eventAt("a", H, "buy", { verification: "provider-reported" })], [], 0, 2 * H);
  const line = tapeHeaderLine({ token: "MarsCoin", trader: "Unipcs", bolts, cohortCount: 7 });
  assert.equal(line, "Unipcs · 1 buy · 0 sells");
  assert.doesNotMatch(line, /follow|cop(y|ied)/i);
});

test("bolts anchor on the print candle and several prints on one bar become one counted bolt", () => {
  const candles = Array.from({ length: 5 }, (_, i) => candleAt(i));
  const events = [eventAt("a", candles[2].timestamp + 1, "buy", { amount: 10, priceUsd: 1 }), eventAt("b", candles[2].timestamp + 2, "buy", { amount: 100, priceUsd: 1.2 }), eventAt("c", candles[3].timestamp + 1, "sell")];
  const bolts = anchorBolts(events, candles, candles[0].timestamp, candles[4].timestamp + H);
  assert.equal(bolts[0].candleTime, candles[2].time);
  assert.equal(bolts[1].anchorPrice, 1.2);
  const groups = groupBolts(bolts);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].notional, 130);
  assert.equal(groups[0].cursor, bolts[1].cursor);
  assert.equal(notionalScale(groups[0], groups), 1);
});

test("price axis reads 3 significant figures", () => {
  assert.equal(priceAxisLabel(0.0000132), "0.0₄132");
  assert.equal(priceAxisLabel(0.0132), "0.0132");
  assert.equal(priceAxisLabel(212.456), "212");
  assert.equal(priceAxisLabel(15_432), "15.4K");
  assert.equal(priceAxisLabel(2_340_000), "2.34M");
});

test("playhead hops bolt to bolt and dwells on each stop", () => {
  const schedule = hopSchedule([0.2, 0.5, 0.5]);
  assert.deepEqual(schedule.stops, [0.2, 0.5, 1]);
  assert.equal(schedule.cursorAt(0), 0);
  assert.equal(schedule.cursorAt(schedule.arrivals[0]), 0.2);
  assert.equal(schedule.cursorAt(0.3), 0.2);
  assert.equal(schedule.cursorAt(1), 1);
  assert.equal(schedule.progressAt(0.5), schedule.arrivals[1]);
  for (let p = 0; p < 1; p += 0.01) assert.ok(schedule.cursorAt(p) <= schedule.cursorAt(p + 0.01) + 1e-9);
});

test("hero lightning strikes down, returns up, then leaves a scar; only FOMO uses a log scale", () => {
  assert.ok(STRIKE_DOWN_MS >= 120 && STRIKE_DOWN_MS <= 180);
  assert.ok(STRIKE_UP_MS >= 80 && STRIKE_UP_MS <= 100);
  assert.equal(STRIKE_MS, STRIKE_DOWN_MS + STRIKE_UP_MS);
  assert.deepEqual(strikePhase(0), { phase: "down", progress: 0 });
  assert.equal(strikePhase(STRIKE_DOWN_MS + STRIKE_UP_MS / 2).phase, "up");
  assert.deepEqual(strikePhase(STRIKE_MS), { phase: "scar" });
  assert.deepEqual(strikePhase(null), { phase: "scar" });
  assert.equal(tapeScaleFor("fomo"), "log");
  assert.equal(tapeScaleFor("afterbell"), "linear");
});


test("USD notional labels use the requested compact rounding", () => {
  assert.equal(formatUsdNotional(12.4), "$12");
  assert.equal(formatUsdNotional(1_239.6), "$1,240");
  assert.equal(formatUsdNotional(12_440), "$12.4k");
  assert.equal(formatUsdNotional(1_240_000), "$1.24M");
  assert.equal(formatUsdNotional(107_000), "$107k");
  assert.equal(formatUsdNotional(0), "");
  assert.equal(formatUsdNotional(Number.NaN), "");
});

test("USD summary ignores prints without observed positive amount and priceUsd", () => {
  const bolts=anchorBolts([
    eventAt("b1",H,"buy",{amount:10,priceUsd:2}),
    eventAt("b2",H+1,"buy",{amount:5,priceUsd:null}),
    eventAt("s1",H+2,"sell",{amount:4,priceUsd:3}),
    eventAt("s2",H+3,"sell",{amount:null,priceUsd:4}),
    eventAt("b3",H+4,"buy",{amount:2,priceUsd:0}),
  ],[],0,2*H);
  assert.deepEqual(tapeUsdSummary(bolts),{boughtUsd:20,soldUsd:12,avgBuyUsd:2,avgSellUsd:3,buyUsdCount:1,buyTotal:3,sellUsdCount:1,sellTotal:2});
});

test("USD summary average is size-weighted by observed token amount", () => {
  const bolts=anchorBolts([
    eventAt("a",H,"buy",{amount:10,priceUsd:1}),
    eventAt("b",H+1,"buy",{amount:30,priceUsd:3}),
  ],[],0,2*H);
  const summary=tapeUsdSummary(bolts);
  assert.equal(summary.boughtUsd,100);
  assert.equal(summary.avgBuyUsd,2.5);
  assert.notEqual(summary.avgBuyUsd,(10+90)/2);
});

test("grouped bolt notional sums only qualifying observed USD prints and unknown never becomes zero", () => {
  const candles=[candleAt(0)];
  const bolts=anchorBolts([
    eventAt("a",candles[0].timestamp+1,"buy",{amount:10,priceUsd:2}),
    eventAt("b",candles[0].timestamp+2,"buy",{amount:5,priceUsd:3}),
    eventAt("c",candles[0].timestamp+3,"buy",{amount:4,priceUsd:null}),
    eventAt("d",candles[0].timestamp+4,"sell",{amount:null,priceUsd:null}),
  ],candles,candles[0].timestamp,candles[0].timestamp+H);
  const groups=groupBolts(bolts),buy=groups.find(group=>group.side==="buy"),sell=groups.find(group=>group.side==="sell");
  assert.equal(buy?.notional,35);
  assert.equal(sell?.notional,null);
  const summary=tapeUsdSummary([bolts[3]]);
  assert.equal(summary.soldUsd,null);
  assert.equal(summary.avgSellUsd,null);
});


test("tapeEvents maps alternate observed amount, execution size, and ready USD notional keys", () => {
  const events=tapeEvents([
    {id:"amount",side:"buy",timestamp:H,amount:12,avg_entry_price:2},
    {id:"execution",side:"buy",timestamp:H+1,execution:{baseAmount:8},price_usd:3},
    {id:"ready",side:"sell",timestamp:H+2,valueUsd:107000},
  ]);
  assert.equal(events[0].amount,12);
  assert.equal(events[0].priceUsd,2);
  assert.equal(events[0].notionalUsd,24);
  assert.equal(events[1].amount,8);
  assert.equal(events[1].notionalUsd,24);
  assert.equal(events[2].amount,null);
  assert.equal(events[2].notionalUsd,107000);
});

test("USDC quote amount becomes observed notionalUsd", () => {
  const [event]=tapeEvents([{id:"u",side:"buy",timestamp:H,amount:4,quoteMint:"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",execution:{quoteAmount:250}}]);
  assert.equal(event.notionalUsd,250);
  assert.equal(tapeUsdSummary(anchorBolts([event],[],0,2*H)).boughtUsd,250);
});

test("Afterbell USDC swap legs provide exact per-fill dollars before conflicting base times price", () => {
  const USDC="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const [buy,sell]=tapeEvents([
    {id:"tsla-buy",side:"buy",timestamp:H,tokenDelta:4,priceUsd:40,execution:{baseAmount:4,quoteAmount:200,quoteMint:USDC}},
    {id:"tsla-sell",side:"sell",timestamp:H+1,tokenDelta:-4,priceUsd:40,execution:{baseAmount:4,quoteAmount:215,quoteMint:USDC}},
  ]);
  assert.equal(buy.amount,4);
  assert.equal(buy.notionalUsd,200);
  assert.equal(formatUsdNotional(buy.notionalUsd!),"$200");
  assert.equal(sell.notionalUsd,215);
  assert.equal(tapeUsdSummary(anchorBolts([buy,sell],[],0,2*H)).soldUsd,215);
});

test("explicit USD value wins; USDT quote and bundle subject only provide a fallback when the mint is known", () => {
  const USDC="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const USDT="Es9vMFrzaCERmJfrF4H2FYDqfCMx1j8dYKVKJQmuayNX";
  const [explicit,usdt,fromSubject,nonUsd]=tapeEvents([
    {id:"explicit",side:"buy",timestamp:H,valueUsd:209,quoteMint:USDC,execution:{quoteAmount:200}},
    {id:"usdt",side:"sell",timestamp:H+1,execution:{quoteMint:USDT,quoteAmount:-34}},
    {id:"subject",side:"buy",timestamp:H+2,execution:{baseAmount:2,quoteAmount:50}},
    {id:"non-usd",side:"buy",timestamp:H+3,quoteMint:WSOL_MINT,execution:{quoteAmount:2,baseAmount:5}},
  ],USDC);
  assert.equal(explicit.notionalUsd,209);
  assert.equal(usdt.notionalUsd,34);
  assert.equal(fromSubject.notionalUsd,50);
  assert.equal(nonUsd.notionalUsd,null);
});

test("missing USD and price never fabricate a zero or infer size from candles", () => {
  const [missing]=tapeEvents([{id:"no-price",side:"buy",timestamp:H,tokenDelta:42,execution:{quoteAmount:200,quoteMint:WSOL_MINT}}]);
  assert.equal(missing.notionalUsd,null);
  const candles=[candleAt(0)];
  const [bolt]=anchorBolts([missing],candles,candles[0].timestamp,candles[0].timestamp+H);
  assert.equal(bolt.notionalUsd,null);
  assert.equal(tapePrintLabelLayouts(groupBolts([bolt])[0],187,230,1,300,58).labels.length,0);
  assert.notEqual(formatUsdNotional(0.1),"$0");
});

test("on the lightning impact frame, distinct same-bar buys and sells paint their own dollar at the candle x", () => {
  const USDC="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const candles=[candleAt(0)];
  const bolts=anchorBolts(tapeEvents([
    {id:"one",side:"buy",timestamp:candles[0].timestamp+1,execution:{baseAmount:2,quoteAmount:200,quoteMint:USDC}},
    {id:"two",side:"buy",timestamp:candles[0].timestamp+2,execution:{baseAmount:3,quoteAmount:300,quoteMint:USDC}},
    {id:"three",side:"sell",timestamp:candles[0].timestamp+3,execution:{baseAmount:1,quoteAmount:120,quoteMint:USDC}},
  ]),candles,candles[0].timestamp,candles[0].timestamp+H);
  const prints:{label:string;x:number;color:unknown}[]=[],struck:string[]=[];
  const noop=()=>{};
  const ctx:any=new Proxy({measureText:(value:string)=>({width:value.length*6}),fillText(label:string,x:number){prints.push({label,x,color:this.fillStyle});}},{
    get(target,key){return key in target?(target as any)[key]:noop;},
    set(target,key,value){(target as any)[key]=value;return true;}
  });
  const hits=drawTape(ctx,{width:420,height:300,candles,bolts,start:candles[0].timestamp,end:candles[0].timestamp+H,cursor:1,strikeAge:(bolt)=>{struck.push(bolt.id);return 0;}});
  assert.deepEqual(struck,["one","two","three"]);
  assert.equal(hits.length,3);
  const dollars=prints.filter(print=>print.label.startsWith("$"));
  assert.deepEqual(dollars.map(print=>print.label),["$200","$300","$120"]);
  assert.deepEqual(dollars.map(print=>print.x),[187,187,187]); // first bar's center, not pad.left=18
  assert.equal(dollars[0].color,"#B8FF3C");
  assert.equal(dollars[2].color,"#FF2D55");
});

test("USD summary ignores implied-only candle anchors", () => {
  const candles=[candleAt(0)];
  const [bolt]=anchorBolts([eventAt("implied",candles[0].timestamp+1,"buy",{amount:100,priceUsd:null,notionalUsd:null})],candles,candles[0].timestamp,candles[0].timestamp+H);
  assert.ok(bolt.anchorPrice);
  assert.equal(tapeUsdSummary([bolt]).boughtUsd,null);
});

test("coverage copy collapses one priced lead with unpriced siblings on the same bar", () => {
  const candles=[candleAt(0)];
  const bolts=anchorBolts([
    eventAt("lead",candles[0].timestamp+1,"buy",{amount:100,priceUsd:2,notionalUsd:200}),
    ...Array.from({length:7},(_,index)=>eventAt(`extra-${index}`,candles[0].timestamp+2+index,"buy",{amount:10,priceUsd:null,notionalUsd:null})),
  ],candles,candles[0].timestamp,candles[0].timestamp+H);
  assert.equal(groupBolts(bolts)[0].count,8);
  assert.equal(tapeUsdCoverage(bolts,"buy"),"Size from 1 priced fill");
});

test("USD average label always includes a dollar sign and unknown stays an em dash", () => {
  assert.equal(formatUsdPrice(0.00421),"$0.00421");
  assert.equal(formatUsdPrice(null),"—");
});


test("two buys on different candles get two USD labels at two candle x positions",()=>{
  const candles=[candleAt(0),candleAt(1)],bolts=anchorBolts([
    eventAt("a",candles[0].timestamp+1,"buy",{amount:10,priceUsd:10,notionalUsd:100}),
    eventAt("b",candles[1].timestamp+1,"buy",{amount:20,priceUsd:10,notionalUsd:200}),
  ],candles,candles[0].timestamp,candles[1].timestamp+H),groups=groupBolts(bolts);
  const first=tapePrintLabelLayouts(groups[0],100,220,1,300,58),second=tapePrintLabelLayouts(groups[1],260,220,1,300,58);
  assert.equal(first.labels.length,1);assert.equal(second.labels.length,1);
  assert.equal(first.labels[0].x,100);assert.equal(second.labels[0].x,260);assert.notEqual(first.labels[0].x,second.labels[0].x);
});

test("two priced buys on one candle get two stacked USD labels, not one combined sum",()=>{
  const candles=[candleAt(0)],bolts=anchorBolts([
    eventAt("a",candles[0].timestamp+1,"buy",{amount:10,priceUsd:10,notionalUsd:100}),
    eventAt("b",candles[0].timestamp+2,"buy",{amount:20,priceUsd:10,notionalUsd:200}),
  ],candles,candles[0].timestamp,candles[0].timestamp+H),group=groupBolts(bolts)[0],layout=tapePrintLabelLayouts(group,210,220,1,300,58);
  assert.equal(group.notional,300);
  assert.deepEqual(layout.labels.map((row)=>row.notional),[100,200]);
  assert.equal(layout.labels.length,2);assert.equal(layout.labels[0].x,210);assert.equal(layout.labels[1].x,210);assert.notEqual(layout.labels[0].y,layout.labels[1].y);
});

test("unpriced print gets no USD label",()=>{
  const candles=[candleAt(0)],bolts=anchorBolts([eventAt("u",candles[0].timestamp+1,"buy",{amount:10,priceUsd:null,notionalUsd:null})],candles,candles[0].timestamp,candles[0].timestamp+H),group=groupBolts(bolts)[0],layout=tapePrintLabelLayouts(group,190,220,1,300,58);
  assert.equal(layout.labels.length,0);assert.equal(layout.unpriced.length,1);
});

test("USD label x equals the print candle x, never pad.left",()=>{
  const candles=[candleAt(0)],bolts=anchorBolts([eventAt("a",candles[0].timestamp+1,"buy",{amount:100,priceUsd:323,notionalUsd:32300})],candles,candles[0].timestamp,candles[0].timestamp+H),group=groupBolts(bolts)[0],layout=tapePrintLabelLayouts(group,210,220,1,300,58);
  assert.equal(layout.labels[0].x,210);assert.notEqual(layout.labels[0].x,18);assert.equal(formatUsdNotional(layout.labels[0].notional),"$32.3k");
});

test("mark is omitted when any visible print amount is missing",()=>{
  const candles=[candleAt(0)],bolts=anchorBolts([
    eventAt("known",candles[0].timestamp+1,"buy",{amount:100,priceUsd:2,notionalUsd:200}),
    eventAt("unknown",candles[0].timestamp+2,"buy",{amount:null,priceUsd:2,notionalUsd:50}),
  ],candles,candles[0].timestamp,candles[0].timestamp+H);
  assert.equal(tapeMarkSummary(bolts,candles).markedUsd,null);
});

test("mark uses observed remaining token amount times indexed last close and is never named PnL",()=>{
  const candles=[candleAt(0)],bolts=anchorBolts([
    eventAt("buy",candles[0].timestamp+1,"buy",{amount:100,priceUsd:1,notionalUsd:100}),
    eventAt("sell",candles[0].timestamp+2,"sell",{amount:25,priceUsd:1.2,notionalUsd:30}),
  ],candles,candles[0].timestamp,candles[0].timestamp+H),mark=tapeMarkSummary(bolts,candles);
  assert.equal(mark.remainingTokens,75);
  assert.equal(mark.markedUsd,112.5);
  assert.equal(mark.deltaUsd,12.5);
});

test("drawTape keeps a tappable bolt hit for a rendered stack",()=>{
  const candles=[candleAt(0)],bolts=anchorBolts([eventAt("hero",candles[0].timestamp+1,"buy",{amount:100,priceUsd:2,notionalUsd:200})],candles,candles[0].timestamp,candles[0].timestamp+H);
  const gradient={addColorStop(){}},noop=()=>{};
  const ctx:any=new Proxy({measureText:(value:string)=>({width:value.length*6}),createRadialGradient:()=>gradient,createLinearGradient:()=>gradient},{get(target,key){if(key in target)return (target as any)[key];return noop;},set(target,key,value){(target as any)[key]=value;return true;}});
  const hits=drawTape(ctx,{width:420,height:300,candles,bolts,start:candles[0].timestamp,end:candles[0].timestamp+H,cursor:1,heroGlyph:"CLAM"});
  assert.equal(hits.length,1);
  assert.equal(hits[0].id,"hero");
  assert.ok(hits[0].r>0);
});

test("same-bar priced labels cap at six with overflow count only",()=>{
  const candles=[candleAt(0)],bolts=anchorBolts(Array.from({length:8},(_,i)=>eventAt(`p-${i}`,candles[0].timestamp+1+i,"buy",{amount:1,priceUsd:10+i,notionalUsd:10+i})),candles,candles[0].timestamp,candles[0].timestamp+H),layout=tapePrintLabelLayouts(groupBolts(bolts)[0],200,220,1,300,58);
  assert.equal(layout.labels.length,6);assert.equal(layout.overflow,2);
});
