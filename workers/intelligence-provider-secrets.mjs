/* A Bulls App — provider secret diagnostics.
 * Internal-only, boolean status only. Secret values are never serialized.
 */

const s=value=>String(value??'').trim();
const bool=value=>s(value).toLowerCase()==='true';

export const PROVIDER_SECRET_REQUIREMENTS=Object.freeze([
  Object.freeze({id:'fomo-source',label:'Fomo Galaxy source',anyOf:Object.freeze(['FOMOAPI_API_KEY']),requiredWhen:env=>bool(env.FOMO_GALAXY_ENABLED),note:'Required while the public Fomo Galaxy is enabled.'}),
  Object.freeze({id:'solana-history',label:'Helius Solana history and enrichment',anyOf:Object.freeze(['HELIUS_API_KEY']),requiredWhen:env=>bool(env.INTELLIGENCE_MESH_ENABLED)||bool(env.ECOSYSTEM_UNIVERSES_ENABLED),note:'Required by the enabled Solana history mesh.'}),
  Object.freeze({id:'multichain-market',label:'CoinGecko multichain market enrichment',anyOf:Object.freeze(['COINGECKO_API_KEY']),requiredWhen:env=>bool(env.MULTICHAIN_MARKET_ENABLED),note:'Required while scheduled multichain market enrichment is enabled.'}),
  Object.freeze({id:'goldrush-discovery',label:'Optional GoldRush multichain discovery acceleration',anyOf:Object.freeze(['GOLDRUSH_API_KEY']),requiredWhen:()=>false,note:'Optional discovery/stream acceleration only; on-chain receipts remain the evidence boundary and the app works without this connector.'}),
  Object.freeze({id:'helius-webhook-auth',label:'Helius universe webhook authentication',anyOf:Object.freeze(['HELIUS_WEBHOOK_AUTH_SECRET','PUMP_INGEST_SECRET']),requiredWhen:env=>bool(env.UNIVERSE_ENABLED),note:'Either the dedicated Helius webhook secret or the retained pump-ingest secret authenticates the read-only universe webhook.'}),
  Object.freeze({id:'mesh-ingest-auth',label:'External Intelligence Mesh ingest authentication',anyOf:Object.freeze(['INTELLIGENCE_MESH_INGEST_TOKEN']),requiredWhen:env=>bool(env.FULL_CHAIN_STREAM_ENABLED)||bool(env.INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED),note:'Required only when an external authenticated bridge is enabled; direct scheduled mesh work does not use this bearer.'}),
  Object.freeze({id:'pons-bitquery',label:'Retired Pons Bitquery enrichment',anyOf:Object.freeze(['PONS_BITQUERY_TOKEN','BITQUERY_API_TOKEN']),requiredWhen:()=>false,note:'Retained historical/maintenance compatibility; PonsFamily is retired as a public galaxy.'}),
  Object.freeze({id:'pons-blockscout',label:'Retired Pons Blockscout enrichment',anyOf:Object.freeze(['PONS_BLOCKSCOUT_API_KEY','BLOCKSCOUT_API_KEY']),requiredWhen:()=>false,note:'Retained historical/maintenance compatibility; either alias is sufficient.'}),
  Object.freeze({id:'pons-index-auth',label:'Retired Pons index refresh authentication',anyOf:Object.freeze(['PONS_INDEX_SECRET']),requiredWhen:()=>false,note:'Retained for historical maintenance endpoints; not required by the current public production path.'}),
  Object.freeze({id:'pump-ingest-auth',label:'Legacy pump ingest authentication',anyOf:Object.freeze(['PUMP_INGEST_SECRET']),requiredWhen:()=>false,note:'pump.fun is retired as a public galaxy; this secret can also satisfy the active Helius webhook-auth requirement above.'})
]);

export const PROVIDER_SECRET_NAMES=Object.freeze([...new Set(PROVIDER_SECRET_REQUIREMENTS.flatMap(row=>row.anyOf))].sort());

export function providerSecretStatus(env={}){
  const configured=Object.freeze(Object.fromEntries(PROVIDER_SECRET_NAMES.map(name=>[name,Boolean(s(env[name]))])));
  const requirements=PROVIDER_SECRET_REQUIREMENTS.map(row=>{
    const required=Boolean(row.requiredWhen(env));
    const configuredBy=row.anyOf.filter(name=>configured[name]);
    return Object.freeze({id:row.id,label:row.label,required,configured:configuredBy.length>0,configuredBy:Object.freeze(configuredBy),anyOf:row.anyOf,note:row.note});
  });
  const missingRequired=requirements.filter(row=>row.required&&!row.configured).map(row=>row.id);
  return Object.freeze({configured,requirements:Object.freeze(requirements),missingRequired:Object.freeze(missingRequired),ok:missingRequired.length===0});
}

function bearer(request){
  const header=s(request.headers.get('authorization'));
  return /^Bearer\s+/i.test(header)?header.replace(/^Bearer\s+/i,'').trim():'';
}
function same(a,b){
  a=s(a);b=s(b);if(!a||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
}
function authorized(request,env={}){
  const supplied=bearer(request);
  return [env.INTELLIGENCE_MESH_INGEST_TOKEN,env.HELIUS_WEBHOOK_AUTH_SECRET,env.PUMP_INGEST_SECRET,env.PONS_INDEX_SECRET].some(value=>same(value,supplied));
}
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

export async function handleProviderSecretDiagnosticsRequest(request,env={}){
  const url=new URL(request.url);
  if(url.pathname!=='/api/internal/intelligence/provider-secrets')return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  if(!authorized(request,env))return json({ok:false,error:'unauthorized'},401);
  const status=providerSecretStatus(env);
  return json({ok:status.ok,configured:status.configured,requirements:status.requirements,missingRequired:status.missingRequired,valuesExposed:false});
}

export const __providerSecretDiagnosticsContract=Object.freeze({path:'/api/internal/intelligence/provider-secrets',method:'GET',internalOnly:true,booleanStatusOnly:true,secretValuesExposed:false});
