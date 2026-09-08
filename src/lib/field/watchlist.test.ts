import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWatchlist, saveWatchlist, parseWatchlist, serializeWatchlist, toggleWatchItem, mintKey, isWatched } from './watchlist.ts';

test('token planets and wallet stars survive reload with distinct watch identities',()=>{
  const token='A'.repeat(32),wallet='a'.repeat(32);
  const items=toggleWatchItem(toggleWatchItem([],{subjectKind:'token',subjectId:token,galaxyId:'solana-core'}),{subjectKind:'wallet',subjectId:wallet,galaxyId:'solana-core'});
  const parsed=parseWatchlist(serializeWatchlist(items));
  assert.equal(parsed.length,2);
  assert.equal(isWatched(parsed,'token',token),true);
  assert.equal(isWatched(parsed,'wallet',wallet),true);
  assert.notEqual(mintKey(token),mintKey(wallet));
  assert.equal(mintKey(`0x${'AB'.repeat(20)}`),`0x${'ab'.repeat(20)}`);
});

test('v1 token-only watchlists migrate to v2 token subjects',()=>{
  const token='A'.repeat(32);
  const items=parseWatchlist(JSON.stringify({v:1,items:[{mint:token,galaxyId:'pump-fun',addedAt:123}]}));
  assert.equal(items[0].subjectKind,'token');
  assert.equal(items[0].subjectId,token);
});

test('blocked browser storage does not break the field or session watchlist',()=>{
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
  assert.deepEqual(loadWatchlist(storage),[]);
  const items=toggleWatchItem([],{subjectKind:'token',subjectId:'A'.repeat(32),galaxyId:'solana-core'});
  assert.deepEqual(saveWatchlist(items,storage),items);
});
