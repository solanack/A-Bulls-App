import test from 'node:test';
import assert from 'node:assert/strict';
import {
  __fieldV0Contract,
  deriveDyingEvent,
  handleFieldV0Request,
  holderExitFromEvidence,
  remainingPctFromNet,
  tradeFromPumpRow,
  tradeFromWalletEvent
} from './intelligence-field-v0.mjs';

const mint='7'.repeat(44);
const wallet='8'.repeat(44);
const signature='5'.repeat(88);

function mockDb(handlers={}){
  return{
    prepare(sql){
      const run=handlers.prepare?.(sql)||{results:[]};
      return{
        bind(...args){
          const resolved=typeof run==='function'?run(args,sql):run;
          return{
            async all(){return resolved;},
            async first(){return resolved?.results?.[0]??resolved?.first??null;},
            async run(){return{meta:{changes:1}};}
          };
        }
      };
    }
  };
}

test('contract documents honest empties and never-invent rules',()=>{
  assert.equal(__fieldV0Contract.version,'field-v0');
  assert.equal(__fieldV0Contract.usesExistingIntelligenceDb,true);
  assert.equal(__fieldV0Contract.skipHolderExitWhenRemainingUnknown,true);
  assert.equal(__fieldV0Contract.membershipExitIsNotHolderExit,true);
  assert.deepEqual(__fieldV0Contract.neverInvent,['liqSol','remainingPct']);
});

test('maps pump_trades rows into token.trade envelopes',()=>{
  const event=tradeFromPumpRow({
    signature,mint,wallet,side:'buy',token_amount:1000,sol_amount:2.5,price_sol:0.0025,slot:42,block_time:1_700_000_000,source:'helius-pump'
  });
  assert.equal(event.type,'token.trade');
  assert.equal(event.v,1);
  assert.equal(event.chain,'solana');
  assert.equal(event.source,'pumpfun');
  assert.equal(event.side,'buy');
  assert.equal(event.wallet,wallet);
  assert.equal(event.solAmount,2.5);
  assert.equal(event.tokenAmount,1000);
  assert.equal(event.priceSol,0.0025);
  assert.equal(event.slot,42);
  assert.equal(event.ts,1_700_000_000_000);
  assert.equal(event.sig,signature);
});

test('fallback wallet swap-like events become trades without inventing side ambiguity',()=>{
  const buy=tradeFromWalletEvent({signature,mint,wallet,token_delta:100,sol_delta:-1.5,slot:9,block_time:1_700_000_100,source:'helius'});
  assert.equal(buy.side,'buy');
  assert.equal(buy.source,'helius');
  assert.equal(buy.tokenAmount,100);
  assert.equal(buy.solAmount,1.5);
  const sell=tradeFromWalletEvent({signature,mint,wallet,token_delta:-50,sol_delta:0.8,slot:10,block_time:1_700_000_200,source:'rpc'});
  assert.equal(sell.side,'sell');
  assert.equal(sell.source,'pumpfun');
});

test('remainingPct requires evidence-backed position-before; never invents',()=>{
  assert.equal(remainingPctFromNet(0,100),0);
  assert.equal(remainingPctFromNet(25,75),0.25);
  assert.equal(remainingPctFromNet(null,10),null);
  assert.equal(remainingPctFromNet(-5,1),null);
  assert.equal(remainingPctFromNet(10,0),null);
  const exit=holderExitFromEvidence({mint,wallet,sig:signature,ts:1_700_000_000_000,source:'derived',soldAmount:75,solReceived:1.2,netAfter:25});
  assert.equal(exit.type,'holder.exit');
  assert.equal(exit.remainingPct,0.25);
  assert.equal(exit.isFullExit,false);
  assert.equal(holderExitFromEvidence({mint,wallet,soldAmount:10,solReceived:1,netAfter:null}),null);
});

test('dying derivation uses collapse/sell/outbound and omits liqSol',()=>{
  const dying=deriveDyingEvent({
    mint,
    recentVol:0.01,
    priorVol:2,
    buyCount:1,
    sellCount:9,
    tradeCount:10,
    outboundWallets:8,
    inboundWallets:2,
    uniqueWallets:12,
    ts:1_700_000_000_000
  });
  assert.equal(dying.type,'token.dying');
  assert.equal(dying.source,'derived');
  assert.ok(dying.reason.includes('activity_collapse'));
  assert.ok(dying.reason.includes('holder_decay'));
  assert.ok(dying.score>0&&dying.score<=1);
  assert.equal(dying.incomplete,true);
  assert.equal(dying.metrics.uniqueTraders24h,12);
  assert.equal(Object.hasOwn(dying.metrics,'liqSol'),false);
  assert.equal(dying.reason.includes('liquidity_drain'),false);

  const quiet=deriveDyingEvent({mint,recentVol:5,priorVol:5,buyCount:5,sellCount:5,tradeCount:10,outboundWallets:1,inboundWallets:1,ts:1});
  assert.equal(quiet,null);
});

test('field v0 routes stay disabled without flags',async()=>{
  const response=await handleFieldV0Request(new Request('https://example.test/api/intelligence/field/v0/events'),{});
  assert.equal(response.status,404);
  assert.equal((await response.json()).error,'feature_disabled');
});

