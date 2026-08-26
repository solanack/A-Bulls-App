const COMMANDS=Object.freeze([
  ['explore','EXPLORE'],['intelligence','INTELLIGENCE'],['replay','REPLAY'],['compare','COMPARE'],['what-if','WHAT IF'],['sequences','SEQUENCES'],['trickster','CREATE'],['evidence','EVIDENCE'],['games','GAMES']
]);
const MODE_HINTS=Object.freeze({
  explore:'SELECT ACTIVITY · SEARCH THE CHAIN · TURN EVIDENCE INTO PLAYABLE STORIES',
  intelligence:'INSPECT VERIFIED ACTIVITY · FOLLOW EVIDENCE · OPEN REPLAY',
  replay:'PLAY · PAUSE · REWIND · STEP THROUGH CHAIN TIME',
  compare:'COMPARE EVIDENCE SIDE BY SIDE · KEEP TIMELINES SYNCHRONIZED',
  'what-if':'SIMULATE FROM OBSERVED EVIDENCE · ESTIMATES STAY LABELED',
  sequences:'DISCOVER BOUNDED MARKET SEQUENCES · PLAY THE EVIDENCE',
  trickster:'COMPOSE A DATA STORY · EVERY PUBLISHED CLAIM KEEPS ITS RECEIPT',
  evidence:'VERIFY SOURCES · COVERAGE · RECEIPTS · ORIGINAL CHAIN TIME',
  games:'ENTER BULL INVADERS · COMPETITIVE RULES REMAIN PRESERVED'
});
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!=null)n.textContent=text;return n;}
export function createFieldShell({host,serviceState='ready',onCommand,onSearch}){
  if(!(host instanceof Element))throw new TypeError('host element is required');
  const root=el('div','field-shell');root.dataset.mode='explore';
  const fieldHost=el('div','field-shell__field');fieldHost.setAttribute('aria-label','Live Solana data field');
  const chrome=el('div','field-shell__chrome'),top=el('header','field-shell__top');
  const brand=el('button','field-shell__brand','A BULLS APP');brand.type='button';brand.addEventListener('click',()=>closeWorkspace());
  const search=el('form','field-shell__search');search.setAttribute('role','search');
  const input=document.createElement('input');input.type='search';input.autocomplete='off';input.spellcheck=false;input.placeholder='Search wallet · transaction · token · NFT · program';input.setAttribute('aria-label',input.placeholder);
  search.append(input,el('span','','READ ONLY'));search.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(value)onSearch?.(value);});
  const status=el('div','field-shell__status',serviceState==='ready'?'● SYSTEMS READY':'● PARTIAL SERVICE');top.append(brand,search,status);
  const commandDock=el('nav','field-shell__commands');commandDock.setAttribute('aria-label','Data field modes');
  for(const [id,label] of COMMANDS){const b=el('button','field-shell__command',label);b.type='button';b.dataset.fieldCommand=id;b.setAttribute('aria-pressed',String(id==='explore'));b.addEventListener('click',()=>onCommand?.(id));commandDock.append(b);}
  const workspace=el('section','field-shell__workspace');workspace.hidden=true;workspace.setAttribute('aria-live','polite');
  const workspaceHead=el('div','field-shell__workspace-head'),workspaceTitle=el('strong','','INTELLIGENCE'),close=el('button','field-shell__close','RETURN TO FIELD ×');close.type='button';close.addEventListener('click',()=>closeWorkspace());workspaceHead.append(workspaceTitle,close);
  const workspaceBody=el('div','field-shell__workspace-body');workspace.append(workspaceHead,workspaceBody);
  const hint=el('div','field-shell__hint',MODE_HINTS.explore);chrome.append(top,commandDock,hint);root.append(fieldHost,chrome,workspace);host.replaceChildren(root);
  function setActive(command='explore'){const mode=MODE_HINTS[command]?command:'explore';root.dataset.mode=mode;hint.textContent=MODE_HINTS[mode];root.querySelectorAll('[data-field-command]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fieldCommand===mode)));globalThis.dispatchEvent(new CustomEvent('abulls:field-mode',{detail:{mode}}));}
  function mountWorkspace(content,{title='INTELLIGENCE',mode='intelligence'}={}){workspaceTitle.textContent=title;workspaceBody.replaceChildren();if(content instanceof Element)workspaceBody.append(content);workspace.hidden=false;root.classList.add('field-shell--workspace-open');setActive(mode);return workspaceBody;}
  function closeWorkspace(){workspaceBody.replaceChildren();workspace.hidden=true;root.classList.remove('field-shell--workspace-open');setActive('explore');globalThis.dispatchEvent(new CustomEvent('abulls:field-return'));}
  return Object.freeze({root,fieldHost,workspaceBody,focusSearch:()=>input.focus(),mountWorkspace,closeWorkspace,setActive,destroy:()=>root.remove()});
}
export const FieldCommands=COMMANDS;
