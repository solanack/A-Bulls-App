/* LEGACY COMPATIBILITY SHIM ONLY.
 * New infrastructure uses Intelligence Mesh naming. This file exists solely so
 * the already-shipped Bull Intelligence compatibility extension can continue to
 * import its historical symbols during the migration. Do not add new logic here.
 */

import { backfillHistoryPass } from './intelligence-history-engine.mjs';
import { coverageForWallet, meshEnabled, runtimeStatus } from './intelligence-mesh-runtime.mjs';
import { queueHistoryJob } from './intelligence-mesh-scheduler.mjs';

export { meshEnabled };

export async function backfillWalletPass(env, wallet, options = {}) {
  return backfillHistoryPass(env, wallet, options);
}

export async function getMeshStatus(env = {}) {
  return runtimeStatus(env);
}

export async function getWalletCoverage(env = {}, wallet = '') {
  return coverageForWallet(env, wallet);
}

export async function queueWalletBackfill(env = {}, wallet = '', options = {}) {
  return queueHistoryJob(env, wallet, options);
}
