import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CUT_EXPORT_SIZE,
  cutShareCopy,
  cutShareFilename,
  cutShareReceiptLines,
  cutVerifyHref,
  exportCanvasSize,
  formatCutWindow,
  paintCutPoster,
  preferredCutArtifactKind,
  probeCutExportCapability,
  shareCutArtifact,
  shareIdFromLocationSearch,
  type CutPaintContext,
  type CutShareInput,
} from "./cut-share-export.ts";

function sampleInput(overrides: Partial<CutShareInput> = {}): CutShareInput {
  return {
    candles: [
      { timestamp: 1_700_000_000_000, open: 1, high: 2, low: 0.5, close: 1.5 },
      { timestamp: 1_700_000_060_000, open: 1.5, high: 2.2, low: 1.1, close: 1.2 },
    ],
    events: [
      { timestamp: 1_700_000_000_000, side: "buy", signature: "Sig11111111111111111111111111111111111111111", verification: "verified" },
    ],
    coverageStatement: "Currently indexed evidence only.",
    verifyUrl: "https://abullsapp.com/?verify=abc",
    shareId: "abc123def456abc123def456",
    tokenLabel: "Pons · PONS",
    fromTs: 1_700_000_000_000,
    toTs: 1_700_086_400_000,
    aspectRatio: "9:16",
    ...overrides,
  };
}

function recordingCtx() {
  const texts: string[] = [];
  const ctx: CutPaintContext & { texts: string[] } = {
    texts,
    fillStyle: "",
    strokeStyle: "",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    lineWidth: 1,
    fillRect() {},
    fillText(text) {
      texts.push(text);
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
  };
  return ctx;
}

describe("Cut share / VERIFY deep link", () => {
  it("prefers vertical 1080×1920 and accepts verify or tour query ids", () => {
    assert.deepEqual(exportCanvasSize("9:16"), { w: 1080, h: 1920 });
    assert.equal(CUT_EXPORT_SIZE["9:16"].h / CUT_EXPORT_SIZE["9:16"].w, 16 / 9);
    assert.equal(shareIdFromLocationSearch("?verify=deadbeef"), "deadbeef");
    assert.equal(shareIdFromLocationSearch("?tour=cafef00d"), "cafef00d");
    assert.equal(shareIdFromLocationSearch("?verify=new&tour=old"), "new");
    assert.equal(shareIdFromLocationSearch(""), "");
    assert.equal(cutVerifyHref("https://abullsapp.com/", "abc"), "https://abullsapp.com/?verify=abc");
  });

  it("burns INDEXED, time, signatures, and VERIFY — never invents a missing signature", () => {
    const lines = cutShareReceiptLines(sampleInput());
    assert.equal(lines[0], "INDEXED");
    assert.match(lines[1] ?? "", /→/);
    assert.ok(lines.some((line) => line.startsWith("SIG Sig11111")));
    assert.ok(lines.some((line) => line.includes("VERIFY https://abullsapp.com/?verify=abc")));
    const empty = cutShareReceiptLines(sampleInput({ events: [] }));
    assert.ok(empty.includes("signature unavailable"));
    assert.ok(!empty.some((line) => line.startsWith("SIG ") && line !== "signature unavailable"));
  });

  it("paints a poster from retained candles only and stays honest when OHLC is missing", () => {
    const drawn = recordingCtx();
    paintCutPoster(drawn, sampleInput());
    assert.ok(drawn.texts.includes("INDEXED"));
    assert.ok(drawn.texts.includes("Pons · PONS"));
    assert.ok(drawn.texts.some((line) => line.startsWith("VERIFY ")));
    assert.ok(drawn.texts.some((line) => line.startsWith("SIG ")));

    const empty = recordingCtx();
    paintCutPoster(empty, sampleInput({ candles: [] }));
    assert.ok(empty.texts.includes("No indexed OHLC. Receipts only."));
    assert.ok(empty.texts.includes("No price path was invented."));
  });

  it("probes WebCodecs/MediaRecorder without requiring Mediabunny, and names share files from the Cut id", () => {
    assert.equal(probeCutExportCapability({}), "poster");
    assert.equal(probeCutExportCapability({ VideoEncoder: class {} }), "webcodecs");
    assert.equal(probeCutExportCapability({ MediaRecorder: class {} }), "media-recorder");
    assert.equal(preferredCutArtifactKind({}), "png");
    assert.equal(
      preferredCutArtifactKind({ MediaRecorder: { isTypeSupported: (type: string) => type.includes("webm") } }),
      "webm",
    );
    assert.equal(cutShareFilename("abcdef12zzzz", "png"), "abulls-cut-abcdef12.png");
    assert.match(cutShareCopy("https://x/?verify=1").text, /VERIFY/);
    assert.match(formatCutWindow(0, 0), /unavailable/);
  });

  it("uses the native share sheet when the browser can share a file", async () => {
    const blob = new Blob(["cut"], { type: "image/png" });
    const shared: ShareData[] = [];
    const result = await shareCutArtifact({
      blob,
      filename: "abulls-cut-abc.png",
      title: "VERIFY this Cut",
      text: "Indexed receipts for this trade. VERIFY: https://abullsapp.com/?verify=abc",
      url: "https://abullsapp.com/?verify=abc",
      nav: {
        canShare: (payload?: ShareData) => Boolean(payload?.files?.length),
        share: async (payload: ShareData) => {
          shared.push(payload);
        },
        clipboard: { writeText: async () => undefined },
      } as unknown as Pick<Navigator, "share" | "canShare" | "clipboard">,
    });
    assert.equal(result, "shared");
    assert.equal(shared.length, 1);
    assert.equal(shared[0]?.files?.length, 1);
    assert.equal(shared[0]?.url, undefined);
  });

  it("falls back to copying the VERIFY link, then to download", async () => {
    const blob = new Blob(["cut"], { type: "image/png" });
    let copied = "";
    const copiedResult = await shareCutArtifact({
      blob,
      filename: "abulls-cut-abc.png",
      title: "VERIFY this Cut",
      text: "Indexed receipts",
      url: "https://abullsapp.com/?verify=abc",
      nav: {
        canShare: () => false,
        clipboard: {
          writeText: async (value: string) => {
            copied = value;
          },
        },
      } as unknown as Pick<Navigator, "share" | "canShare" | "clipboard">,
    });
    assert.equal(copiedResult, "copied");
    assert.equal(copied, "https://abullsapp.com/?verify=abc");

    const downloaded = await shareCutArtifact({
      blob,
      filename: "abulls-cut-abc.png",
      title: "VERIFY this Cut",
      text: "Indexed receipts",
      url: "https://abullsapp.com/?verify=abc",
      nav: {} as Pick<Navigator, "share" | "canShare" | "clipboard">,
    });
    assert.equal(downloaded, "downloaded");
  });
});
