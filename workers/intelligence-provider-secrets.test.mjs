import assert from 'node:assert/strict';
import test from 'node:test';
import { handleProviderSecretDiagnosticsRequest, providerSecretStatus } from './intelligence-provider-secrets.mjs';

const activeEnv=()=>({
  FOMO_GALAXY_ENABLED:'true',
  INTELLIGENCE_MESH_ENABLED:'true',
  ECOSYSTEM_UNIVERSES_ENABLED:'true',
  MULTICHAIN_MARKET_ENABLED:'true',
  UNIVERSE_ENABLED:'true',
  FULL_CHAIN_STREAM_ENABLED:'false',
  INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED:'false',
  FOMOAPI_API_KEY:'fomo-secret',
  HELIUS_API_KEY:'helius-secret',
  COINGECKO_API_KEY:'coingecko-secret',
  PUMP_INGEST_SECRET:'webhook-secret'
});

test('active production features accept documented fallback groups without requiring inactive aliases',()=>{
  const status=providerSecretStatus(activeEnv());
  assert.equal(status.ok,true);
  assert.deepEqual(status.missingRequired,[]);
  assert.equal(status.requirements.find(row=>row.id==='helius-webhook-auth')?.configured,true);
  assert.equal(status.requirements.find(row=>row.id==='mesh-ingest-auth')?.required,false);
});

test('mesh ingest token becomes required only when the external stream is enabled',()=>{
  const env={...activeEnv(),FULL_CHAIN_STREAM_ENABLED:'true'};
  const missing=providerSecretStatus(env);
  assert.equal(missing.ok,false);
  assert.deepEqual(missing.missingRequired,['mesh-ingest-auth']);
  env.INTELLIGENCE_MESH_INGEST_TOKEN='mesh-secret';
  assert.equal(providerSecretStatus(env).ok,true);
});

test('internal diagnostics returns booleans only and never serializes secret values',async()=>{
  const env=activeEnv();
  const unauthorized=await handleProviderSecretDiagnosticsRequest(new Request('https://example.test/api/internal/intelligence/provider-secrets'),env);
  assert.equal(unauthorized.status,401);
  const response=await handleProviderSecretDiagnosticsRequest(new Request('https://example.test/api/internal/intelligence/provider-secrets',{headers:{authorization:'Bearer webhook-secret'}}),env);
  assert.equal(response.status,200);
  const text=await response.text();
  const body=JSON.parse(text);
  assert.equal(body.ok,true);
  assert.equal(body.valuesExposed,false);
  assert.equal(body.configured.FOMOAPI_API_KEY,true);
  assert.equal(body.configured.INTELLIGENCE_MESH_INGEST_TOKEN,false);
  for(const value of ['fomo-secret','helius-secret','coingecko-secret','webhook-secret'])assert.equal(text.includes(value),false);
});
