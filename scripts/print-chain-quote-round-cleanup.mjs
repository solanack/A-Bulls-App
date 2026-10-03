import { pathToFileURL } from 'node:url';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const AFTER = 1791000000000;

const unmatchedQuoteWhere = `status = 'unmatched'
  AND entry_signature IS NULL
  AND mint IN ('${USDC}', '${USDT}')
  AND (created_at >= ${AFTER} OR updated_at >= ${AFTER})`;

const usdcPositionWhere = `mint = '${USDC}'
  AND status IN ('closed', 'open')
  AND method = 'bounded-fifo-observed-swaps-v1'
  AND (created_at >= ${AFTER} OR updated_at >= ${AFTER})`;

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

/** Read-only twin of one cleanup DELETE. The WHERE clause is the delete text. */
export function cleanupCountSql(deleteSql, alias) {
  const statement = String(deleteSql).trim().replace(/;\s*$/, '');
  const count = statement.replace(/^DELETE FROM (\w+)/i, `SELECT COUNT(*) AS ${alias}\nFROM $1`);
  if (!count.startsWith(`SELECT COUNT(*) AS ${alias}\nFROM `)) throw new Error('cleanup_count_not_derived');
  if (!count.includes('1791000000000') && !count.includes('matched_trade_rounds WHERE')) throw new Error('cleanup_predicate_missing');
  return `${count};`;
}

export function chainQuoteCleanupPlan() {
  return Object.freeze([
    { alias: 'unmatched_quote_edges', sql: edgeDelete(unmatchedQuoteWhere) },
    { alias: 'unmatched_quote_objects', sql: objectDelete(unmatchedQuoteWhere) },
    { alias: 'unmatched_quote_rounds', sql: roundDelete(unmatchedQuoteWhere) },
    { alias: 'usdc_position_edges', sql: edgeDelete(usdcPositionWhere) },
    { alias: 'usdc_position_objects', sql: objectDelete(usdcPositionWhere) },
    { alias: 'usdc_position_rounds', sql: roundDelete(usdcPositionWhere) },
  ]);
}

export function xstockUnmatchedCountSql() {
  return `SELECT COUNT(*) AS xstock_unmatched_rounds
FROM matched_trade_rounds
WHERE status = 'unmatched'
  AND entry_signature IS NULL
  AND mint LIKE 'Xs%'
  AND (created_at >= ${AFTER} OR updated_at >= ${AFTER});`;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const plan = chainQuoteCleanupPlan();
  console.log('-- Read-only counts. Run these first and review the numbers.');
  console.log('-- This script does not connect to D1 and does not apply any statement.');
  console.log('-- Run the deletes only after the fixed Worker is deployed, edges then objects then rounds.');
  for (const step of plan) console.log(`\n${cleanupCountSql(step.sql, step.alias)}`);
  console.log('\n-- Review-only. xStock unmatched rows are the same chain-phase class. No delete is printed for them.');
  console.log(xstockUnmatchedCountSql());
  console.log('\n-- Deletes. Not a migration. Do not run until the counts above have been reviewed');
  console.log('-- and the fixed Worker is already deployed. Order is edges, objects, then rounds.');
  for (const step of plan) console.log(`\n${step.sql.trim()}`);
}
