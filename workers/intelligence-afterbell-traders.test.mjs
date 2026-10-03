import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { AFTERBELL_BASIS_LOOKBACK_SECONDS, AFTERBELL_FEE_SIZED_SOL, AFTERBELL_WSOL_MINT, afterbellObservedPriceSol, afterbellWindow, normalizeAfterbellEvents, rankAfterbellTraders, readAfterbellTraders } from './intelligence-afterbell-traders.mjs';

const A='11111111111111111111111111111111';
const B='22222222222222222222222222222222';
const C='33333333333333333333333333333333';
const D='44444444444444444444444444444444';
const E='55555555555555555555555555555555';
const F='66666666666666666666666666666666';

test('Afterbell keeps pre-window basis hydration bounded for interactive galaxy reads',()=>{
  assert.equal(AFTERBELL_BASIS_LOOKBACK_SECONDS,90*24*60*60);
});

test('Afterbell uses the most recent 4 PM to 9:30 AM New York weekday window',()=>{
  const mondayNoon=Date.parse('2026-09-21T16:00:00Z'); // 12:00 ET
  const window=afterbellWindow(mondayNoon);
  assert.equal(window.from,Math.floor(Date.parse('2026-09-18T20:00:00Z')/1000));
  assert.equal(window.to,Math.floor(Date.parse('2026-09-21T13:30:00Z')/1000));
  assert.equal(window.live,false);
  assert.equal(window.timezone,'America/New_York');
});

test('Afterbell live window begins at 4 PM ET and ends at now until next open',()=>{
  const mondayFive=Date.parse('2026-09-21T21:00:00Z'); // 17:00 ET
  const window=afterbellWindow(mondayFive);
  assert.equal(window.from,Math.floor(Date.parse('2026-09-21T20:00:00Z')/1000));
  assert.equal(window.to,Math.floor(mondayFive/1000));
  assert.equal(window.live,true);
});

