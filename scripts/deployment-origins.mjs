import { readFileSync } from "node:fs";

// Wrangler is the sole source of production deployment addresses.
const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
export const productionOrigins = Object.freeze({
  worker: config.vars.INTELLIGENCE_WORKER_URL,
  public: config.vars.PUBLIC_APP_ORIGIN,
});
export function appOrigins(mode, env = {}) {
  const production = mode === "production";
  return {
    worker: env.VITE_INTELLIGENCE_WORKER_URL || (production ? productionOrigins.worker : "http://localhost:8787"),
    public: env.VITE_PUBLIC_APP_ORIGIN || (production ? productionOrigins.public : "http://localhost:8080"),
  };
}
