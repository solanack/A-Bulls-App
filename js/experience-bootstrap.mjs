import { resolveExperienceFlags } from './experience-feature-flags.mjs';
import { createFieldShell } from './field-shell.mjs';
import { searchRequest } from './universal-search.mjs';

const TITLES=Object.freeze({game:'GAME · PARTICLE FIELD FLIGHT',intelligence:'INTELLIGENCE',replay:'TEMPORAL REPLAY',compare:'COMPARE','what-if':'WHAT IF',sequences:'MARKET SEQUENCES',trickster:'CREATE · TRICKSTER',evidence:'EVIDENCE'});
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
  return Object.freeze({destination,...(focusId?{query:focusId,entityId:focusId}:{}),...(entityKind?{entityKind}:{}),...(kind?{kind}:{}),...(verificationState?{verificationState}:{}),...(command==='what-if'||context?.simulation===true?{simulation:true}:{}),...(evidenceIds.length?{evidenceIds}:{}),});
}

function gameSurface(context={}){
  const wrap=document.createElement('section');wrap.className='particle-game-attachment';
  const head=document.createElement('div');head.className='particle-game-attachment__head';
  const title=document.createElement('strong');title.textContent='GAME ATTACHED TO PARTICLE FIELD';
  const copy=document.createElement('span');copy.textContent='Choose how you fly the same field.';head.append(title,copy);
  const modeBar=document.createElement('div');modeBar.className='particle-game-attachment__modes';
  const frame=document.createElement('iframe');frame.className='particle-game-attachment__frame';frame.title='Particle Field Game';frame.allow='fullscreen';
  const focus=text(context?.focusId||context?.investigationHub?.focusId||context?.query);
  const load=mode=>{const query=new URLSearchParams({embedded:'1',mode});if(focus)query.set('destination',focus);frame.src=`flight.html?${query}`;modeBar.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));};
  for(const [mode,label] of [['navigate','NAVIGATION FLIGHT'],['mission','MISSION FLIGHT']]){const button=document.createElement('button');button.type='button';button.dataset.mode=mode;button.textContent=label;button.addEventListener('click',()=>load(mode));modeBar.append(button);}
  wrap.append(head,modeBar,frame);load('navigate');return wrap;
}

export function bootstrapNextExperience({flags,host,adapters,serviceState='ready',onSearchRequest,onFieldCommand}){
  const resolvedFlags=resolveExperienceFlags(flags);
  if(!resolvedFlags.nextProductShellEnabled)return Object.freeze({mounted:false,reason:'feature-disabled',flags:resolvedFlags,destroy(){}});
  if(!(host instanceof Element))throw new TypeError('isolated vNext host is required');
  if(!adapters?.readiness)throw new TypeError('product adapter registry is required');
  const readiness=adapters.readiness();if(!readiness.ready)return Object.freeze({mounted:false,reason:'adapters-incomplete',missingPrimary:readiness.missingPrimary,flags:resolvedFlags,destroy(){}});
  let shell;
  const mountAdapter=(id,context={},title=TITLES[id]||id.toUpperCase())=>{const content=adapters.activate(id,context);if(content instanceof Element)shell.mountWorkspace(content,{title,mode:id});return content;};
  const routeCommand=(command,context={})=>{
    onFieldCommand?.(command,context);
    if(command==='explore'){shell.closeWorkspace();return;}
    if(command==='game'){shell.mountWorkspace(gameSurface(context),{title:TITLES.game,mode:'game'});return;}
    const request=fieldCommandRequest(command,context),hasFocus=Boolean(request.entityId),source=context?.investigationHub?'field-investigation':'field-command';
    if(command==='trickster'){if(hasFocus){mountAdapter('intelligence',{source:'field-investigation-create',request,investigationHub:context.investigationHub||null},TITLES.trickster);return;}mountAdapter('trickster',{source,request});return;}
    mountAdapter('intelligence',{source,request,investigationHub:context.investigationHub||null},TITLES[command]);
  };
  shell=createFieldShell({host,serviceState,onCommand:routeCommand,onSearch(value){const request=searchRequest(value);onSearchRequest?.(request);if(request.kind==='empty')return;mountAdapter('intelligence',{source:'field-search',request},'INTELLIGENCE');}});
  return Object.freeze({mounted:true,flags:resolvedFlags,shell,openMode:routeCommand,mountAdapter,destroy(){shell.destroy();}});
}
