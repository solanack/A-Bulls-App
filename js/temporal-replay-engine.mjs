const DEFAULT_RATES = Object.freeze([0.25,0.5,1,2,4,8,16]);
const SIDES = new Set(['buy','sell','transfer-in','transfer-out','swap','event']);

function finiteNumber(value, fallback = null) {
  if(value==null||value==='') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value,min,max) {
  return Math.min(max,Math.max(min,value));
}

function normalizeTimestamp(value) {
  const number = finiteNumber(value);
  if(number!=null) return Math.trunc(number);
  const parsed = Date.parse(String(value ?? ''));
  if(!Number.isFinite(parsed)) throw new TypeError('replay event timestamp is required');
  return parsed;
}

function safeText(value,max=160) {
  return String(value ?? '').trim().slice(0,max);
}

export function normalizeReplayEvents(events,{maxEvents=100000}={}) {
  if(!Array.isArray(events)) throw new TypeError('events must be an array');
  if(events.length>maxEvents) throw new RangeError(`events exceed replay limit (${maxEvents})`);
  const normalized=events.map((event,index)=>{
    if(!event||typeof event!=='object') throw new TypeError(`event ${index} must be an object`);
    const timestamp=normalizeTimestamp(event.timestamp ?? event.blockTimeMs ?? (finiteNumber(event.blockTime)!=null?Number(event.blockTime)*1000:null));
    const rawSide=safeText(event.side || event.kind || 'event',32).toLowerCase();
    const side=SIDES.has(rawSide)?rawSide:'event';
    const price=finiteNumber(event.price);
    const amount=finiteNumber(event.amount);
    const valueUsd=finiteNumber(event.valueUsd ?? event.usdValue);
    return Object.freeze({
      id:safeText(event.id || event.signature || `${timestamp}-${index}`,128),
      timestamp,
      slot:finiteNumber(event.slot),
      side,
      wallet:safeText(event.wallet || event.owner || '',64),
      counterparty:safeText(event.counterparty || '',64),
      token:safeText(event.token || event.mint || '',64),
      symbol:safeText(event.symbol || '',24),
      signature:safeText(event.signature || '',128),
      price,
      amount,
      valueUsd,
      source:safeText(event.source || '',48),
      verification:safeText(event.verification || event.state || 'observed',24),
      evidenceId:safeText(event.evidenceId || event.receiptId || '',96),
      sequence:index,
      metadata:Object.freeze({...event.metadata})
    });
  });
  normalized.sort((a,b)=>a.timestamp-b.timestamp||a.sequence-b.sequence);
  return Object.freeze(normalized);
}

export function createReplayTimeline({events,startTime,endTime,rates=DEFAULT_RATES}={}) {
  const normalized=normalizeReplayEvents(events ?? []);
  const first=normalized[0]?.timestamp ?? normalizeTimestamp(startTime ?? Date.now());
  const last=normalized.at(-1)?.timestamp ?? first;
  const start=startTime==null?first:normalizeTimestamp(startTime);
  const end=endTime==null?Math.max(start,last):normalizeTimestamp(endTime);
  if(end<start) throw new RangeError('endTime must be on or after startTime');
  const allowedRates=Object.freeze([...new Set((rates ?? DEFAULT_RATES).map(Number).filter((rate)=>Number.isFinite(rate)&&rate>0))].sort((a,b)=>a-b));
  if(!allowedRates.length) throw new RangeError('at least one positive playback rate is required');
  const inRange=Object.freeze(normalized.filter((event)=>event.timestamp>=start&&event.timestamp<=end));
  return Object.freeze({
    startTime:start,
    endTime:end,
    durationMs:end-start,
    events:inRange,
    allowedRates,
    eventCount:inRange.length
  });
}

export function eventsBetween(timeline,fromPlayheadMs,toPlayheadMs) {
  if(!timeline?.events) throw new TypeError('replay timeline is required');
  const from=clamp(finiteNumber(fromPlayheadMs,0),0,timeline.durationMs);
  const to=clamp(finiteNumber(toPlayheadMs,0),0,timeline.durationMs);
  const low=Math.min(from,to)+timeline.startTime;
  const high=Math.max(from,to)+timeline.startTime;
  const forward=to>=from;
  const matches=timeline.events.filter((event)=>forward?(event.timestamp>low&&event.timestamp<=high):(event.timestamp>=low&&event.timestamp<high));
  return Object.freeze(forward?matches:[...matches].reverse());
}

