import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { ghostOpenCountSql } from '../scripts/backfill-ghost-open-rounds.mjs';
import { chainRoundGalaxy, deriveMatchedRounds, derivePosition, lotsFromOpenRounds, replaceableOpenIds, replayObjectForRound, staleOpenIds, tradesFromWalletEvidence } from './intelligence-research-materializer.mjs';

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
  assert.match(source,/replaceableOpenIds/);
  assert.match(source,/\[research-index-pump-pair\]/);
  assert.match(source,/\[research-index-basis-pair\]/);
  assert.doesNotMatch(source,/async function loadOpeningLots\(db,wallet,mint\)\{\s*try\{/);
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

test('an open row with no retained buy is seeded and is not deleted unless a new round replaces it',()=>{
  const kept={id:'round:wallet:mint:legacy:open',status:'open',entry_signature:'sig-old',entry_ts:100000,buy_sol:1,observed_inventory:10,evidence_ids_json:'["old-buy"]',wallet:'wallet',mint:'mint'};
  const sellOnly=[row('s1','sell',4,.5,200)];
  assert.deepEqual(replaceableOpenIds([kept],derivePosition(sellOnly).rounds,{openingLots:[],trades:sellOnly}),[]);
  const seeded=lotsFromOpenRounds([kept],{trades:sellOnly,storedLots:[]});
  assert.equal(seeded.length,1);
  assert.equal(seeded[0].evidenceId,'old-buy');
  assert.equal(seeded[0].remaining,10);
  const replaced=derivePosition(sellOnly,{openingLots:seeded});
  const closed=replaced.rounds.find(round=>round.status==='closed');
  assert.equal(closed.entrySignature,'sig-old');
  assert.equal(closed.matchedRealizedSol,.5- .4);
  assert.ok(replaced.rounds.some(round=>round.status==='open'&&round.observedInventory===6));
  assert.deepEqual(replaceableOpenIds([kept],replaced.rounds,{openingLots:seeded,trades:sellOnly}),['round:wallet:mint:legacy:open']);
  const unrelatedBuy=[row('b2','buy',5,.5,300)];
  assert.deepEqual(replaceableOpenIds([kept],derivePosition(unrelatedBuy).rounds,{openingLots:[],trades:unrelatedBuy}),[]);
  assert.equal(lotsFromOpenRounds([kept],{trades:[{...row('old-buy','buy',10,1,100),signature:'sig-old'}],storedLots:[]}).length,0);
});

test('0041 ghost delete is idempotent on 26 seeded rounds and keeps live open remainders',()=>{
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE matched_trade_rounds (
    id TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    mint TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('closed','open','unmatched')),
    entry_signature TEXT,
    exit_signature TEXT,
    entry_ts INTEGER,
    exit_ts INTEGER,
    buy_sol REAL,
    sell_sol REAL,
    matched_realized_sol REAL,
    observed_inventory REAL,
    method TEXT NOT NULL,
    evidence_ids_json TEXT NOT NULL DEFAULT '[]',
    coverage TEXT NOT NULL DEFAULT 'partial',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  const method='bounded-fifo-observed-swaps-v1';
  const round=(id,overrides)=>({id,wallet:'W',mint:'M',status:'open',entry_signature:null,exit_signature:null,entry_ts:1,exit_ts:null,buy_sol:1,sell_sol:null,matched_realized_sol:null,observed_inventory:1,method,evidence_ids_json:'[]',coverage:'partial',created_at:1,updated_at:1,...overrides});
  const rows=[
    round('ghost-1-open',{entry_signature:'ea',updated_at:100}),
    round('ghost-2-open',{entry_signature:'eb',updated_at:100}),
    round('ghost-3-open',{entry_signature:'ec',updated_at:100}),
    round('ghost-4-open',{entry_signature:'ed',updated_at:100}),
    round('ghost-5-open',{entry_signature:'ee',updated_at:100}),
    round('ghost-6-open',{entry_signature:'ef',updated_at:100}),
    round('ghost-1-closed',{status:'closed',entry_signature:'ea',exit_signature:'xa',exit_ts:2,sell_sol:2,matched_realized_sol:1,observed_inventory:0,updated_at:200}),
    round('ghost-2-closed',{status:'closed',entry_signature:'eb',exit_signature:'xb',exit_ts:2,sell_sol:2,matched_realized_sol:1,observed_inventory:0,updated_at:200}),
    round('ghost-3-closed',{status:'closed',entry_signature:'ec',exit_signature:'xc',exit_ts:2,sell_sol:2,matched_realized_sol:1,observed_inventory:0,updated_at:200}),
    round('ghost-4-closed',{status:'closed',entry_signature:'ed',exit_signature:'xd',exit_ts:2,sell_sol:2,matched_realized_sol:1,observed_inventory:0,updated_at:200}),
    round('ghost-5-closed',{status:'closed',entry_signature:'ee',exit_signature:'xe',exit_ts:2,sell_sol:2,matched_realized_sol:1,observed_inventory:0,updated_at:200}),
    round('ghost-6-closed',{status:'closed',entry_signature:'ef',exit_signature:'xf',exit_ts:2,sell_sol:2,matched_realized_sol:1,observed_inventory:0,updated_at:200}),
    round('live-equal-open',{entry_signature:'elive',updated_at:500}),
    round('live-equal-closed',{status:'closed',entry_signature:'elive',exit_signature:'xl',exit_ts:3,sell_sol:1.2,matched_realized_sol:.2,observed_inventory:0,updated_at:500}),
    round('live-newer-open',{entry_signature:'enew',updated_at:800}),
    round('live-older-closed',{status:'closed',entry_signature:'enew',exit_signature:'xn',exit_ts:3,sell_sol:1.2,matched_realized_sol:.2,observed_inventory:0,updated_at:700}),
    round('null-entry-open',{entry_signature:null,updated_at:50}),
    round('orphan-open',{entry_signature:'eorphan',updated_at:50}),
    round('other-wallet-open',{wallet:'W2',entry_signature:'ea',updated_at:50}),
    round('other-mint-open',{mint:'M2',entry_signature:'ea',updated_at:50}),
    round('blank-entry-open',{entry_signature:'',updated_at:50}),
    round('unmatched-row',{status:'unmatched',exit_signature:'xu',sell_sol:.4,observed_inventory:0,updated_at:50}),
    round('closed-only',{status:'closed',entry_signature:'eonly',exit_signature:'xo',exit_ts:4,sell_sol:1,matched_realized_sol:0,observed_inventory:0,updated_at:50}),
    round('unmatched-open',{entry_signature:'eun',updated_at:50}),
    round('unmatched-sibling',{status:'unmatched',entry_signature:'eun',exit_signature:'xu2',sell_sol:.4,observed_inventory:0,updated_at:900}),
    round('newer-same-entry-open',{entry_signature:'ea',updated_at:250}),
  ];
  assert.equal(rows.length,26);
  const insert=db.prepare(`INSERT INTO matched_trade_rounds(id,wallet,mint,status,entry_signature,exit_signature,entry_ts,exit_ts,buy_sol,sell_sol,matched_realized_sol,observed_inventory,method,evidence_ids_json,coverage,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for(const item of rows)insert.run(item.id,item.wallet,item.mint,item.status,item.entry_signature,item.exit_signature,item.entry_ts,item.exit_ts,item.buy_sol,item.sell_sol,item.matched_realized_sol,item.observed_inventory,item.method,item.evidence_ids_json,item.coverage,item.created_at,item.updated_at);
  const statement=readFileSync(new URL('./migrations/0041_matched_round_ghost_backfill.sql',import.meta.url),'utf8').split('\n').filter(line=>!line.trim().startsWith('--')).join('\n');
  const remove=db.prepare(statement);
  const first=remove.run();
  assert.equal(first.changes,6);
  const survivors=db.prepare('SELECT id FROM matched_trade_rounds ORDER BY id').all().map(item=>item.id);
  assert.deepEqual(survivors,[
    'blank-entry-open','closed-only','ghost-1-closed','ghost-2-closed','ghost-3-closed','ghost-4-closed','ghost-5-closed','ghost-6-closed',
    'live-equal-closed','live-equal-open','live-newer-open','live-older-closed','newer-same-entry-open','null-entry-open','orphan-open',
    'other-mint-open','other-wallet-open','unmatched-open','unmatched-row','unmatched-sibling',
  ]);
  assert.equal(survivors.includes('ghost-1-open'),false);
  assert.equal(survivors.includes('live-equal-open'),true);
  const second=remove.run();
  assert.equal(second.changes,0);
  assert.deepEqual(db.prepare('SELECT id FROM matched_trade_rounds ORDER BY id').all().map(item=>item.id),survivors);
  db.close();
});