test('Afterbell ranks unique transactions and computes only defensible FIFO PnL',()=>{
  const from=200,to=400;
  const rows=[
    {wallet:A,mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',txId:'prebuy',side:'buy',amount:10,priceUsd:5,blockTime:100,source:'observed',sourceKind:'observed-fact'},
    {wallet:A,mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',txId:'sell-a',side:'sell',amount:4,priceUsd:7,blockTime:220,source:'observed',sourceKind:'observed-fact'},
    {wallet:B,mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',txId:'buy-b',side:'buy',amount:3,priceUsd:null,blockTime:210,source:'provider',sourceKind:'provider-reported'},
    {wallet:B,mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',txId:'sell-b',side:'sell',amount:2,priceUsd:9,blockTime:230,source:'provider',sourceKind:'provider-reported'},
    {wallet:B,mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',txId:'sell-b',side:'sell',amount:2,priceUsd:9,blockTime:230,source:'observed-copy',sourceKind:'observed-fact'},
  ];
  const ranked=rankAfterbellTraders(rows,{from,to,limit:50});
  assert.equal(ranked[0].wallet,B);
  assert.equal(ranked[0].transactionCount,2);
  assert.equal(ranked[0].uniqueAfterCloseTxCount,2);
  assert.equal(ranked[0].realizedPnlUsd,null);
  assert.equal(ranked[0].assetCount,1);
  assert.equal(ranked[0].latestTrades.length,2);
  assert.equal(ranked[0].mostTraded[0].uniqueAfterCloseTxCount,2);
  assert.equal(ranked[0].topTraded[0].mint,ranked[0].mostTraded[0].mint);
  assert.equal(ranked[1].wallet,A);
  assert.equal(ranked[1].transactionCount,1);
  assert.equal(ranked[1].realizedPnlUsd,8);
  assert.equal(ranked[1].pnlDisplayUnit,'usd');
  assert.equal(ranked[1].pnlMatchedRounds,1);
  assert.equal(ranked[1].pnlRoundCount,1);
  assert.equal(ranked[1].pnlSource,'realized-fifo');
  assert.equal(ranked[0].pnlMatchedRounds,0);
  assert.equal(ranked[0].pnlRoundCount,1);
  assert.equal(ranked[0].realizedPnlSol,null);
});

test('Afterbell keeps a priced mint when another mint in the wallet has no basis',()=>{
  const priced='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh';
  const missing='XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB';
  const rows=[
    {wallet:A,mint:priced,txId:'basis-buy',side:'buy',amount:10,priceUsd:1,priceSol:0.1,blockTime:100,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint:priced,txId:'basis-sell',side:'sell',amount:10,priceUsd:2,priceSol:0.2,blockTime:220,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint:missing,txId:'unpriced-sell',side:'sell',amount:4,priceUsd:null,priceSol:null,blockTime:230,source:'chain',sourceKind:'observed-fact'},
  ];
  const [ranked]=rankAfterbellTraders(rows,{from:200,to:400,limit:50});
  assert.equal(ranked.realizedPnlUsd,10);
  assert.ok(Math.abs(ranked.realizedPnlSol-1)<1e-9);
  assert.equal(ranked.assetCount,2);
  assert.equal(ranked.pnlDisplayUnit,'usd');
  assert.equal(ranked.pnlMatchedRounds,1);
  assert.equal(ranked.pnlRoundCount,2);
  assert.equal(ranked.pnlSource,'realized-fifo');
});

test('Afterbell consumes already-sold pre-window inventory before in-window FIFO PnL',()=>{
  const mint='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh';
  const rows=[
    {wallet:A,mint,txId:'old-buy',side:'buy',amount:10,priceUsd:1,blockTime:100,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint,txId:'old-sell',side:'sell',amount:10,priceUsd:2,blockTime:150,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint,txId:'new-buy',side:'buy',amount:10,priceUsd:3,blockTime:180,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint,txId:'window-sell',side:'sell',amount:10,priceUsd:4,blockTime:220,source:'chain',sourceKind:'observed-fact'},
  ];
  const [ranked]=rankAfterbellTraders(rows,{from:200,to:400,limit:50});
  assert.equal(ranked.realizedPnlUsd,10);
});

test('Afterbell dedupes duplicate transaction evidence without losing observed provenance',()=>{
  const rows=normalizeAfterbellEvents([
    {wallet:A,mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',txId:'same',side:'buy',amount:1,priceUsd:2,blockTime:300,source:'provider',sourceKind:'provider-reported'},
    {wallet:A,mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',txId:'same',side:'buy',amount:1,priceUsd:2,blockTime:300,source:'chain',sourceKind:'observed-fact'},
  ]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].sourceKind,'observed-fact');
});


test('Afterbell cross-stock ranking aggregates a trader across tokenized equities without double-counting tx ids',()=>{
  const rows=[
    {wallet:A,mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',txId:'tx-1',side:'buy',amount:1,priceUsd:10,blockTime:210,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',txId:'tx-2',side:'buy',amount:2,priceUsd:20,blockTime:220,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',txId:'tx-2',side:'buy',amount:2,priceUsd:20,blockTime:220,source:'provider',sourceKind:'provider-reported'},
  ];
  const ranked=rankAfterbellTraders(rows,{from:200,to:400,limit:50});
  assert.equal(ranked[0].wallet,A);
  assert.equal(ranked[0].transactionCount,2);
  assert.equal(ranked[0].assetCount,2);
  assert.deepEqual(new Set(ranked[0].mints),new Set(['Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh','XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB']));
});


test('Afterbell rank ignores PnL, asset breadth, and recency when unique transaction counts tie',()=>{
  const mintA='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',mintB='XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB';
  const rows=[
    {wallet:A,mint:mintA,txId:'a-1',side:'buy',amount:10,priceUsd:1,blockTime:210,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint:mintA,txId:'a-2',side:'sell',amount:10,priceUsd:100,blockTime:220,source:'chain',sourceKind:'observed-fact'},
    {wallet:B,mint:mintA,txId:'b-1',side:'buy',amount:1,priceUsd:null,blockTime:390,source:'chain',sourceKind:'observed-fact'},
    {wallet:B,mint:mintB,txId:'b-2',side:'buy',amount:1,priceUsd:null,blockTime:395,source:'chain',sourceKind:'observed-fact'},
  ];
  const ranked=rankAfterbellTraders(rows,{from:200,to:400,limit:50});
  assert.equal(ranked[0].uniqueAfterCloseTxCount,2);
  assert.equal(ranked[1].uniqueAfterCloseTxCount,2);
  assert.deepEqual(ranked.map(row=>row.wallet),[A,B].sort(),'ties must be deterministic by wallet only, not PnL, asset count, or recency');
});

test('Afterbell trader activity exposes bounded holdings, most-traded assets, and at most three latest trades',()=>{
  const mint='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh';
  const rows=[
    {wallet:A,mint,txId:'pre',side:'buy',amount:10,priceUsd:1,blockTime:150,source:'chain',sourceKind:'observed-fact'},
    ...[210,220,230,240].map((blockTime,index)=>({wallet:A,mint,txId:`t-${index}`,side:index===3?'sell':'buy',amount:1,priceUsd:2+index,blockTime,source:'chain',sourceKind:'observed-fact'})),
  ];
  const [ranked]=rankAfterbellTraders(rows,{from:200,to:400,limit:50});
  assert.equal(ranked.latestTrades.length,3);
  assert.equal(ranked.mostTraded[0].uniqueAfterCloseTxCount,4);
  assert.equal(ranked.holdings[0].mint,mint);
  assert.ok(ranked.holdings[0].observedNetAmount>0);
  assert.deepEqual(ranked.topHeld,ranked.holdings);
});

const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT='Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const STOCK='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh';
const FEE_SOL=53600/1e9;

test('Afterbell priceSol ignores a fee-sized SOL delta on a non-SOL quote',()=>{
  assert.equal(AFTERBELL_FEE_SIZED_SOL,0.001);
  assert.equal(afterbellObservedPriceSol({tokenDelta:1,solDelta:-FEE_SOL,feeLamports:53600,quoteMint:USDC}),null);
  assert.equal(afterbellObservedPriceSol({tokenDelta:2,solDelta:5.36e-5,feeLamports:0,quoteMint:USDT}),null);
  assert.equal(afterbellObservedPriceSol({tokenDelta:1,solDelta:-0.000999,feeLamports:5000,quoteMint:'Es9vMFrzaCERmJfrF4H2FYDqfCMx1j8dYKVKJQmuayNX'}),null);
  assert.equal(afterbellObservedPriceSol({tokenDelta:10,solDelta:-1.2,feeLamports:5000,quoteMint:USDC}),0.12);
  assert.equal(afterbellObservedPriceSol({tokenDelta:10,solDelta:-0.001,feeLamports:5000,quoteMint:USDC}),0.0001);
  assert.equal(afterbellObservedPriceSol({tokenDelta:4,solDelta:0.8,feeLamports:5000,quoteMint:AFTERBELL_WSOL_MINT}),0.2);
  assert.equal(afterbellObservedPriceSol({tokenDelta:1,solDelta:-FEE_SOL,feeLamports:53600,quoteMint:AFTERBELL_WSOL_MINT}),null);
  assert.equal(afterbellObservedPriceSol({tokenDelta:1,solDelta:-FEE_SOL,feeLamports:53600,quoteMint:''}),null);
  assert.equal(afterbellObservedPriceSol({tokenDelta:2,solDelta:-0.00004,feeLamports:0,quoteMint:''}),0.00002);
  assert.equal(afterbellObservedPriceSol({tokenDelta:2,solDelta:-0.00004,feeLamports:5000,quoteMint:''}),0.00002);
  const ranked=rankAfterbellTraders([
    {wallet:A,mint:STOCK,txId:'fee-buy',side:'buy',amount:1,priceSol:null,blockTime:210,source:'helius',sourceKind:'observed-fact'},
    {wallet:A,mint:STOCK,txId:'fee-sell',side:'sell',amount:1,priceSol:null,blockTime:220,source:'helius',sourceKind:'observed-fact'},
  ],{from:200,to:400});
  assert.equal(ranked[0].realizedPnlSol,null);
  assert.equal(ranked[0].latestTrades.every(trade=>trade.priceSol==null),true);
});

test('Afterbell retained reads do not price a USDC swap from the fee SOL delta',async()=>{
  const sql=new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE bull_wallet_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signature TEXT NOT NULL,
    block_time INTEGER,
    wallet TEXT NOT NULL,
    mint TEXT NOT NULL DEFAULT '',
    event_class TEXT NOT NULL,
    sol_delta REAL NOT NULL DEFAULT 0,
    token_delta REAL NOT NULL DEFAULT 0,
    fee_lamports INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL
  );
  CREATE TABLE intelligence_trade_routes (
    signature TEXT NOT NULL,
    wallet TEXT NOT NULL,
    hop_index INTEGER NOT NULL,
    input_mint TEXT,
    output_mint TEXT,
    input_amount REAL,
    output_amount REAL,
    block_time INTEGER,
    source TEXT,
    confidence REAL NOT NULL DEFAULT 0,
    PRIMARY KEY(signature, wallet, hop_index)
  );`);
  const insert=sql.prepare(`INSERT INTO bull_wallet_events(signature,block_time,wallet,mint,event_class,sol_delta,token_delta,fee_lamports,source) VALUES(?,?,?,?,?,?,?,?,?)`);
  const fee=(signature,wallet,sideSign,token,time)=>insert.run(signature,time,wallet,STOCK,'swap-like',-FEE_SOL*Math.sign(sideSign),sideSign*token,53600,'helius-history');
  fee('sig-usdc',A,1,1,1500);
  insert.run('sig-usdc',1500,A,USDC,'swap-like',-FEE_SOL,-25,53600,'helius-history');
  fee('sig-usdc-sell',A,-1,1,1600);
  insert.run('sig-usdc-sell',1600,A,USDC,'swap-like',-FEE_SOL,25,53600,'helius-history');
  insert.run('sig-wsol',1700,B,STOCK,'swap-like',-1.5,10,5000,'helius-history');
  insert.run('sig-wsol',1700,B,AFTERBELL_WSOL_MINT,'swap-like',-1.5,-1.5,5000,'helius-history');
  insert.run('sig-wsol-sell',1800,B,STOCK,'swap-like',0.8,-4,5000,'helius-history');
  insert.run('sig-wsol-sell',1800,B,AFTERBELL_WSOL_MINT,'swap-like',0.8,0.8,5000,'helius-history');
  insert.run('sig-sized',1900,C,STOCK,'swap-like',-1.2,10,5000,'helius-history');
  insert.run('sig-sized',1900,C,USDC,'swap-like',-1.2,-40,5000,'helius-history');
  insert.run('sig-fee-only',2000,D,STOCK,'swap-like',-FEE_SOL,1,53600,'helius-history');
  insert.run('sig-micro',2100,E,STOCK,'swap-like',-0.00004,2,0,'helius-history');
  insert.run('sig-route',2200,F,STOCK,'swap-like',-FEE_SOL,3,53600,'helius-history');
  sql.prepare(`INSERT INTO intelligence_trade_routes(signature,wallet,hop_index,input_mint,output_mint,input_amount,output_amount,block_time,source,confidence) VALUES(?,?,0,?,?,?,?,?,?,1)`).run('sig-route',F,USDC,STOCK,30,3,2200,'helius-afterbell-pool-window-receipt');
  const norm=values=>values.map(value=>value===undefined?null:value);
  const db={prepare(query){const statement=(args=[])=>({bind(...bound){return statement(bound);},async all(){return {results:sql.prepare(query).all(...norm(args))};},async first(){return (await this.all()).results[0]??null;},async run(){return {meta:{changes:Number(sql.prepare(query).run(...norm(args)).changes)}};} });return statement();}};
  const body=await readAfterbellTraders({INTELLIGENCE_DB:db},STOCK,{from:1000,to:5000});
  const byWallet=new Map(body.items.map(item=>[item.wallet,item]));
  const prices=wallet=>byWallet.get(wallet).latestTrades.map(trade=>trade.priceSol);
  assert.deepEqual(prices(A),[null,null]);
  assert.equal(byWallet.get(A).realizedPnlSol,null);
  assert.ok(Math.abs(byWallet.get(B).realizedPnlSol-0.2)<1e-9);
  assert.ok(prices(B).every(price=>price>0.1));
  assert.deepEqual(prices(C),[0.12]);
  assert.deepEqual(prices(D),[null]);
  assert.equal(prices(E)[0],0.00002);
  assert.deepEqual(prices(F),[null]);
  sql.close();
});

test('Afterbell price guard still sees a stable sibling when route storage is absent',async()=>{
  const sql=new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE bull_wallet_events (
    signature TEXT NOT NULL, block_time INTEGER, wallet TEXT NOT NULL, mint TEXT NOT NULL,
    event_class TEXT NOT NULL, sol_delta REAL NOT NULL, token_delta REAL NOT NULL,
    fee_lamports INTEGER NOT NULL, source TEXT NOT NULL
  );`);
  const insert=sql.prepare(`INSERT INTO bull_wallet_events(signature,block_time,wallet,mint,event_class,sol_delta,token_delta,fee_lamports,source) VALUES(?,?,?,?,?,?,?,?,?)`);
  insert.run('sig-usdt',1500,A,STOCK,'swap-like',-FEE_SOL,1,53600,'helius-history');
  insert.run('sig-usdt',1500,A,USDT,'swap-like',-FEE_SOL,-10,53600,'helius-history');
  const norm=values=>values.map(value=>value===undefined?null:value);
  const db={prepare(query){const statement=(args=[])=>({bind(...bound){return statement(bound);},async all(){return {results:sql.prepare(query).all(...norm(args))};},async first(){return (await this.all()).results[0]??null;}});return statement();}};
  const body=await readAfterbellTraders({INTELLIGENCE_DB:db},STOCK,{from:1000,to:5000});
  assert.equal(body.items[0].latestTrades[0].priceSol,null);
  assert.equal(body.items[0].realizedPnlSol,null);
  sql.close();
});
