import { buildMarketContextReplay } from './market-context-replay.mjs';
import { TradeReplayPlayer } from './trade-replay-player.mjs';

let activePlayer=null;
let activeHost=null;

function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;}
function visibleInspector(){return [...document.querySelectorAll('.intelligence-event-inspector')].reverse().find(item=>!item.hidden&&item.isConnected)||null;}
function destroyPlayer(){activePlayer?.destroy?.();activePlayer=null;if(activeHost?.isConnected)activeHost.replaceChildren();activeHost=null;}
function short(value){const text=String(value||'');return text.length>18?`${text.slice(0,8)}…${text.slice(-7)}`:text;}

export function marketReplayPriceOptions(context={}){
  return Object.freeze([{id:'time-only',label:'Time-only · no price overlay',candles:Object.freeze([])},...(context.pricePairs||[]).map((pair,index)=>Object.freeze({id:`pair-${index}`,label:`${short(pair.quoteMint)} · ${pair.bucketSeconds}s candles`,quoteMint:pair.quoteMint,bucketSeconds:pair.bucketSeconds,candles:Object.freeze([...(pair.candles||[])])}))]);
}

export function selectedPricePairForOption(context={},option={}){
  if(!option?.quoteMint)return null;
  return (context.pricePairs||[]).find(pair=>String(pair.quoteMint)===String(option.quoteMint)&&Number(pair.bucketSeconds)===Number(option.bucketSeconds))||null;
}

export function mountMarketContextReplay({context,request}={}){
  if(!context?.window)return false;
  const inspector=visibleInspector();if(!inspector)return false;
  context.selectedPricePair=null;
  inspector.querySelector('.intelligence-market-replay-tools')?.remove();destroyPlayer();
  const tools=node('section','intelligence-market-replay-tools');
  const copy=node('div','intelligence-market-replay-tools__copy');copy.append(node('strong','','PLAYABLE MARKET WINDOW'),node('p','',`${context.activity?.eventCount||0} indexed token events · bounded ±${Math.round((context.window?.windowSeconds||0)/60)}m around the selected event.`));
  const priceWrap=node('label','intelligence-market-price-choice'),priceLabel=node('span','','STORY + REPLAY PRICE EVIDENCE'),price=node('select','intelligence-market-replay-price');price.setAttribute('aria-label','Story and replay price evidence');priceWrap.append(priceLabel,price);const options=marketReplayPriceOptions(context);for(const item of options){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;price.append(option);}
  const storyMode=node('small','intelligence-market-story-mode','Story pricing: TIME-ONLY');
  const play=node('button','secondary','PLAY MARKET WINDOW');play.type='button';
  const host=node('div','intelligence-market-replay-host');host.hidden=true;
  const disclosure=node('p','intelligence-context-disclosure','Time-only is the default. Price is overlaid—and eligible for Event Story price claims—only after you explicitly select an indexed quote pair. Surrounding wallet events are contextual observations only and do not imply coordination, common ownership, strategy, intent, or causation.');
  tools.append(copy,priceWrap,storyMode,play,host,disclosure);
  const market=inspector.querySelector('.intelligence-market-context');(market||inspector).after(tools);
  const chosen=()=>options.find(item=>item.id===price.value)||options[0];
  const persistChoice=()=>{const option=chosen();context.selectedPricePair=selectedPricePairForOption(context,option);storyMode.textContent=context.selectedPricePair?`Story pricing: ${short(context.selectedPricePair.quoteMint)} · ${context.selectedPricePair.bucketSeconds}s`:'Story pricing: TIME-ONLY';return context.selectedPricePair;};
  const render=()=>{
    destroyPlayer();
    const selected=context.selected||{id:request?.signature||'selected-event',signature:request?.signature||null,wallet:request?.subjectWallet||'',token:request?.mint||context.subject?.mint,timestamp:request?.timestamp||context.subject?.eventTime,side:'event'};
    const replay=buildMarketContextReplay(context,{selectedEvent:selected,token:request?.mint||context.subject?.mint});
    const option=chosen();persistChoice();
    host.hidden=false;activeHost=host;
    activePlayer=new TradeReplayPlayer({host,events:replay.timeline.events,candles:option.candles,startTime:replay.timeline.startTime,endTime:replay.timeline.endTime,label:option.quoteMint?`Indexed market replay against ${short(option.quoteMint)} quote candles`:'Indexed time-only market window replay',focusSignature:selected.signature||'',focusTimestamp:selected.timestamp||context.subject?.eventTime});
    if(replay.focusId)activePlayer.focusReplayEvent(replay.focusId);
    play.textContent='CLOSE MARKET WINDOW';
  };
  persistChoice();
  play.addEventListener('click',()=>{if(activePlayer&&activeHost===host){destroyPlayer();host.hidden=true;play.textContent='PLAY MARKET WINDOW';return;}render();});
  price.addEventListener('change',()=>{persistChoice();if(activePlayer&&activeHost===host)render();});
  return true;
}

function onContext(event){mountMarketContextReplay(event.detail||{});}
export function installMarketContextPlayerBridge(){globalThis.addEventListener?.('abulls:event-market-context',onContext);return()=>{globalThis.removeEventListener?.('abulls:event-market-context',onContext);destroyPlayer();};}
if(typeof document!=='undefined')installMarketContextPlayerBridge();
