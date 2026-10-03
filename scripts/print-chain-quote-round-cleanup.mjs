import { pathToFileURL } from 'node:url';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const AFTER = 1791000000000;
const METHOD = 'bounded-fifo-observed-swaps-v1';
const USDC_PLANET = `planet:fomo:${USDC}`;

/**
 * Flood rows only. created_at must be in the window. updated_at alone is not enough:
 * a pre-deploy row can be touched later and would otherwise match.
 * Xs matching is case-sensitive GLOB, not LIKE: LIKE would also select XSTuo…, which is not an xStock mint.
 * The live writer skips the eight XSTOCK_REGISTRY mints, and non-registry Xs dust below 0.001 SOL.
 * This cleanup is wider on purpose: it removes the Xs-prefixed rounds the uncapped chain phase already wrote.
 * Registry xStock mints are not rewritten.
 */
const floodTime = `created_at >= ${AFTER}`;

const unmatchedQuoteWhere = `status = 'unmatched'
  AND entry_signature IS NULL
  AND mint IN ('${USDC}', '${USDT}')
  AND ${floodTime}`;

const usdcPositionWhere = `mint = '${USDC}'
  AND status IN ('closed', 'open')
  AND method = '${METHOD}'
  AND ${floodTime}`;

const xstockUnmatchedWhere = `status = 'unmatched'
  AND entry_signature IS NULL
  AND mint GLOB 'Xs*'
  AND method = '${METHOD}'
  AND ${floodTime}`;

const xstockPositionWhere = `mint GLOB 'Xs*'
  AND status IN ('closed', 'open')
  AND method = '${METHOD}'
  AND ${floodTime}`;

const otherUnmatchedWhere = `status = 'unmatched'
  AND entry_signature IS NULL
  AND method = '${METHOD}'
  AND created_at >= ${AFTER}
  AND evidence_ids_json NOT LIKE '%:%'
  AND mint NOT IN ('${USDC}', '${USDT}')
  AND mint NOT GLOB 'Xs*'`;

function objectDelete(where) {
  return `DELETE FROM research_index_objects
WHERE id IN (SELECT 'matched:' || id FROM matched_trade_rounds WHERE ${where})
   OR id IN (SELECT 'replay:' || id FROM matched_trade_rounds WHERE ${where});`;
}

function edgeDelete(where) {
  return `DELETE FROM research_graph_edges
WHERE from_id IN (SELECT 'matched:' || id FROM matched_trade_rounds WHERE ${where})
   OR to_id IN (SELECT 'matched:' || id FROM matched_trade_rounds WHERE ${where})
   OR from_id IN (SELECT 'replay:' || id FROM matched_trade_rounds WHERE ${where})
   OR to_id IN (SELECT 'replay:' || id FROM matched_trade_rounds WHERE ${where});`;
}

function roundDelete(where) {
  return `DELETE FROM matched_trade_rounds
WHERE ${where};`;
}

/**
 * planet:fomo:USDC is one object shared by every USDC round.
 * Remove it only when no non-USDC round still references it and no pre-deploy USDC round remains.
 * In-scope USDC rounds are deleted after this object step, so they do not keep the planet.
 * Star and planet objects for other mints are not in this statement.
 */
function usdcPlanetDelete() {
  return `DELETE FROM research_index_objects
WHERE id = '${USDC_PLANET}'
  AND NOT EXISTS (
    SELECT 1 FROM research_graph_edges e
    JOIN matched_trade_rounds r
      ON e.from_id = 'matched:' || r.id
      OR e.to_id = 'matched:' || r.id
      OR e.from_id = 'replay:' || r.id
      OR e.to_id = 'replay:' || r.id
    WHERE (e.from_id = '${USDC_PLANET}' OR e.to_id = '${USDC_PLANET}')
      AND r.mint <> '${USDC}'
  )
  AND NOT EXISTS (
    SELECT 1 FROM matched_trade_rounds
    WHERE mint = '${USDC}'
      AND created_at < ${AFTER}
      AND ifnull(updated_at, 0) < ${AFTER}
  );`;
}

