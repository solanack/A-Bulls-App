import { createSubstreamsExecutor } from './substreams-executor.mjs';
import { createOldFaithfulExecutor } from './old-faithful-executor.mjs';

const s=v=>String(v==null?'':v).trim();
const enabled=v=>s(v).toLowerCase()==='true';

export function buildBridgeExecutors({env=process.env,transports={}}={}){
  const executors={};
  if(enabled(env.INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED)){
    if(typeof transports.substreams!=='function')throw new Error('substreams_transport_not_configured');
    executors.substreams=createSubstreamsExecutor({transport:transports.substreams});
  }
  if(enabled(env.INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED)){
    if(typeof transports['old-faithful']!=='function'&&typeof transports.oldFaithful!=='function')throw new Error('old_faithful_transport_not_configured');
    executors['old-faithful']=createOldFaithfulExecutor({transport:transports['old-faithful']||transports.oldFaithful});
  }
  return Object.freeze(executors);
}

export function bridgeSourceKinds(executors={}){
  return Object.freeze(Object.keys(executors).filter(kind=>typeof executors[kind]==='function'));
}
