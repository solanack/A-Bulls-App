import test from "node:test";
import assert from "node:assert/strict";
import { verifyQrMatrix } from "./verify-qr.ts";

test("verify QR is deterministic version 10 and has finder patterns",()=>{
  const url="https://abullsapp.com/?mode=replay&wallet=G39wywquKbHK8F2wZZZFX3fcsyG91VCCbbr6WEVp5axy&mint=XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1";
  const one=verifyQrMatrix(url),two=verifyQrMatrix(url);
  assert.equal(one.length,57);assert.equal(one[0].length,57);assert.deepEqual(one,two);
  assert.equal(one[0][0],true);assert.equal(one[1][1],false);assert.equal(one[3][3],true);
  assert.equal(one[0][56],true);assert.equal(one[56][0],true);
  assert.ok(one.flat().filter(Boolean).length>900);
});
test("verify QR rejects URLs beyond fixed version capacity",()=>assert.throws(()=>verifyQrMatrix("x".repeat(272)),/too_long/));
