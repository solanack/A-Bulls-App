import assert from "node:assert/strict";
import test from "node:test";
import { cutFrameLayout } from "./replay-cut-layout.ts";

test("cut footer stays on the canvas above VERIFY in landscape and portrait", () => {
  for (const format of ["landscape", "portrait"] as const) {
    const layout = cutFrameLayout({ format, rowCount: 8, evidence: true, sourceLines: 2 });
    assert.ok(layout.lastBaseline <= layout.verifyY - 39, `${format} source line overlaps VERIFY`);
    assert.ok(layout.lastBaseline < layout.height - 8, `${format} source line leaves the canvas`);
    assert.ok(layout.verifyY < layout.height - 8, `${format} VERIFY leaves the canvas`);
    assert.ok(layout.chartBottom + 8 <= layout.lowerTop, `${format} chart overlaps the position card`);
    assert.ok(layout.chartBottom > layout.chartTop + 80, `${format} chart collapsed`);
    assert.ok(layout.lowerTop + layout.cardH + 20 <= layout.roundY, `${format} rounds line overlaps the card`);
    assert.equal(layout.noticeY, null);
  }
});

test("compliance notice reserves a band under VERIFY without covering the card", () => {
  for (const format of ["landscape", "portrait"] as const) {
    for (const noticeLines of [3, 8]) {
    const layout = cutFrameLayout({ format, rowCount: 8, evidence: true, sourceLines: 2, noticeLines });
    assert.ok(layout.noticeY != null && layout.noticeY > layout.verifyY);
    assert.ok(layout.lastBaseline <= layout.verifyY - 39, `${format} source line overlaps VERIFY`);
    const lastBaseline = (layout.noticeY ?? 0) + (layout.noticeLineCount - 1) * 40 * layout.k;
    const boxBottom = (layout.noticeY ?? 0) - 28 * layout.k + layout.noticeLineCount * 40 * layout.k + 16 * layout.k;
    assert.ok(lastBaseline < layout.height - 8, `${format} notice leaves the canvas`);
    assert.ok(boxBottom < layout.height - 4, `${format} notice box leaves the canvas`);
    assert.ok(layout.chartBottom + 8 <= layout.lowerTop, `${format} ${noticeLines} lines chart overlaps the position card`);
    }
  }
});