export function replayEffectForEvent(event,{referenceUsd=1000}={}) {
  const value=Math.abs(finiteNumber(event?.valueUsd,0));
  const reference=Math.max(1,finiteNumber(referenceUsd,1000));
  const intensity=clamp(Math.log10(1+value/reference)+0.25,0.2,1);
  const side=event?.side;
  if(side==='buy') return Object.freeze({kind:'lightning',tone:'positive',intensity,hue:'green'});
  if(side==='sell') return Object.freeze({kind:'lightning',tone:'negative',intensity,hue:'red'});
  if(side==='transfer-in') return Object.freeze({kind:'pulse',tone:'positive',intensity,hue:'green'});
  if(side==='transfer-out') return Object.freeze({kind:'pulse',tone:'negative',intensity,hue:'red'});
  return Object.freeze({kind:'pulse',tone:'neutral',intensity,hue:'neutral'});
}

export function dispatchTemporalReplayEvents(events=[],target=globalThis) {
  if(!Array.isArray(events)||!events.length)return Object.freeze([]);
  const frozen=Object.freeze([...events]);
  if(typeof target?.dispatchEvent==='function'&&typeof CustomEvent==='function')target.dispatchEvent(new CustomEvent('abulls:temporal-replay-events',{detail:{events:frozen}}));
  return frozen;
}

export const TemporalReplayEvent='abulls:temporal-replay-events';

export class TemporalReplayController {
  constructor(timeline,{rate=1,loop=false}={}) {
    if(!timeline?.allowedRates) throw new TypeError('replay timeline is required');
    this.timeline=timeline;
    this.playheadMs=0;
    this.playing=false;
    this.loop=Boolean(loop);
    this.rate=this.#resolveRate(rate);
  }

  #resolveRate(rate) {
    const requested=finiteNumber(rate,1);
    return this.timeline.allowedRates.reduce((best,candidate)=>Math.abs(candidate-requested)<Math.abs(best-requested)?candidate:best,this.timeline.allowedRates[0]);
  }

  setRate(rate) {
    this.rate=this.#resolveRate(rate);
    return this.snapshot();
  }

  play() { this.playing=true; return this.snapshot(); }
  pause() { this.playing=false; return this.snapshot(); }

  seekMs(playheadMs) {
    this.playheadMs=clamp(finiteNumber(playheadMs,0),0,this.timeline.durationMs);
    return this.snapshot();
  }

  seekProgress(progress) {
    return this.seekMs(clamp(finiteNumber(progress,0),0,1)*this.timeline.durationMs);
  }

  stepEvent(direction=1) {
    const forward=direction>=0;
    const chainTime=this.timeline.startTime+this.playheadMs;
    const candidates=forward?this.timeline.events:this.timeline.events.slice().reverse();
    const target=candidates.find((event)=>forward?event.timestamp>chainTime:event.timestamp<chainTime);
    if(target) this.playheadMs=target.timestamp-this.timeline.startTime;
    else this.playheadMs=forward?this.timeline.durationMs:0;
    return this.snapshot();
  }

  tick(realDeltaMs) {
    const delta=Math.max(0,finiteNumber(realDeltaMs,0));
    const previous=this.playheadMs;
    if(!this.playing||delta===0) return Object.freeze({snapshot:this.snapshot(),events:Object.freeze([])});
    let next=previous+delta*this.rate;
    let emitted=[];
    if(next>this.timeline.durationMs&&this.loop&&this.timeline.durationMs>0) {
      emitted=[...eventsBetween(this.timeline,previous,this.timeline.durationMs)];
      next=next%this.timeline.durationMs;
      emitted.push(...eventsBetween(this.timeline,0,next));
    } else {
      next=clamp(next,0,this.timeline.durationMs);
      emitted=[...eventsBetween(this.timeline,previous,next)];
      if(next>=this.timeline.durationMs) this.playing=false;
    }
    this.playheadMs=next;
    const frozenEvents=Object.freeze(emitted);
    dispatchTemporalReplayEvents(frozenEvents);
    return Object.freeze({snapshot:this.snapshot(),events:frozenEvents});
  }

  snapshot() {
    const chainTime=this.timeline.startTime+this.playheadMs;
    const progress=this.timeline.durationMs===0?1:this.playheadMs/this.timeline.durationMs;
    return Object.freeze({
      playheadMs:this.playheadMs,
      chainTime,
      progress,
      rate:this.rate,
      playing:this.playing,
      loop:this.loop,
      atStart:this.playheadMs<=0,
      atEnd:this.playheadMs>=this.timeline.durationMs
    });
  }
}