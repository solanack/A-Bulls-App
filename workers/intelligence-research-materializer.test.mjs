import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { ghostOpenCountSql } from '../scripts/backfill-ghost-open-rounds.mjs';
import { chainQuoteCleanupPlan, cleanupCountSql, xstockUnmatchedCountSql } from '../scripts/print-chain-quote-round-cleanup.mjs';
import { chainRoundGalaxy, chainRoundsToWrite, deriveMatchedRounds, derivePosition, isChainQuoteMint, lotsFromOpenRounds, materializeResearchIndex, partitionPumpSnapshot, replaceableOpenIds, replayObjectForRound, staleOpenIds, tradesFromWalletEvidence } from './intelligence-research-materializer.mjs';

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

test('quote legs and xStock mints are not chain rounds, and a rerun does not add rows',async()=>{
  const usdc='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',usdt='Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',wsol='So11111111111111111111111111111111111111112';
  const xstock='XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1',token='TokenMint11111111111111111111111111111111';
  assert.equal(isChainQuoteMint(usdc),true);assert.equal(isChainQuoteMint(usdt),true);assert.equal(isChainQuoteMint(wsol),true);assert.equal(isChainQuoteMint(xstock),true);assert.equal(isChainQuoteMint(token),false);
  const event=(signature,mint,delta,sol,time)=>({id:signature,signature,wallet:'W',mint,token_delta:delta,sol_delta:sol,block_time:time,source:'helius-afterbell-pool-window'});
  const trades=tradesFromWalletEvidence([
    event('spend',usdc,-20,0,10),
    event('xfer',usdc,-5,0,11),
    event('usdt-sell',usdt,-8,0,12),
    event('xs-buy',xstock,3,0,13),
    event('xs-sell',xstock,-3,0,14),
    event('buy',token,10,-1,15),
    event('sell',token,-10,1.4,16),
    event('orphan',token,-4,0.4,17),
  ],[
    {signature:'quote-buy',wallet:'W',input_mint:wsol,output_mint:usdc,input_amount:1,output_amount:20,block_time:9,hop_index:0},
  ]);
  assert.equal(trades.some(trade=>trade.mint===usdc||trade.mint===usdt||trade.mint===wsol||trade.mint.startsWith('Xs')),false);
  const rounds=deriveMatchedRounds(trades);
  const closed=rounds.filter(round=>round.status==='closed');
  assert.equal(closed.length,1);
  assert.equal(closed[0].mint,token);
  assert.equal(closed[0].entrySignature,'buy');
  assert.equal(chainRoundsToWrite(rounds).some(round=>round.status==='unmatched'),false);
  const sellOnly=deriveMatchedRounds([{event_id:'only',signature:'only',wallet:'W',mint:token,side:'sell',token_amount:4,sol_amount:.4,block_time:17}]);
  assert.equal(sellOnly[0].status,'unmatched');assert.equal(sellOnly[0].entrySignature,null);assert.equal(chainRoundsToWrite(sellOnly).length,0);
  assert.equal(chainRoundsToWrite(Array.from({length:30},(_,index)=>({id:`c${index}`,status:'closed'}))).length,25);
  const again=deriveMatchedRounds(trades);
  assert.deepEqual(again.map(round=>round.id),rounds.map(round=>round.id));
  assert.equal(again[0].id.includes('179'),false);
  const sql=new DatabaseSync(':memory:');
  const migrationDir=new URL('./migrations/',import.meta.url);
  for(const file of readdirSync(migrationDir).filter(name=>name.endsWith('.sql')).sort())sql.exec(readFileSync(new URL(file,migrationDir),'utf8'));
  const norm=values=>values.map(value=>value===undefined?null:value);
  const db={prepare:query=>{const statement=(args=[])=>({bind(...bound){return statement(bound);},async all(){return {results:sql.prepare(query).all(...norm(args))};},async first(){return (await this.all()).results[0]??null;},async run(){return {meta:{changes:Number(sql.prepare(query).run(...norm(args)).changes)}};}});return statement();},async batch(statements){sql.exec('BEGIN');try{for(const statement of statements)sql.prepare(statement.q).run(...norm(statement.args));sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}}};
  const wrap=db.prepare;db.prepare=query=>{const statement=wrap(query);statement.q=query;const bind=statement.bind.bind(statement);statement.bind=(...args)=>{const bound=bind(...args);bound.q=query;bound.args=args;return bound;};return statement;};
  const insert=(signature,mint,delta,sol,time)=>sql.prepare(`INSERT INTO bull_wallet_events(signature,slot,block_time,wallet,mint,event_class,sol_delta,token_delta,fee_lamports,source,confidence) VALUES(?,1,?,?,?,'swap-like',?,?,0,'helius-afterbell-pool-window',1)`).run(signature,time,'W',mint,sol,delta);
  insert('spend',usdc,-20,0,10);insert('xfer',usdc,-5,0,11);insert('xs-buy',xstock,3,0,13);insert('xs-sell',xstock,-3,0,14);insert('buy',token,10,-1,15);insert('sell',token,-10,1.4,16);insert('orphan','OtherMint1111111111111111111111111111111',-4,.4,17);
  const snapshot=()=>({rounds:sql.prepare(`SELECT id,mint,status,entry_signature FROM matched_trade_rounds ORDER BY id`).all(),objects:sql.prepare(`SELECT COUNT(*) c FROM research_index_objects`).get().c,edges:sql.prepare(`SELECT COUNT(*) c FROM research_graph_edges`).get().c});
  const gatedOff=await materializeResearchIndex({INTELLIGENCE_DB:db},1790000000000);
  assert.deepEqual(gatedOff.chain,{wallets:0,rounds:0});
  assert.equal(snapshot().rounds.length,0);
  await materializeResearchIndex({INTELLIGENCE_DB:db,RESEARCH_CHAIN_ROUNDS_ENABLED:'1'},1790000000000);
  const first=snapshot();
  assert.equal(first.rounds.some(round=>round.mint===usdc||round.mint===xstock),false);
  assert.equal(first.rounds.some(round=>round.status==='unmatched'),false);
  assert.equal(first.rounds.filter(round=>round.mint===token&&round.status==='closed').length,1);
  await materializeResearchIndex({INTELLIGENCE_DB:db,RESEARCH_CHAIN_ROUNDS_ENABLED:'1'},1790000900000);
  const second=snapshot();
  assert.deepEqual(second.rounds,first.rounds);
  assert.equal(second.objects,first.objects);
  assert.equal(second.edges,first.edges);
  const plan=chainQuoteCleanupPlan();
  assert.equal(plan.length,6);
  for(const step of plan){const count=cleanupCountSql(step.sql,step.alias);assert.match(count,/^SELECT COUNT\(\*\)/);assert.match(count,/1791000000000/);assert.doesNotMatch(step.sql,/^DELETE FROM matched_trade_rounds[\s\S]*DELETE/);}
  const printed=readFileSync(new URL('../scripts/print-chain-quote-round-cleanup.mjs',import.meta.url),'utf8');
  assert.match(printed,/does not connect to D1/);
  assert.doesNotMatch(printed,/wrangler|INTELLIGENCE_DB|fetch\(/);
  assert.match(xstockUnmatchedCountSql(),/mint LIKE 'Xs%'/);
  assert.match(readFileSync(new URL('./intelligence-research-materializer.mjs',import.meta.url),'utf8'),/if\(env\.RESEARCH_CHAIN_ROUNDS_ENABLED==='1'\)\{try\{result\.chain=await materializeChainRounds\(db,env,now\);\}/);
  sql.close();
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
  assert.match(source,/\[research-index-chain-wallet\]/);
  assert.match(source,/partitionPumpSnapshot/);
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
  const alreadyNetted={...kept,updated_at:500_000};
  const nettedSell={...row('s1','sell',4,.5,200),event_id:'sell-kept:0'};
  const netted=partitionPumpSnapshot([alreadyNetted],[nettedSell]);
  assert.equal(netted.fresh.length,0);
  assert.equal(derivePosition(netted.fresh,{openingLots:netted.seeded}).rounds.find(round=>round.status==='open').observedInventory,10);
});

test('a seeded open row is not replayed against trades it already includes',()=>{
  const open=(inventory,evidence,updatedAt,entry)=>({id:`round:wallet:mint:${entry}:open`,status:'open',entry_signature:entry,entry_ts:1000,buy_sol:inventory/1000,observed_inventory:inventory,evidence_ids_json:JSON.stringify(evidence),updated_at:updatedAt,wallet:'wallet',mint:'mint'});
  const trade=(id,side,token,sol,time)=>({event_id:id,signature:id.split(':')[0],event_index:0,wallet:'wallet',mint:'mint',side,token_amount:token,sol_amount:sol,block_time:time});
  const positionFor=(opens,trades)=>{
    const snapshot=partitionPumpSnapshot(opens,trades);
    const position=derivePosition(snapshot.fresh,{openingLots:snapshot.seeded});
    const again=partitionPumpSnapshot(position.rounds.filter(round=>round.status==='open').map(round=>({...round,updated_at:900_000})),snapshot.fresh);
    return {snapshot,position,again};
  };
  const nettedSell=positionFor([open(700,['sigA0:0'],400_000,'sigA0')],[trade('sellA:0','sell',300,.2,100)]);
  assert.equal(nettedSell.snapshot.fresh.length,0);
  assert.equal(nettedSell.position.rounds.some(round=>round.status==='closed'),false);
  assert.equal(nettedSell.position.rounds.find(round=>round.status==='open').observedInventory,700);
  assert.equal(nettedSell.again.fresh.length,0);
  assert.equal(derivePosition(nettedSell.again.fresh,{openingLots:nettedSell.again.seeded}).rounds.find(round=>round.status==='open').observedInventory,700);
  const oversell=positionFor([open(200,['sigB0:0'],400_000,'sigB0')],[trade('sellB:0','sell',300,.2,100)]);
  assert.equal(oversell.position.rounds.some(round=>round.status!=='open'),false);
  assert.equal(oversell.position.rounds.find(round=>round.status==='open').observedInventory,200);
  const retainedBuy=positionFor([open(500,['b1:0','b2:0'],400_000,'b1')],[trade('b2:0','buy',200,.2,100)]);
  assert.equal(retainedBuy.snapshot.fresh.length,0);
  assert.equal(retainedBuy.position.openLots.length,1);
  assert.equal(retainedBuy.position.rounds.find(round=>round.status==='open').observedInventory,500);
  assert.equal(retainedBuy.again.fresh.length,0);
  const listedSell=trade('sellC:0','sell',300,.2,900);
  const listed=partitionPumpSnapshot([open(700,['sigC:0','sellC:0'],100_000,'sigC')],[listedSell]);
  assert.equal(listed.fresh.length,0);
  assert.equal(derivePosition(listed.fresh,{openingLots:listed.seeded}).rounds.find(round=>round.status==='open').observedInventory,700);
  const newer=open(10,['old-buy'],50_000,'sig-old');
  const freshSell=partitionPumpSnapshot([newer],[row('s-new','sell',4,.5,200)]);
  assert.equal(freshSell.fresh.length,1);
  assert.equal(derivePosition(freshSell.fresh,{openingLots:freshSell.seeded}).rounds.find(round=>round.status==='open').observedInventory,6);
});

test('materialized open inventory stays put when retained trades are already in the row',async()=>{
  const sql=new DatabaseSync(':memory:');
  const migrationDir=new URL('./migrations/',import.meta.url);
  for(const file of readdirSync(migrationDir).filter(name=>name.endsWith('.sql')).sort())sql.exec(readFileSync(new URL(file,migrationDir),'utf8'));
  const norm=values=>values.map(value=>value===undefined?null:value);
  const db={prepare:query=>{
    const statement=(args=[])=>({
      bind(...bound){return statement(bound);},
      async all(){return {results:sql.prepare(query).all(...norm(args))};},
      async first(){return (await this.all()).results[0]??null;},
      async run(){return {meta:{changes:Number(sql.prepare(query).run(...norm(args)).changes)}};}
    });
    return statement();
  },async batch(statements){sql.exec('BEGIN');try{for(const statement of statements)sql.prepare(statement.q).run(...norm(statement.args));sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}}};
  const wrap=db.prepare;
  db.prepare=query=>{const statement=wrap(query);statement.q=query;const bind=statement.bind.bind(statement);statement.bind=(...args)=>{const bound=bind(...args);bound.q=query;bound.args=args;return bound;};return statement;};
  const now=1790000000000,block=Math.floor(now/1000)-10*86400,updated=(block+3600)*1000;
  const insertTrade=(wallet,signature,side,token,sol,time)=>sql.prepare(`INSERT INTO pump_trades(event_id,signature,event_index,mint,wallet,side,token_amount,sol_amount,price_sol,slot,block_time,program_id,source,commitment,inserted_at) VALUES(?,?,0,'M',?,?,?,?,NULL,1,?,'p','t','confirmed',1)`).run(`${signature}:0`,signature,wallet,side,token,sol,time);
  const insertOpen=(wallet,entry,inventory,buy,evidence)=>sql.prepare(`INSERT INTO matched_trade_rounds(id,wallet,mint,status,entry_signature,exit_signature,entry_ts,exit_ts,buy_sol,sell_sol,matched_realized_sol,observed_inventory,method,evidence_ids_json,coverage,created_at,updated_at) VALUES(?,?,'M','open',?,NULL,1000,NULL,?,0,NULL,?,'m',?,'partial',?,?)`).run(`round:${wallet}:M:${entry}:0:open`,wallet,entry,buy,inventory,JSON.stringify(evidence),updated,updated);
  insertOpen('Wa','sigA0',700,.35,['sigA0:0']);
  insertTrade('Wa','sellA','sell',300,.2,block);
  insertOpen('Wa2','sigB0',200,.1,['sigB0:0']);
  insertTrade('Wa2','sellB','sell',300,.2,block);
  insertOpen('Wh','b1',500,.5,['b1:0','b2:0']);
  insertTrade('Wh','b2','buy',200,.2,block);
  insertOpen('Wb','buyB',700,.35,['buyB:0','sellWb:0']);
  insertTrade('Wb','buyB','buy',1000,.5,block-100);
  insertTrade('Wb','sellWb','sell',300,.2,block);
  const openInventory=wallet=>sql.prepare(`SELECT COALESCE(SUM(observed_inventory),0) inventory,SUM(status='open') opens,SUM(status='closed') closed FROM matched_trade_rounds WHERE wallet=?`).get(wallet);
  await materializeResearchIndex({INTELLIGENCE_DB:db},now);
  const first={a:openInventory('Wa'),over:openInventory('Wa2'),buy:openInventory('Wh'),both:openInventory('Wb')};
  assert.equal(first.a.inventory,700);assert.equal(first.a.opens,1);assert.equal(first.a.closed,0);
  assert.equal(first.over.inventory,200);assert.equal(first.over.opens,1);assert.equal(first.over.closed,0);
  assert.equal(first.buy.inventory,500);assert.equal(first.buy.opens,1);assert.equal(Number(first.buy.closed)||0,0);
  assert.equal(first.both.inventory,700);assert.equal(first.both.opens,1);
  await materializeResearchIndex({INTELLIGENCE_DB:db},now+900000);
  const second={a:openInventory('Wa'),over:openInventory('Wa2'),buy:openInventory('Wh'),both:openInventory('Wb')};
  assert.deepEqual(second,first);
  sql.close();
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

function researchMaterializerDb(){
  const sql=new DatabaseSync(':memory:');
  const migrationDir=new URL('./migrations/',import.meta.url);
  for(const file of readdirSync(migrationDir).filter(name=>name.endsWith('.sql')).sort())sql.exec(readFileSync(new URL(file,migrationDir),'utf8'));
  const norm=values=>values.map(value=>value===undefined?null:value);
  const seen=[];
  const db={prepare:query=>{
    seen.push(query);
    const statement=(args=[])=>({
      bind(...bound){return statement(bound);},
      async all(){return {results:sql.prepare(query).all(...norm(args))};},
      async first(){return (await this.all()).results[0]??null;},
      async run(){return {meta:{changes:Number(sql.prepare(query).run(...norm(args)).changes)}};}
    });
    return statement();
  },async batch(statements){sql.exec('BEGIN');try{for(const statement of statements)sql.prepare(statement.q).run(...norm(statement.args));sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}}};
  const wrap=db.prepare;
  db.prepare=query=>{const statement=wrap(query);statement.q=query;const bind=statement.bind.bind(statement);statement.bind=(...args)=>{const bound=bind(...args);bound.q=query;bound.args=args;return bound;};return statement;};
  return {sql,db,seen};
}

test('chain rounds stay unwritten unless RESEARCH_CHAIN_ROUNDS_ENABLED is exactly 1',async()=>{
  const source=readFileSync(new URL('./intelligence-research-materializer.mjs',import.meta.url),'utf8');
  const hooks=readFileSync(new URL('./intelligence-worker-hooks.mjs',import.meta.url),'utf8');
  assert.match(source,/if\(env\.RESEARCH_CHAIN_ROUNDS_ENABLED==='1'\)\{try\{result\.chain=await materializeChainRounds\(db,env,now\);\}/);
  assert.equal((source.match(/await materializeChainRounds\(/g)||[]).length,1);
  assert.match(hooks,/materializeResearchIndex\(env\)/);
  assert.equal(hooks.includes('RESEARCH_CHAIN_ROUNDS_ENABLED'),false);
  for(const name of ['wrangler.toml','wrangler.production.toml','wrangler.production.example.toml','wrangler.z500-preview.toml'])assert.equal(readFileSync(new URL(`./${name}`,import.meta.url),'utf8').includes('RESEARCH_CHAIN_ROUNDS_ENABLED'),false);
  const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const CRCLx='XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1';
  const TOKEN='TestTokenMint1111111111111111111111111111';
  const FOMO='FomoChainWallet11111111111111111111111111';
  const AFTER='AfterbellChainWallet1111111111111111111111';
  const now=1790000000000;
  const chainSql=query=>query.includes('research_index_chain_cursor')||query.includes('solana_wallet wallet FROM fomo_traders')||query.includes('helius-afterbell-%');
  const chainObjects=sql=>sql.prepare(`SELECT COUNT(*) AS c FROM research_index_objects WHERE id LIKE 'planet:fomo:%' OR id LIKE 'planet:afterbell:%' OR id LIKE 'matched:%' OR id LIKE 'trade:observed:%' OR id LIKE 'replay:round:%' OR id LIKE 'star:solana:%'`).get().c;
  const seed=sql=>{
    sql.prepare(`INSERT INTO fomo_traders(handle,current_rank,solana_wallet,captured_at,updated_at) VALUES('chainflag',1,?,1700000000,1700000000)`).run(FOMO);
    const event=sql.prepare(`INSERT INTO bull_wallet_events(signature,block_time,wallet,mint,event_class,sol_delta,token_delta,source) VALUES(?,?,?,?,'swap',?,?,?)`);
    event.run('sig-buy',1700000200,FOMO,TOKEN,-1,10,'helius-fomo');
    event.run('sig-sell',1700000300,FOMO,TOKEN,1.4,-10,'helius-fomo');
    event.run('sig-usdc',1700000400,FOMO,USDC,0,-250,'helius-fomo');
    event.run('sig-crclx',1700000500,AFTER,CRCLx,0,-3,'helius-afterbell-pool-window');
    sql.prepare(`INSERT INTO intelligence_trade_routes(signature,wallet,hop_index,input_mint,output_mint,input_amount,output_amount,block_time,source,confidence) VALUES(?,?,0,?,?,?,?,?,?,1)`).run('sig-usdc',FOMO,USDC,TOKEN,250,10,1700000400,'helius-fomo');
  };
  const run=async flag=>{
    const {sql,db,seen}=researchMaterializerDb();
    seed(sql);
    const env={INTELLIGENCE_DB:db};
    if(flag!==undefined)env.RESEARCH_CHAIN_ROUNDS_ENABLED=flag;
    const before=seen.length;
    const result=await materializeResearchIndex(env,now);
    return {sql,result,chainQueries:seen.slice(before).filter(chainSql)};
  };
  for(const flag of [undefined,'','0','true']){
    const off=await run(flag);
    assert.equal(off.result.ok,true);
    assert.deepEqual(off.result.chain,{wallets:0,rounds:0});
    assert.equal(off.result.fomo.stars,1);
    assert.equal(off.chainQueries.length,0);
    assert.equal(off.sql.prepare(`SELECT COUNT(*) AS c FROM matched_trade_rounds`).get().c,0);
    assert.equal(off.sql.prepare(`SELECT COUNT(*) AS c FROM research_graph_edges`).get().c,0);
    assert.equal(off.sql.prepare(`SELECT COUNT(*) AS c FROM index_coverage_checkpoints WHERE source='research_index_chain_cursor'`).get().c,0);
    assert.equal(chainObjects(off.sql),0);
    off.sql.close();
  }
  const on=await run('1');
  assert.equal(on.result.ok,true);
  assert.equal(on.result.chain.wallets,2);
  assert.equal(on.result.chain.rounds,1);
  assert.ok(on.chainQueries.length>0);
  const rounds=on.sql.prepare(`SELECT wallet,mint,status,buy_sol,sell_sol,matched_realized_sol FROM matched_trade_rounds ORDER BY wallet,mint,status`).all();
  assert.equal(rounds.length,1);
  const closed=rounds.find(row=>row.wallet===FOMO&&row.mint===TOKEN&&row.status==='closed');
  assert.ok(closed);near(closed.buy_sol,1);near(closed.sell_sol,1.4);near(closed.matched_realized_sol,.4);
  assert.equal(rounds.some(row=>row.mint===USDC||row.mint===CRCLx),false);
  assert.equal(on.sql.prepare(`SELECT COUNT(*) AS c FROM index_coverage_checkpoints WHERE source='research_index_chain_cursor'`).get().c,1);
  assert.ok(chainObjects(on.sql)>0);
  assert.ok(on.sql.prepare(`SELECT COUNT(*) AS c FROM research_graph_edges`).get().c>0);
  on.sql.close();
});
