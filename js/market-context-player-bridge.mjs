import { buildMarketContextReplay } from './market-context-replay.mjs';
import { TradeReplayPlayer } from './trade-replay-player.mjs';

let activePlayer=null;
let activeHost=null;

function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;}
function visibleInspector(){return [...document.querySelectorAll('.intelligence-event-inspector')].reverse().find(item=>!item.hidden&&item.isConnected)||null;}
function destroyPlayer(){activePlayer?.destroy?.();activePlayer=null;if(activeHost?.isConnected)activeHost.remove();activeHost=null;}

export function mountMarketContextReplay({context,request}={}){
  if(!context?.window)return false;
  const inspector=visibleInspector();if(!inspector)return false;
  inspector.querySelector('.intelligence-market-replay-tools')?.remove();destroyPlayer();
  const tools=node('section','intelligence-market-replay-tools');
  const copy=node('div','intelligence-market-replay-tools__copy');copy.append(node('strong','','PLAYABLE MARKET WINDOW'),node('p','',`${context.activity?.eventCount||0} indexed token events · bounded ±${Math.round((context.window?.windowSeconds||0)/60)}m around the selected event.`));
  const play=node('button','secondary','PLAY MARKET WINDOW');play.type='button';
  const host=node('div','intelligence-market-replay-host');host.hidden=true;
  const disclosure=node('p','intelligence-context-disclosure','Surrounding wallet events are contextual public-chain observations only. They do not imply coordination, common ownership, strategy, intent, or causation.');
  tools.append(copy,play,host,disclosure);
  const market=inspector.querySelector('.intelligence-market-context');(market||inspector).after(tools);
  play.addEventListener('click',()=>{
    if(activePlayer&&activeHost===host){destroyPlayer();host.hidden=true;play.textContent='PLAY MARKET WINDOW';return;}
    destroyPlayer();
    const selected=context.selected||{id:request?.signature||'selected-event',signature:request?.signature||null,wallet:request?.subjectWallet||'',token:request?.mint||context.subject?.mint,timestamp:request?.timestamp||context.subject?.eventTime,side:'event'};
    const replay=buildMarketContextReplay(context,{selectedEvent:selected,token:request?.mint||context.subject?.mint});
    host.hidden=false;activeHost=host;
    activePlayer=new TradeReplayPlayer({host,events:replay.timeline.events,candles:[],startTime:replay.timeline.startTime,endTime:replay.timeline.endTime,label:'Indexed market window replay',focusSignature:selected.signature||'',focusTimestamp:selected.timestamp||context.subject?.eventTime});
    if(replay.focusId)activePlayer.focusReplayEvent(replay.focusId);
    play.textContent='CLOSE MARKET WINDOW';
  });
  return true;
}

function onContext(event){mountMarketContextReplay(event.detail||{});}

export function installMarketContextPlayerBridge(){
  globalThis.addEventListener?.('abulls:event-market-context',onContext);
  return()=>{globalThis.removeEventListener?.('abulls:event-market-context',onContext);destroyPlayer();};
}

if(typeof document!=='undefined')installMarketContextPlayerBridge();
