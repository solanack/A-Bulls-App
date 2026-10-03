import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ghostOpenCountSql } from '../scripts/backfill-ghost-open-rounds.mjs';
import { chainRoundGalaxy, deriveMatchedRounds, derivePosition, replayObjectForRound, staleOpenIds, tradesFromWalletEvidence } from './intelligence-research-materializer.mjs';

const row=(id,side,token,sol,time)=>({event_id:id,signature:`sig-${id}`,event_index:0,wallet:'wallet',mint:'mint',side,token_amount:token,sol_amount:sol,block_time:time});
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} ~= ${expected}`);

test('matched rounds close deterministic FIFO inventory cycles',()=>{
  const rounds=deriveMatchedRounds([row('b1','buy',100,1,100),row('s1','sell',40,.6,110),row('s2','sell',60,.9,120)]);
  assert.equal(rounds.length,2);
  assert.equal(rounds.every(round=>round.status==='closed'),true);
  near(rounds.reduce((sum,round)=>sum+round.matchedRealizedSol,0),.5);
  assert.deepEqual(rounds[0].evidenceIds,['b1','s1']);
  assert.deepEqual(rounds[1].evidenceIds,['b1','s2']);
  assert.equal(rounds[0].observedInventory,0);
});

test('partial sells close the priced slice and leave the remainder open',()=>{
  const rounds=deriveMatchedRounds([row('b1','buy',100,1,100),row('s1','sell',25,.4,110)]);
  const closed=rounds.find(round=>round.status==='closed'),open=rounds.find(round=>round.status==='open');
  assert.equal(rounds.length,2);
  near(closed.buySol,.25);near(closed.sellSol,.4);near(closed.matchedRealizedSol,.15);
  assert.equal(closed.observedInventory,0);
  assert.equal(open.matchedRealizedSol,null);
  assert.equal(open.observedInventory,75);
  near(open.buySol,.75);
});

test('unmatched sells remain explicitly unmatched instead of inventing cost basis',()=>{
  const rounds=deriveMatchedRounds([row('s1','sell',20,.25,100)]);
  assert.equal(rounds.length,1);assert.equal(rounds[0].status,'unmatched');assert.equal(rounds[0].buySol,null);assert.equal(rounds[0].matchedRealizedSol,null);
});

test('oversells split supported matched inventory from unsupported remainder',()=>{
  const rounds=deriveMatchedRounds([row('b1','buy',10,1,100),row('s1','sell',15,3,110)]);
  assert.equal(rounds.length,2);assert.equal(rounds[0].status,'closed');assert.equal(rounds[0].sellSol,2);assert.equal(rounds[0].matchedRealizedSol,1);assert.equal(rounds[1].status,'unmatched');assert.equal(rounds[1].sellSol,1);
});

test('closed matched rounds produce deterministic Replay Index objects',()=>{
  const [round]=deriveMatchedRounds([row('b1','buy',10,1,100),row('s1','sell',10,1.5,120)]),replay=replayObjectForRound(round,{lastTs:999000,symbol:'TEST'});
  assert.equal(replay.kind,'replay');assert.equal(replay.sourceKind,'derived');assert.equal(replay.payload.matchedRoundId,round.id);assert.equal(replay.payload.fromTs,100000);assert.equal(replay.payload.toTs,120000);assert.equal(replay.payload.entrySignature,'sig-b1');assert.equal(replay.payload.exitSignature,'sig-s1');assert.deepEqual(replay.payload.evidenceIds,['b1','s1']);
});

test('open rounds get a bounded retained Replay window without fabricated exit',()=>{
  const [round]=deriveMatchedRounds([row('b1','buy',10,1,100)]),replay=replayObjectForRound(round,{lastTs:180000});
  assert.equal(replay.payload.status,'open');assert.equal(replay.payload.fromTs,100000);assert.equal(replay.payload.toTs,180000);assert.equal(replay.payload.exitSignature,null);
});

test('unmatched sells do not generate a Replay round with invented entry context',()=>{
  const [round]=deriveMatchedRounds([row('s1','sell',10,1,100)]);
  assert.equal(replayObjectForRound(round,{lastTs:180000}),null);
});

test('a flat round realizes priced lots and leaves unpriced quantity unmatched',()=>{
  const rounds=deriveMatchedRounds([row('b1','buy',10,1,100),row('b2','buy',10,null,105),row('s1','sell',20,3,110)]);
  const closed=rounds.find(round=>round.status==='closed'),unmatched=rounds.filter(round=>round.status==='unmatched');
  near(closed.buySol,1);near(closed.sellSol,1.5);near(closed.matchedRealizedSol,.5);
  assert.equal(unmatched.length,1);
  assert.equal(unmatched[0].matchedRealizedSol,null);
  near(unmatched[0].sellSol,1.5);
  assert.equal(rounds.some(round=>round.status==='open'),false);
});

test('unknown sell proceeds stay unmatched instead of poisoning a known buy',()=>{
  const rounds=deriveMatchedRounds([row('b1','buy',10,1,100),row('s1','sell',10,null,110)]);
  assert.equal(rounds.length,1);
  assert.equal(rounds[0].status,'unmatched');
  assert.equal(rounds[0].matchedRealizedSol,null);
  assert.equal(rounds[0].buySol,null);
});

test('opening lots are basis for a later sell without a second provider fetch',()=>{
  const {rounds,openLots}=derivePosition([row('s1','sell',10,2,200)],{openingLots:[{remaining:10,cost:1,evidenceId:'old-buy',signature:'sig-old',openedAt:100000,wallet:'wallet',mint:'mint'}]});
  assert.equal(rounds.length,1);
  assert.equal(rounds[0].status,'closed');
  assert.equal(rounds[0].matchedRealizedSol,1);
  assert.equal(rounds[0].entrySignature,'sig-old');
  assert.equal(openLots.length,0);
});

test('stale open rows are removed only after a complete recompute',()=>{
  const next=deriveMatchedRounds([row('b1','buy',10,1,100),row('s1','sell',10,1.5,110)]);
  const existing=[{id:'round:wallet:mint:b1:open',status:'open'},{id:next[0].id,status:'closed'}];
  assert.deepEqual(staleOpenIds(existing,next,{complete:true}),['round:wallet:mint:b1:open']);
  const partial=deriveMatchedRounds([row('b1','buy',10,1,100),row('s1','sell',4,.5,110)]);
  const open=partial.find(round=>round.status==='open');
  assert.deepEqual(staleOpenIds([{id:open.id,status:'open'},{id:'round:wallet:mint:old:open',status:'open'}],partial,{complete:true}),['round:wallet:mint:old:open']);
  assert.deepEqual(staleOpenIds(existing,next,{complete:false}),[]);
});

test('wallet evidence uses wSOL route legs and does not convert USD or copy pump signatures',()=>{
  const trades=tradesFromWalletEvidence([
    {id:1,signature:'sig-sol',wallet:'wallet',mint:'mint',token_delta:5,sol_delta:0,block_time:10,realizedPnlUsd:99},
    {id:2,signature:'sig-usd',wallet:'wallet',mint:'mint',token_delta:-5,sol_delta:0,block_time:20,realizedPnlUsd:40},
    {id:3,signature:'sig-pump',wallet:'wallet',mint:'mint',token_delta:1,sol_delta:-1,block_time:30},
  ],[
    {signature:'sig-sol',wallet:'wallet',input_mint:'So11111111111111111111111111111111111111112',output_mint:'mint',input_amount:1.25,output_amount:5,block_time:10,hop_index:0},
    {signature:'sig-usd',wallet:'wallet',input_mint:'mint',output_mint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',input_amount:5,output_amount:80,block_time:20,hop_index:0},
  ],{pumpSignatures:new Set(['sig-pump'])});
  assert.equal(trades.length,2);
  assert.equal(trades[0].sol_amount,1.25);
  assert.equal(trades[1].sol_amount,null);
  assert.equal(trades.some(trade=>trade.signature==='sig-pump'),false);
  assert.equal(chainRoundGalaxy(['helius-afterbell-pool-window'],{fomoWallet:true}),'afterbell');
  assert.equal(chainRoundGalaxy(['bull-wallet-events'],{fomoWallet:true}),'fomo');
  assert.equal(chainRoundGalaxy(['helius-pump'],{fomoWallet:false}),null);
});

test('pump basis is paged into lots and ghost cleanup stays idempotent',()=>{
  const source=readFileSync(new URL('./intelligence-research-materializer.mjs',import.meta.url),'utf8');
  const migration=readFileSync(new URL('./migrations/0041_matched_round_ghost_backfill.sql',import.meta.url),'utf8');
  const lots=readFileSync(new URL('./migrations/0042_matched_position_lots.sql',import.meta.url),'utf8');
  const script=readFileSync(new URL('../scripts/backfill-ghost-open-rounds.mjs',import.meta.url),'utf8');
  assert.match(source,/matched_basis_applied/);
  assert.match(source,/matched_position_lots/);
  assert.doesNotMatch(source,/LIMIT 300/);
  assert.match(migration,/status = 'open'/);
  assert.match(migration,/updated_at >/);
  assert.doesNotMatch(migration,/DROP/i);
  assert.match(lots,/CREATE TABLE IF NOT EXISTS matched_position_lots/);
  assert.match(lots,/lot_order/);
  assert.match(script,/0041_matched_round_ghost_backfill\.sql/);
  assert.match(script,/does not connect to D1/);
  assert.doesNotMatch(script,/wrangler|INTELLIGENCE_DB|fetch\(/);
  const count=ghostOpenCountSql(migration);
  const predicate=sql=>sql.replace(/^--.*$/gm,'').trim().replace(/;\s*$/,'').replace(/^(?:DELETE|SELECT COUNT\(\*\) AS ghost_open_rounds)\s+FROM matched_trade_rounds/i,'');
  assert.match(count,/^SELECT COUNT\(\*\) AS ghost_open_rounds\nFROM matched_trade_rounds/);
  assert.equal(predicate(count),predicate(migration));
});
