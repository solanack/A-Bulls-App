import test from 'node:test';import assert from 'node:assert/strict';import { normalizeFomoLeaderboard,providerPositions,__fomoGalaxyContract } from './intelligence-fomo-galaxy.mjs';
const SOL='So11111111111111111111111111111111111111112';
test('Fomo Galaxy is bounded and read-only',()=>{assert.equal(__fomoGalaxyContract.maximumTraders,50);assert.equal(__fomoGalaxyContract.maximumPositions,10);assert.equal(__fomoGalaxyContract.latestTrades,3);assert.equal(__fomoGalaxyContract.readOnly,true);assert.equal(__fomoGalaxyContract.provider,'fomoapi.io');assert.equal(__fomoGalaxyContract.currentSnapshotOnly,true);assert.equal(__fomoGalaxyContract.chainQualifiedTopTokens,true);});
test('normalizes provider rows without inventing wallet stars',()=>{const items=normalizeFomoLeaderboard({data:[{rank:1,handle:'@one',displayName:'One',pnl:1234,solanaWallet:SOL,topTokens:[{mint:SOL,symbol:'SOL'}]},{rank:2,handle:'no-wallet',pnl:999}]},1_800_000_000_000);assert.equal(items.length,1);assert.equal(items[0].handle,'one');assert.equal(items[0].reportedPnlUsd,1234);assert.equal(items[0].solanaWallet,SOL);assert.equal(items[0].topTokens[0].mint,SOL);});
test('duplicate handles collapse and cap at fifty',()=>{const rows=Array.from({length:60},(_,index)=>({rank:index+1,handle:`trader${index}`,solanaWallet:SOL.slice(0,-2)+String(index%10+1).padStart(2,'1')}));const normalized=normalizeFomoLeaderboard(rows);assert.ok(normalized.length<=50);});


test('provider top tokens preserve an explicit EVM chain instead of disappearing from trader planets',()=>{
  const evm='0x2222222222222222222222222222222222222222',items=normalizeFomoLeaderboard({data:[{rank:1,handle:'evm-trader',evmWallet:'0x1111111111111111111111111111111111111111',topTokens:[{address:evm,symbol:'BASE',chain:'base',networkId:'base'}]}]});
  assert.equal(items[0].topTokens[0].chain,'base');
  const positions=providerPositions(items[0]);
  assert.equal(positions.length,1);
  assert.equal(positions[0].mint,evm);
  assert.equal(positions[0].chain,'base');
});
