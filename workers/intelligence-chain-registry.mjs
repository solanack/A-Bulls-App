/* Chain-qualified identity and provider routing for A Bulls App.
 * The registry is deliberately data-only: no signing, execution, custody, or
 * cross-chain identity inference happens here.
 */

const EVM_ADDRESS=/^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TRUTHY=new Set(['1','true','yes','on']);
const s=value=>String(value??'').trim();
const truthy=value=>TRUTHY.has(s(value).toLowerCase());
const uniq=values=>[...new Set(values.map(s).filter(Boolean))];
const slug=value=>s(value).toLowerCase().replace(/[_\s:]+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,48);

const DEFINITIONS=Object.freeze([
  Object.freeze({key:'solana',kind:'svm',chainId:null,fomo:true,aliases:Object.freeze(['solana','sol','svm','solana-mainnet','1399811149']),dexScreenerId:'solana',geckoNetworks:Object.freeze(['solana']),rpcEnv:Object.freeze([]),publicRpc:Object.freeze([])}),
  Object.freeze({key:'base',kind:'evm',chainId:8453,fomo:true,aliases:Object.freeze(['base','base-mainnet','coinbase-base','8453','eip155-8453']),dexScreenerId:'base',geckoNetworks:Object.freeze(['base']),rpcEnv:Object.freeze(['BASE_RPC_URL','EVM_RPC_BASE_URL']),publicRpc:Object.freeze(['https://base-rpc.publicnode.com'])}),
  Object.freeze({key:'bsc',kind:'evm',chainId:56,fomo:true,aliases:Object.freeze(['bsc','bnb','bnb-chain','bnbchain','binance-smart-chain','56','eip155-56']),dexScreenerId:'bsc',geckoNetworks:Object.freeze(['bsc','binance-smart-chain']),rpcEnv:Object.freeze(['BSC_RPC_URL','BNB_RPC_URL','EVM_RPC_BSC_URL']),publicRpc:Object.freeze(['https://bsc-rpc.publicnode.com'])}),
  Object.freeze({key:'monad',kind:'evm',chainId:143,fomo:true,aliases:Object.freeze(['monad','monad-mainnet','143','eip155-143']),dexScreenerId:'monad',geckoNetworks:Object.freeze(['monad']),rpcEnv:Object.freeze(['MONAD_RPC_URL','EVM_RPC_MONAD_URL']),publicRpc:Object.freeze(['https://rpc.monad.xyz'])}),
  Object.freeze({key:'robinhood',kind:'evm',chainId:4663,fomo:true,aliases:Object.freeze(['robinhood','robinhood-chain','robinhoodchain','hood','4663','eip155-4663']),dexScreenerId:'robinhood',geckoNetworks:Object.freeze(['robinhood','robinhood-chain']),rpcEnv:Object.freeze(['ROBINHOOD_RPC_URL','EVM_RPC_ROBINHOOD_URL','PONS_RPC_URL']),publicRpc:Object.freeze([])}),
  Object.freeze({key:'ethereum',kind:'evm',chainId:1,fomo:true,aliases:Object.freeze(['ethereum','eth','ethereum-mainnet','mainnet','1','eip155-1']),dexScreenerId:'ethereum',geckoNetworks:Object.freeze(['eth','ethereum']),rpcEnv:Object.freeze(['ETHEREUM_RPC_URL','ETH_RPC_URL','EVM_RPC_ETHEREUM_URL']),publicRpc:Object.freeze(['https://ethereum-rpc.publicnode.com'])}),
  // Kept as a research-capable known EVM namespace, but not claimed as a current
  // Fomo coverage target. Unknown/new provider chains are still supported through
  // the dynamic chain-qualified path below.
  Object.freeze({key:'arc',kind:'evm',chainId:null,fomo:false,aliases:Object.freeze(['arc','arc-chain','circle-arc','circlearc']),dexScreenerId:'arc',geckoNetworks:Object.freeze(['arc']),rpcEnv:Object.freeze(['ARC_RPC_URL','EVM_RPC_ARC_URL']),publicRpc:Object.freeze([])})
]);

