const s=value=>String(value??'').trim();
const DEFAULT_PUBLIC_RPC='https://rpc.mainnet.chain.robinhood.com';

export function ponsRpcEndpoints(env={}){
  const configured=[s(env.PONS_RPC_URL),...s(env.PONS_RPC_FALLBACK_URLS).split(',').map(s),DEFAULT_PUBLIC_RPC].filter(Boolean);
  return Object.freeze([...new Set(configured)]);
}

export async function ponsRpc(env,method,params=[],fetchImpl=fetch){
  const errors=[];
  for(const endpoint of ponsRpcEndpoints(env)){
    try{
      const response=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
      if(!response.ok){errors.push(`http_${response.status}`);continue;}
      const body=await response.json();
      if(body?.error){errors.push(`rpc_${s(body.error.code)||'error'}`);continue;}
      return body?.result;
    }catch(error){errors.push(s(error?.message||error)||'network_error');}
  }
  throw new Error(`pons_rpc_unavailable:${method}:${errors.join(',')||'no_endpoint'}`);
}

export const __ponsRpcContract=Object.freeze({chainId:4663,readOnly:true,failover:true,publicFallback:DEFAULT_PUBLIC_RPC});
