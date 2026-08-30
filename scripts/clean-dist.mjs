import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const target = resolve(process.cwd(), "dist");
if (target !== resolve(process.cwd()) && target.endsWith("/dist")) {
  await rm(target, { recursive: true, force: true });
}