const BY_KEY=new Map(DEFINITIONS.map(item=>[item.key,item]));
const ALIASES=new Map();
for(const item of DEFINITIONS){ALIASES.set(item.key,item.key);for(const alias of item.aliases)ALIASES.set(slug(alias),item.key);}

function dynamicDefinition(raw,address=''){
  const key=slug(raw);if(!key)return null;
  const kind=EVM_ADDRESS.test(s(address))?'evm':SOLANA_ADDRESS.test(s(address))?'svm':'evm';
  return Object.freeze({key,kind,chainId:null,fomo:false,dynamic:true,aliases:Object.freeze([key]),dexScreenerId:key,geckoNetworks:Object.freeze([key]),rpcEnv:Object.freeze([`EVM_RPC_${key.toUpperCase().replace(/-/g,'_')}_URL`]),publicRpc:Object.freeze([])});
}

export function normalizeChainKey(value='solana'){
  const normalized=slug(value||'solana')||'solana';
  return ALIASES.get(normalized)||normalized;
}

export function resolveChain(value='solana',{address=''}={}){
  const key=normalizeChainKey(value);return BY_KEY.get(key)||dynamicDefinition(key,address);
}

export function chainDefinitions(){return Object.freeze([...DEFINITIONS]);}
export function fomoChainTargets(){return Object.freeze(DEFINITIONS.filter(item=>item.fomo).map(item=>item.key));}

export function isValidChainAddress(chain,address){
  const definition=resolveChain(chain,{address});if(!definition)return false;
  return definition.kind==='svm'?SOLANA_ADDRESS.test(s(address)):EVM_ADDRESS.test(s(address));
}

export function canonicalChainAddress(chain,address){
  const definition=resolveChain(chain,{address});const value=s(address);
  if(!definition||!isValidChainAddress(definition.key,value))return null;
  return definition.kind==='evm'?value.toLowerCase():value;
}

export function sameChainAddress(chain,a,b){
  const left=canonicalChainAddress(chain,a),right=canonicalChainAddress(chain,b);return Boolean(left&&right&&left===right);
}

export function chainQualifiedId(chain,address){
  const definition=resolveChain(chain,{address}),canonical=definition&&canonicalChainAddress(definition.key,address);
  return definition&&canonical?`${definition.key}:${canonical}`:null;
}

export function providerChainConfig(chain,address='',env={}){
  const definition=resolveChain(chain,{address});if(!definition)return null;
  const overrideKey=`COINGECKO_NETWORK_${definition.key.toUpperCase().replace(/-/g,'_')}`;
  const geckoNetworks=uniq([env?.[overrideKey],...definition.geckoNetworks]);
  return Object.freeze({chainKey:definition.key,kind:definition.kind,chainId:definition.chainId,dexScreenerId:definition.dexScreenerId,geckoNetworks:Object.freeze(geckoNetworks)});
}

export function rpcCandidatesForChain(env={},chain,address=''){
  const definition=resolveChain(chain,{address});if(!definition||definition.kind!=='evm')return Object.freeze([]);
  const candidates=[];
  for(const name of definition.rpcEnv){const url=s(env?.[name]);if(url)candidates.push(Object.freeze({source:`env:${name.toLowerCase()}`,url}));}
  if(truthy(env.MULTICHAIN_PUBLIC_RPC_FALLBACKS))for(const url of definition.publicRpc)candidates.push(Object.freeze({source:`public:${definition.key}`,url}));
  const seen=new Set();return Object.freeze(candidates.filter(item=>{if(seen.has(item.url))return false;seen.add(item.url);return true;}));
}

export const __chainRegistryContract=Object.freeze({
  identity:'chain-qualified-address-v1',
  readOnly:true,
  knownChains:Object.freeze(DEFINITIONS.map(item=>item.key)),
  fomoTargets:fomoChainTargets(),
  futureUnknownEvmChains:'slug-and-address-capability-gated',
  noCrossChainIdentityInference:true
});