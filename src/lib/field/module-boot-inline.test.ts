import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MODULE_BOOT_INLINE } from "./module-boot-inline.ts";

describe("module MIME boot", () => {
  it("recovers module scripts as text/javascript blobs", () => {
    assert.match(MODULE_BOOT_INLINE, /text\/javascript/);
    assert.match(MODULE_BOOT_INLINE, /createObjectURL/);
    assert.match(MODULE_BOOT_INLINE, /octet-stream/);
    assert.match(MODULE_BOOT_INLINE, /method:"HEAD"/);
  });

  it("is injected in the document head before TanStack Scripts", () => {
    const source = readFileSync(join(process.cwd(), "src/routes/__root.tsx"), "utf8");
    assert.match(source, /MODULE_BOOT_INLINE/);
    assert.match(source, /scripts:\s*\[/);
  });
});
