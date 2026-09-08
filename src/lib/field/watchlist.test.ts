import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWatchlist, saveWatchlist, parseWatchlist, serializeWatchlist, toggleWatchItem, mintKey } from './watchlist.ts';

test('Solana pins survive reload and retain case-sensitive identity', () => {
  const a = 'A'.repeat(32), b = 'a'.repeat(32);
  const items = toggleWatchItem(toggleWatchItem([], {mint:a,galaxyId:'solana-core'}), {mint:b,galaxyId:'solana-core'});
  assert.equal(parseWatchlist(serializeWatchlist(items)).length, 2);
  assert.notEqual(mintKey(a), mintKey(b));
  assert.equal(mintKey(`0x${'AB'.repeat(20)}`), `0x${'ab'.repeat(20)}`);
});
test('blocked browser storage does not break the field or session pins', () => {
  const storage = { getItem(){throw Error('blocked');}, setItem(){throw Error('quota');} };
  assert.deepEqual(loadWatchlist(storage), []);
  const items = toggleWatchItem([], {mint:'A'.repeat(32),galaxyId:'solana-core'});
  assert.deepEqual(saveWatchlist(items, storage), items);
});
