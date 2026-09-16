import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('production Worker owns the single intelligence database and read-only entry', async()=>{
  const [entry,config]=await Promise.all([
    readFile(new URL('./worker-vnext-entry.mjs',import.meta.url),'utf8'),
    readFile(new URL('./wrangler.production.toml',import.meta.url),'utf8')
  ]);
  assert.match(entry,/living-universe-read-only/);
  assert.match(config,/binding = "INTELLIGENCE_DB"/);
  assert.equal((config.match(/\[\[d1_databases\]\]/g)||[]).length,1);
});

test('provider reservation happens before Helius history requests',async()=>{
  const source=await readFile(new URL('./intelligence-history-engine.mjs',import.meta.url),'utf8');

  const archivalStart=source.indexOf('async function backfillHeliusWindowPass');
  const archivalEnd=source.indexOf('\nexport async function backfillHistoryPass',archivalStart);
  const archival=source.slice(archivalStart,archivalEnd);
  const archivalReservation=archival.indexOf('await reserveProviderCredits');
  const archivalRequest=archival.indexOf("await historyRpcRequest(source,'getTransactionsForAddress'");
  assert.ok(archivalStart>=0&&archivalEnd>archivalStart,'bounded Helius archival path exists');
  assert.ok(archivalReservation>=0,'bounded Helius archival path reserves provider credits');
  assert.ok(archivalRequest>=0,'bounded Helius archival request exists');
  assert.ok(archivalReservation<archivalRequest,'provider credits are reserved before the bounded Helius archival RPC');

  const standardStart=source.indexOf("if(source.name==='helius-standard-rpc')");
  const standard=source.slice(standardStart);
  const standardReservation=standard.indexOf('await reserveProviderCredits');
  const standardRequest=standard.indexOf("await historyRpcRequest(source,'getSignaturesForAddress'");
  assert.ok(standardStart>=0,'standard Helius history path exists');
  assert.ok(standardReservation>=0,'standard Helius history path reserves provider credits');
  assert.ok(standardRequest>=0,'standard Helius history request exists');
  assert.ok(standardReservation<standardRequest,'provider credits are reserved before the standard Helius history RPC');

  assert.match(source,/provider_budget_blocked/);
});

test('pump ingestion writes the shared replay, evidence, route, and candle spine',async()=>{
  const source=await readFile(new URL('./intelligence-pump-top10.mjs',import.meta.url),'utf8');
  for(const table of ['bull_wallet_events','intelligence_event_provenance','intelligence_trade_routes','intelligence_price_candles']) assert.match(source,new RegExp(table));
});
