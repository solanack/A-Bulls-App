import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function hardcodedDeploymentUrls(source) {
  return [...source.matchAll(/https?:\/\/(?:[\w-]+\.)*(?:workers\.dev|abullsapp\.com)(?=[:/\s"'`),]|$)/gi)].map(match => match[0]);
}
export function checkDeploymentOrigins(root = process.cwd()) {
  const violations = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) { if (!["node_modules", ".wrangler"].includes(entry.name)) walk(path); }
      else if (/\.(?:[cm]?[jt]sx?|html)$/.test(entry.name) && hardcodedDeploymentUrls(readFileSync(path, "utf8")).length) violations.push(path);
    }
  }
  for (const dir of ["src", "scripts", "workers", "js", "server", "public"]) walk(join(root, dir));
  if (violations.length) throw new Error(`Hardcoded deployment URLs outside Wrangler configuration: ${violations.join(", ")}`);
}
