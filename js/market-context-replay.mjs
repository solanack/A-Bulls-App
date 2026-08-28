import { createReplayTimeline } from './temporal-replay-engine.mjs';

const text=value=>String(value==null?'':value).trim();
const num=value=>Number.isFinite(Number(value))?Number(value):null;

export function buildMarketContextReplay(context,{selectedEvent,token}={}){
  if(!context?.window)throw new TypeError('market context is required');
  const mint=text(token||context.subject?.mint);if(!mint)throw new TypeError('token mint is required');
  const selectedId=text(selectedEvent?.id||selectedEvent?.signature||context.subject?.signature);
  const selectedSignature=text(selectedEvent?.signature||context.subject?.signature)||null;
  const events=(context.activity?.events||[]).map((event,index)=>Object.freeze({
    id:text(event.signature)||`market-context-${index+1}`,
    signature:text(event.signature)||null,
    wallet:text(event.wallet),token:mint,timestamp:num(event.timestamp),slot:num(event.slot),kind:'trade',side:text(event.side||'event').toLowerCase(),price:null,
    amount:Math.abs(num(event.tokenDelta)||0),tokenDelta:num(event.tokenDelta),solDelta:num(event.solDelta),feeLamports:num(event.feeLamports),counterparty:text(event.counterparty)||null,programId:text(event.programId)||null,confidence:num(event.confidence),verification:'observed',source:text(event.source),metadata:Object.freeze({marketContext:true,selected:false})
  })).filter(event=>event.timestamp!=null);
  if(selectedEvent?.timestamp!=null&&!events.some(event=>(selectedSignature&&event.signature===selectedSignature)||event.id===selectedId)){
    events.push(Object.freeze({id:selectedId||'selected-event',signature:selectedSignature,wallet:text(selectedEvent.wallet),token:mint,timestamp:num(selectedEvent.timestamp),slot:num(selectedEvent.slot),kind:'trade',side:text(selectedEvent.side||'event').toLowerCase(),price:num(selectedEvent.price),amount:Math.abs(num(selectedEvent.tokenDelta??selectedEvent.amount)||0),tokenDelta:num(selectedEvent.tokenDelta),solDelta:num(selectedEvent.solDelta),feeLamports:num(selectedEvent.feeLamports),counterparty:text(selectedEvent.counterparty)||null,programId:text(selectedEvent.programId)||null,confidence:num(selectedEvent.confidence),verification:text(selectedEvent.verification||'observed'),source:(selectedEvent.sources||[])[0]||text(selectedEvent.source),metadata:Object.freeze({marketContext:true,selected:true})}));
  }
  const normalized=events.map(event=>Object.freeze({...event,metadata:Object.freeze({...event.metadata,selected:Boolean((selectedSignature&&event.signature===selectedSignature)||event.id===selectedId)})}));
  const timeline=createReplayTimeline({events:normalized,startTime:Number(context.window.from)*1000,endTime:Number(context.window.to)*1000});
  return Object.freeze({schemaVersion:'market-context-replay-v1',token:mint,focusId:selectedId||selectedSignature||null,timeline,disclosure:'This replay shows bounded indexed token activity around the selected event. Other wallets are contextual observations only and do not imply coordination, common ownership, strategy, intent, or causation.'});
}
