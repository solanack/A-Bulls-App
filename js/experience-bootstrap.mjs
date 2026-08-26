import { resolveExperienceFlags } from './experience-feature-flags.mjs';
import { createFieldShell } from './field-shell.mjs';
import { searchRequest } from './universal-search.mjs';

const TITLES=Object.freeze({intelligence:'INTELLIGENCE',replay:'TEMPORAL REPLAY',compare:'COMPARE', 'what-if':'WHAT IF',sequences:'MARKET SEQUENCES',trickster:'CREATE · TRICKSTER',evidence:'EVIDENCE',games:'GAMES'});
export function bootstrapNextExperience({flags,host,adapters,serviceState='ready',onSearchRequest,onFieldCommand}){
  const resolvedFlags=resolveExperienceFlags(flags);
  if(!resolvedFlags.nextProductShellEnabled)return Object.freeze({mounted:false,reason:'feature-disabled',flags:resolvedFlags,destroy(){}});
  if(!(host instanceof Element))throw new TypeError('isolated vNext host is required');
  if(!adapters?.readiness)throw new TypeError('product adapter registry is required');
  const readiness=adapters.readiness();
  if(!readiness.ready)return Object.freeze({mounted:false,reason:'adapters-incomplete',missingPrimary:readiness.missingPrimary,flags:resolvedFlags,destroy(){}});
  let shell;
  const mountAdapter=(id,context={},title=TITLES[id]||id.toUpperCase())=>{const content=adapters.activate(id,context);if(content instanceof Element)shell.mountWorkspace(content,{title,mode:id});return content;};
  const routeCommand=(command)=>{
    onFieldCommand?.(command);
    if(command==='explore'){shell.closeWorkspace();return;}
    if(command==='trickster'){mountAdapter('trickster',{source:'field-command'});return;}
    if(command==='games'){mountAdapter('games',{source:'field-command'});return;}
    const destination=command==='sequences'?'market-sequence':command;
    mountAdapter('intelligence',{source:'field-command',request:{destination}},TITLES[command]);
  };
  shell=createFieldShell({host,serviceState,onCommand:routeCommand,onSearch(value){const request=searchRequest(value);onSearchRequest?.(request);if(request.kind==='empty')return;mountAdapter('intelligence',{source:'field-search',request},'INTELLIGENCE');}});
  return Object.freeze({mounted:true,flags:resolvedFlags,shell,openMode:routeCommand,mountAdapter,destroy(){shell.destroy();}});
}
