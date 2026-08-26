import { createSubstreamsExecutor } from './substreams-executor.mjs';
import { createOldFaithfulExecutor } from './old-faithful-executor.mjs';
import { createOldFaithfulJsonRpcTransport } from './old-faithful-jsonrpc-transport.mjs';

const s=v=>String(v==null?'':v).trim();
const enabled=v=>s(v).toLowerCase()==='true';
function headerConfig(value){const raw=s(value);if(!raw)return{};let parsed;try{parsed=JSON.parse(raw);}catch{throw new Error('old_faithful_headers_invalid_json');}if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('old_faithful_headers_invalid');const out={};for(const[key,val]of Object.entries(parsed)){const name=s(key),headerValue=s(val);if(name&&headerValue)out[name]=headerValue;}return out;}

export function buildBridgeExecutors({env=process.env,transports={},fetchImpl=globalThis.fetch}={}){
  const executors={};
  if(enabled(env.INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED)){
    if(typeof transports.substreams!=='function')throw new Error('substreams_transport_not_configured');
    executors.substreams=createSubstreamsExecutor({transport:transports.substreams});
  }
  if(enabled(env.INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED)){
    let transport=transports['old-faithful']||transports.oldFaithful;
    if(typeof transport!=='function'&&s(env.INTELLIGENCE_OLD_FAITHFUL_RPC_URL)){
      transport=createOldFaithfulJsonRpcTransport({
        endpoint:env.INTELLIGENCE_OLD_FAITHFUL_RPC_URL,
        fetchImpl,
        headers:headerConfig(env.INTELLIGENCE_OLD_FAITHFUL_RPC_HEADERS_JSON),
        pageSize:env.INTELLIGENCE_OLD_FAITHFUL_PAGE_SIZE,
        maxPages:env.INTELLIGENCE_OLD_FAITHFUL_MAX_PAGES,
        timeoutMs:env.INTELLIGENCE_OLD_FAITHFUL_TIMEOUT_MS
      });
    }
    if(typeof transport!=='function')throw new Error('old_faithful_transport_not_configured');
    executors['old-faithful']=createOldFaithfulExecutor({transport});
  }
  return Object.freeze(executors);
}

export function bridgeSourceKinds(executors={}){
  return Object.freeze(Object.keys(executors).filter(kind=>typeof executors[kind]==='function'));
}
