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
  }
});
