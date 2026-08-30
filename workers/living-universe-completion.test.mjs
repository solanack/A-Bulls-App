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
  const reservation=source.indexOf('const reservation=await reserveProviderCredits');
  const request=source.indexOf("const sigResult=await rpc(source,'getSignaturesForAddress'");
  assert.ok(reservation>=0,'shared provider reservation is imported');
  assert.ok(request>=0,'history request exists');
  assert.ok(reservation<request,'provider credits are reserved before the first history RPC');
  assert.match(source,/provider_budget_blocked/);
  assert.match(source,/await reserveProviderCredits/);
});

test('pump ingestion writes the shared replay, evidence, route, and candle spine',async()=>{
  const source=await readFile(new URL('./intelligence-pump-top10.mjs',import.meta.url),'utf8');
  for(const table of ['bull_wallet_events','intelligence_event_provenance','intelligence_trade_routes','intelligence_price_candles']) assert.match(source,new RegExp(table));
});
