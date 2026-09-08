import assert from "node:assert/strict";
import test from "node:test";
import { computeDeviceBudget } from "./hash.ts";

test("Seeker-class Android uses a bounded native WebGL budget", () => {
  const width = 690;
  const height = 1536;
  const budget = computeDeviceBudget({
    memory: 8,
    width,
    height,
    coarsePointer: true,
    userAgent: "Mozilla/5.0 (Linux; Android 16; Seeker) AppleWebKit/537.36 Mobile Safari/537.36",
  });

  assert.equal(budget.mobile, true);
  assert.equal(budget.field, 2800);
  assert.equal(budget.organism, 180000);
  assert.ok(budget.dpr <= 1.15);
  assert.ok(width * height * budget.dpr * budget.dpr <= budget.maxPixels + 1);
});

test("mobile save-data or reduced-motion pressure gets the conservative profile", () => {
  const budget = computeDeviceBudget({
    memory: 8,
    width: 412,
    height: 915,
    coarsePointer: true,
    saveData: true,
    userAgent: "Android Mobile",
  });

  assert.equal(budget.mobile, true);
  assert.equal(budget.field, 1600);
  assert.equal(budget.organism, 100000);
  assert.ok(budget.dpr <= 1);
});

test("desktop high-memory rendering keeps the full native field budget", () => {
  const budget = computeDeviceBudget({
    memory: 16,
    width: 1440,
    height: 900,
    coarsePointer: false,
    userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
  });

  assert.equal(budget.mobile, false);
  assert.equal(budget.field, 4200);
  assert.equal(budget.organism, 660000);
  assert.equal(budget.dpr, 1.75);
});

test("oversized portrait viewports cap framebuffer pixels even when device DPR is high", () => {
  const width = 1080;
  const height = 2400;
  const budget = computeDeviceBudget({
    memory: 8,
    width,
    height,
    coarsePointer: true,
    userAgent: "Android Mobile",
  });

  assert.ok(budget.dpr < 1);
  assert.ok(width * height * budget.dpr * budget.dpr <= budget.maxPixels + 1);
});
