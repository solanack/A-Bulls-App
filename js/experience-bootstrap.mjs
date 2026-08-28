import { resolveExperienceFlags } from './experience-feature-flags.mjs';
import { createFieldShell } from './field-shell.mjs';
import { searchRequest } from './universal-search.mjs';

const TITLES=Object.freeze({intelligence:'INTELLIGENCE',replay:'TEMPORAL REPLAY',compare:'COMPARE','what-if':'WHAT IF',sequences:'MARKET SEQUENCES',trickster:'CREATE · TRICKSTER',evidence:'EVIDENCE'});
const text=value=>String(value==null?'':value).trim();
const BASE58_RE=/^[1-9A-HJ-NP-Za-km-z]{32,88}$/;

export function fieldCommandRequest(command,context={}){
  const destination=command==='sequences'?'market-sequence':command;
  const hub=context?.investigationHub;
  const focusId=text(context?.focusId||hub?.focusId);
  const entityKind=text(context?.focusKind||hub?.focusKind||context?.entityKind).toLowerCase();
  const verificationState=text(hub?.nodes?.find?.(node=>node.id===focusId)?.verificationState);
  const evidenceIds=Object.freeze([...(hub?.edges||[])].map(edge=>text(edge?.evidenceId)).filter(Boolean));
  const kind=!focusId?'':entityKind==='transaction'?'transaction-signature':BASE58_RE.test(focusId)?'solana-address':'field-entity';
  return Object.freeze({
    destination,
    ...(focusId?{query:focusId,entityId:focusId}:{}),
    ...(entityKind?{entityKind}:{}),
    ...(kind?{kind}:{}),
    ...(verificationState?{verificationState}:{}),
    ...(command==='what-if'||context?.simulation===true?{simulation:true}:{}),
    ...(evidenceIds.length?{evidenceIds}:{}),
  });
}

export function bootstrapNextExperience({flags,host,adapters,serviceState='ready',onSearchRequest,onFieldCommand}){
  const resolvedFlags=resolveExperienceFlags(flags);
  if(!resolvedFlags.nextProductShellEnabled)return Object.freeze({mounted:false,reason:'feature-disabled',flags:resolvedFlags,destroy(){}});
  if(!(host instanceof Element))throw new TypeError('isolated vNext host is required');
  if(!adapters?.readiness)throw new TypeError('product adapter registry is required');
  const readiness=adapters.readiness();
  if(!readiness.ready)return Object.freeze({mounted:false,reason:'adapters-incomplete',missingPrimary:readiness.missingPrimary,flags:resolvedFlags,destroy(){}});
  let shell;
  const mountAdapter=(id,context={},title=TITLES[id]||id.toUpperCase())=>{const content=adapters.activate(id,context);if(content instanceof Element)shell.mountWorkspace(content,{title,mode:id});return content;};
  const routeCommand=(command,context={})=>{
    onFieldCommand?.(command,context);
    if(command==='explore'){shell.closeWorkspace();return;}
    const request=fieldCommandRequest(command,context);
    const hasFocus=Boolean(request.entityId);
    const source=context?.investigationHub?'field-investigation':'field-command';
    if(command==='trickster'){
      if(hasFocus){mountAdapter('intelligence',{source:'field-investigation-create',request,investigationHub:context.investigationHub||null},TITLES.trickster);return;}
      mountAdapter('trickster',{source,request});return;
    }
    mountAdapter('intelligence',{source,request,investigationHub:context.investigationHub||null},TITLES[command]);
  };
  shell=createFieldShell({host,serviceState,onCommand:routeCommand,onSearch(value){const request=searchRequest(value);onSearchRequest?.(request);if(request.kind==='empty')return;mountAdapter('intelligence',{source:'field-search',request},'INTELLIGENCE');}});
  return Object.freeze({mounted:true,flags:resolvedFlags,shell,openMode:routeCommand,mountAdapter,destroy(){shell.destroy();}});
}