/** Read-only twin of one cleanup DELETE. The WHERE clause is the delete text. */
export function cleanupCountSql(deleteSql, alias) {
  const statement = String(deleteSql).trim().replace(/;\s*$/, '');
  const count = statement.replace(/^DELETE FROM (\w+)/i, `SELECT COUNT(*) AS ${alias}\nFROM $1`);
  if (!count.startsWith(`SELECT COUNT(*) AS ${alias}\nFROM `)) throw new Error('cleanup_count_not_derived');
  if (!count.includes('1791000000000') && !count.includes('matched_trade_rounds WHERE')) throw new Error('cleanup_predicate_missing');
  return `${count};`;
}

const CLEANUP_GROUPS = Object.freeze([
  ['unmatched_quote', unmatchedQuoteWhere],
  ['usdc_position', usdcPositionWhere],
  ['xstock_unmatched', xstockUnmatchedWhere],
  ['xstock_position', xstockPositionWhere],
  ['other_unmatched', otherUnmatchedWhere],
]);

export function chainQuoteCleanupPlan() {
  const edges = CLEANUP_GROUPS.map(([alias, where]) => ({ alias: `${alias}_edges`, sql: edgeDelete(where) }));
  const objects = CLEANUP_GROUPS.map(([alias, where]) => ({ alias: `${alias}_objects`, sql: objectDelete(where) }));
  objects.push({ alias: 'usdc_fomo_planet', sql: usdcPlanetDelete() });
  const rounds = CLEANUP_GROUPS.map(([alias, where]) => ({ alias: `${alias}_rounds`, sql: roundDelete(where) }));
  return Object.freeze([...edges, ...objects, ...rounds]);
}

export function xstockUnmatchedCountSql() {
  return cleanupCountSql(roundDelete(xstockUnmatchedWhere), 'xstock_unmatched_rounds');
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const plan = chainQuoteCleanupPlan();
  console.log('-- Read-only counts. Run these first and review the numbers.');
  console.log('-- This script does not connect to D1 and does not apply any statement.');
  console.log('-- It is not a migration. Leave it un-run until the fixed Worker is deployed and CK approves.');
  console.log('-- RESEARCH_CHAIN_ROUNDS_ENABLED stays off until QA has verified the fix on production-shaped data and CK approves re-enabling.');
  console.log('-- Order of operations: deploy the fix, delete edges, then objects, then rounds, then enable the flag.');
  console.log('-- Pre-deploy rows stay out of scope: created_at must be at least 1791000000000. updated_at alone does not qualify.');
  console.log('-- other_unmatched also requires evidence_ids_json without a colon, so pump event ids stay.');
  console.log('-- Xs predicates use case-sensitive GLOB \'Xs*\'. A case-insensitive prefix match is not used.');
  console.log(`-- ${USDC_PLANET} delete is only safe after the edges are deleted. Its COUNT times out on D1 if run first.`);
  const planet = plan.find(step => step.alias === 'usdc_fomo_planet');
  for (const step of plan) if (step !== planet) console.log(`\n${cleanupCountSql(step.sql, step.alias)}`);
  console.log('\n-- Deletes. Not a migration. Do not run until the counts above have been reviewed,');
  console.log('-- the fixed Worker is deployed, and CK approves. Order is edges, objects, then rounds.');
  for (const step of plan) {
    if (step === planet) {
      console.log(`\n-- ${USDC_PLANET} delete is only safe after the edges are deleted.`);
      console.log('-- Its COUNT times out on D1 if run first. Run this count only after those edge deletes.');
      console.log(cleanupCountSql(step.sql, step.alias));
    }
    console.log(`\n${step.sql.trim()}`);
  }
}