test('events endpoint returns trades and skips exits without remainingPct',async()=>{
  const env={
    FIELD_V0_ENABLED:'true',
    INTELLIGENCE_DB:mockDb({
      prepare(sql){
        if(sql.includes('FROM pump_trades')&&sql.includes(`side IN ('buy','sell')`)){
          return{results:[{
            event_id:`${signature}:0`,signature,mint,wallet,side:'buy',token_amount:1000,sol_amount:2,price_sol:0.002,slot:11,block_time:1_700_000_000,source:'pump-stream'
          }]};
        }
        if(sql.includes('FROM pump_volume_buckets')){
          return{results:[{mint,recent_vol:0.01,prior_vol:3,buy_count:1,sell_count:8,trade_count:9}]};
        }
        if(sql.includes('FROM bull_token_cohorts')){
          return{results:[{mint,unique_wallets:4,inbound_wallets:1,outbound_wallets:6}]};
        }
        if(sql.includes(`side='sell'`)&&sql.includes('FROM pump_trades')){
          // sell present but no position history → should skip holder.exit
          return{results:[{signature:`${signature}x`,mint,wallet,token_amount:50,sol_amount:0.4,block_time:1_700_000_050,source:'pump-stream'}]};
        }
        if(sql.includes('SUM(token_delta)')||sql.includes('COUNT(*) cnt'))return{results:[],first:null};
        if(sql.includes('FROM pump_trades WHERE wallet=? AND mint=?'))return{results:[]};
        return{results:[]};
      }
    })
  };
  const response=await handleFieldV0Request(new Request('https://example.test/api/intelligence/field/v0/events?types=token.trade,token.dying,holder.exit&limit=20'),env);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.ok,true);
  assert.equal(body.contractVersion,'field-v0');
  assert.ok(body.events.some(item=>item.type==='token.trade'));
  assert.ok(body.events.some(item=>item.type==='token.dying'&&item.incomplete===true));
  assert.ok(!body.events.some(item=>item.type==='holder.exit'));
  assert.equal(body.coverage.complete,false);
  assert.match(body.disclosure,/never invented/i);
  assert.ok(body.notes.holderExit.includes('NOT used'));
});

test('holder.exit emits only when net position evidence yields remainingPct',async()=>{
  const env={
    FIELD_COMPAT_ENABLED:'true',
    INTELLIGENCE_DB:mockDb({
      prepare(sql){
        if(sql.includes('FROM pump_trades')&&sql.includes(`side IN ('buy','sell')`))return{results:[]};
        if(sql.includes('FROM bull_wallet_events')&&sql.includes(`event_class='swap-like'`))return{results:[]};
        if(sql.includes('FROM pump_volume_buckets'))return{results:[]};
        if(sql.includes('FROM bull_token_cohorts'))return{results:[]};
        if(sql.includes(`side='sell'`)&&sql.includes('FROM pump_trades')){
          return{results:[{signature,mint,wallet,token_amount:75,sol_amount:1.1,block_time:1_700_000_000,source:'pump-stream'}]};
        }
        if(sql.includes('SUM(token_delta)')||sql.includes('COUNT(*) cnt'))return{first:{cnt:3,net:25}};
        return{results:[]};
      }
    })
  };
  const response=await handleFieldV0Request(new Request('https://example.test/api/intelligence/field/v0/events?types=holder.exit'),env);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.events.length,1);
  assert.equal(body.events[0].type,'holder.exit');
  assert.equal(body.events[0].remainingPct,0.25);
  assert.equal(body.events[0].isFullExit,false);
  assert.equal(Object.hasOwn(body.events[0],'incomplete'),false);
});

test('tokens and wallets endpoints return star/planet shapes',async()=>{
  const env={
    UNIVERSE_ENABLED:'true',
    INTELLIGENCE_DB:mockDb({
      prepare(sql){
        if(sql.includes('FROM pump_volume_buckets')&&sql.includes('recent_vol')){
          return{results:[{mint,recent_vol:0.02,prior_vol:4,buy_count:0,sell_count:6,trade_count:6}]};
        }
        if(sql.includes('FROM bull_token_cohorts')){
          return{results:[{mint,unique_wallets:3,inbound_wallets:0,outbound_wallets:5}]};
        }
        if(sql.includes('FROM pump_tokens')){
          return{results:[{mint,symbol:'TST',name:'Test',rank_24h:1,volume_24h:4.02,last_side:'sell',last_price:0.01,last_time:1_700_000_000}]};
        }
        if(sql.includes('UNION ALL')){
          return{results:[{mint,last_seen:1_700_000_000}]};
        }
        if(sql.includes('SUM(sol_delta)'))return{first:{net:-1.5}};
        if(sql.includes(`side='sell'`)&&sql.includes('FROM pump_trades'))return{results:[]};
        return{results:[]};
      }
    })
  };
  const tokens=await handleFieldV0Request(new Request('https://example.test/api/intelligence/field/v0/tokens?limit=10'),env);
  assert.equal(tokens.status,200);
  const tokenBody=await tokens.json();
  assert.equal(tokenBody.stars[0].mint,mint);
  assert.equal(tokenBody.stars[0].state,'dying');
  assert.equal(tokenBody.stars[0].incomplete,true);
  assert.equal(Object.hasOwn(tokenBody.stars[0].visualDrivers||{},'liqSol'),false);

  const wallets=await handleFieldV0Request(new Request(`https://example.test/api/intelligence/field/v0/wallets/${wallet}`),env);
  assert.equal(wallets.status,200);
  const planetBody=await wallets.json();
  assert.equal(planetBody.planet.wallet,wallet);
  assert.deepEqual(planetBody.planet.linkedMints,[mint]);
  assert.equal(planetBody.planet.netSolDelta24h,-1.5);
});

test('non-v0 field paths are ignored so compat can handle them',async()=>{
  const response=await handleFieldV0Request(new Request('https://example.test/api/intelligence/field/snapshot'),{FIELD_V0_ENABLED:'true'});
  assert.equal(response,null);
});
