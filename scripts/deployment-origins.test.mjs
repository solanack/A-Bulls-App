import assert from "node:assert/strict";
import test from "node:test";
import { appOrigins, productionOrigins } from "./deployment-origins.mjs";
import { hardcodedDeploymentUrls } from "./check-deployment-origins.mjs";

test("development and development-mode builds stay local; production reads Wrangler", () => {
  assert.equal(appOrigins("development").worker, "http://localhost:8787");
  assert.equal(appOrigins("test").public, "http://localhost:8080");
  assert.deepEqual(appOrigins("production"), productionOrigins);
  assert.equal(appOrigins("production", { VITE_INTELLIGENCE_WORKER_URL: "https://staging.example.test" }).worker, "https://staging.example.test");
});
test("deployment URL gate detects configured hosts and permits unrelated providers", () => {
  assert.deepEqual(hardcodedDeploymentUrls(`fetch("${productionOrigins.worker}/api/health")`), [productionOrigins.worker]);
  assert.deepEqual(hardcodedDeploymentUrls(`origin = '${productionOrigins.public}'`), [productionOrigins.public]);
  assert.deepEqual(hardcodedDeploymentUrls('fetch("https://provider.example.test")'), []);
});
