import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRobinhoodLighterMarkets,normalizeRobinhoodStockAssets,normalizeRobinhoodUnderlyingPrice,__robinhoodReferenceContract } from './intelligence-robinhood-reference.mjs';

const TOKEN='0x1111111111111111111111111111111111111111';

test('Robinhood stock-token metadata selects the chain-4663 deployment and multiplier',()=>{
  const rows=normalizeRobinhoodStockAssets({assets:[{id:'asset-1',tokenSymbol:'SPY',tokenName:'SPY Stock Token',currentMultiplier:'1.05',deployments:[{contractAddress:'0x2222222222222222222222222222222222222222',chainId:1},{contractAddress:TOKEN,chainId:4663}]}]});
  assert.equal(rows.length,1);assert.equal(rows[0].tokenAddress,TOKEN);assert.equal(rows[0].symbol,'SPY');assert.equal(rows[0].multiplier,1.05);
});

test('Robinhood underlying quote remains raw reference data',()=>{
  const row=normalizeRobinhoodUnderlyingPrice({quotes:[{tokenSymbol:'SPY',bid:'700',ask:'702',currency:'USD',generatedAt:'2026-09-22T00:00:00Z'}]},'SPY');
  assert.equal(row.mid,701);assert.equal(row.currency,'USD');
});

test('Robinhood Lighter metadata keeps derivative market values separate from token execution',()=>{
  const rows=normalizeRobinhoodLighterMarkets({order_book_details:[{symbol:'SPY',market_id:17,market_type:'perp',status:'active',mark_price:'701.2',index_price:'701.1',last_trade_price:'701.3',daily_quote_token_volume:'5000000'}]});
  assert.equal(rows[0].marketId,17);assert.equal(rows[0].marketType,'perp');assert.equal(rows[0].markPrice,701.2);
});

test('Robinhood reference contract is explicitly non-execution',()=>{
  assert.equal(__robinhoodReferenceContract.referenceOnly,true);assert.equal(__robinhoodReferenceContract.neverExecutionPrice,true);
});
