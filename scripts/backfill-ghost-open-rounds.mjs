import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const migrationUrl = new URL('../workers/migrations/0041_matched_round_ghost_backfill.sql', import.meta.url);

/** Read-only twin of the 0041 DELETE. The WHERE clause is the migration text, not a second copy. */
export function ghostOpenCountSql(deleteMigration) {
  const statement = String(deleteMigration).replace(/^--.*$/gm, '').trim();
  const count = statement.replace(/^DELETE FROM matched_trade_rounds/i, 'SELECT COUNT(*) AS ghost_open_rounds\nFROM matched_trade_rounds');
  if (!count.startsWith('SELECT COUNT(*) AS ghost_open_rounds\nFROM matched_trade_rounds\nWHERE status = \'open\'')) {
    throw new Error('ghost_count_not_derived');
  }
  if (!count.includes('updated_at >')) throw new Error('ghost_count_predicate_missing');
  return count.endsWith(';') ? count : `${count};`;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const sql = readFileSync(migrationUrl, 'utf8').trim();
  console.log('-- Read-only pre-count. This does not delete rows.');
  console.log(ghostOpenCountSql(sql));
  console.log('\n-- Applied by deploy. Idempotent.');
  console.log(sql);
  console.log('\n-- print-only. This script does not connect to D1 and does not apply the statement.');
  console.log('-- Deploy applies workers/migrations/0041_matched_round_ghost_backfill.sql. Re-running it is safe.');
}
