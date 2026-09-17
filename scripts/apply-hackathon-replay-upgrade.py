from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f"{label} anchor missing")


# Backend: canonical seven-day pre-entry context and density-bounded candles.
p = Path("workers/intelligence-replay-bundle.mjs")
t = p.read_text()
anchor = "const MAX_WINDOW_SECONDS=60*60*24*365*15;"
insert = """const MAX_WINDOW_SECONDS=60*60*24*365*15;
const REPLAY_PRE_ROLL_SECONDS=7*24*60*60;
const TARGET_REPLAY_CANDLES=240;
const REPLAY_BUCKETS=Object.freeze([60,300,900,3600,14400,43200,86400]);"""
if "REPLAY_PRE_ROLL_SECONDS" not in t:
    if anchor not in t:
        raise SystemExit("backend constants anchor missing")
    t = t.replace(anchor, insert, 1)

old = """export function adaptiveReplayBucketSeconds(from,to,requested=0){
  const span=Math.max(0,Math.trunc(n(to))-Math.trunc(n(from))),asked=Math.max(0,Math.trunc(n(requested)));
  const floor=span<=2*86400?60:span<=14*86400?300:span<=60*86400?900:span<=365*86400?3600:span<=3*365*86400?14400:86400;
  return Math.max(floor,Math.min(86400,asked||floor));
}"""
new = """export function adaptiveReplayBucketSeconds(from,to,requested=0){
  const span=Math.max(0,Math.trunc(n(to))-Math.trunc(n(from))),asked=Math.max(0,Math.trunc(n(requested))),target=Math.max(60,Math.ceil(span/TARGET_REPLAY_CANDLES));
  const densityBucket=REPLAY_BUCKETS.find(value=>value>=target)??86400,requestedFloor=asked?(REPLAY_BUCKETS.find(value=>value>=asked)??86400):60;
  return Math.max(densityBucket,requestedFloor);
}"""
t = replace_once(t, old, new, "adaptive bucket")

old = "if(explicitFrom){const requestedFrom=Math.max(0,Math.trunc(n(rawFrom))),low=Math.min(requestedFrom,requestedTo),high=Math.max(requestedFrom,requestedTo);if(high-low>MAX_WINDOW_SECONDS)throw new RangeError('replay_window_too_large');return Object.freeze({from:low,to:high,bucketSeconds:adaptiveReplayBucketSeconds(low,high,input.bucketSeconds),startResolved:true,startSource:'explicit',startSourceKind:'user-selected',startRef:null});}"
new = "if(explicitFrom){const requestedFrom=Math.max(0,Math.trunc(n(rawFrom))),low=Math.min(requestedFrom,requestedTo),high=Math.max(requestedFrom,requestedTo);if(high-low>MAX_WINDOW_SECONDS)throw new RangeError('replay_window_too_large');return Object.freeze({from:low,to:high,bucketSeconds:adaptiveReplayBucketSeconds(low,high,input.bucketSeconds),startResolved:true,startSource:'explicit',startSourceKind:'user-selected',startRef:null,entryTime:null,preRollSeconds:0});}"
t = replace_once(t, old, new, "explicit window")

old = "if(!anchor){return Object.freeze({from:requestedTo,to:requestedTo,bucketSeconds:60,startResolved:false,startSource:'unavailable',startSourceKind:'unavailable',startRef:null});}"
new = "if(!anchor){return Object.freeze({from:requestedTo,to:requestedTo,bucketSeconds:60,startResolved:false,startSource:'unavailable',startSourceKind:'unavailable',startRef:null,entryTime:null,preRollSeconds:0});}"
t = replace_once(t, old, new, "unresolved window")

old = """  const resolvedTo=rawTo!=null&&rawTo!==''?requestedTo:Math.max(anchor.from,Math.trunc(n(anchor.to)||requestedTo)),low=Math.min(anchor.from,resolvedTo),high=Math.max(anchor.from,resolvedTo);if(high-low>MAX_WINDOW_SECONDS)throw new RangeError('replay_window_too_large');
  return Object.freeze({from:low,to:high,bucketSeconds:adaptiveReplayBucketSeconds(low,high,input.bucketSeconds),startResolved:true,startSource:anchor.source,startSourceKind:anchor.sourceKind,startRef:anchor.ref});"""
new = """  const entry=Math.max(0,Math.trunc(n(anchor.from))),resolvedTo=rawTo!=null&&rawTo!==''?requestedTo:Math.max(entry,Math.trunc(n(anchor.to)||requestedTo)),contextFrom=Math.max(0,entry-REPLAY_PRE_ROLL_SECONDS),low=Math.min(contextFrom,resolvedTo),high=Math.max(contextFrom,resolvedTo);if(high-low>MAX_WINDOW_SECONDS)throw new RangeError('replay_window_too_large');
  return Object.freeze({from:low,to:high,bucketSeconds:adaptiveReplayBucketSeconds(low,high,input.bucketSeconds),startResolved:true,startSource:anchor.source,startSourceKind:anchor.sourceKind,startRef:anchor.ref,entryTime:entry*1000,preRollSeconds:Math.max(0,entry-low)});"""
t = replace_once(t, old, new, "pre-entry window")

t = t.replace(
    "window.startResolved?`Replay start resolved from ${window.startSource}.`:'Replay entry is unresolved; no arbitrary 30-day history window was substituted.'",
    "window.startResolved?`Replay entry resolved from ${window.startSource}; retained market context begins up to seven days earlier when coverage exists.`:'Replay entry is unresolved; no synthetic lookback window was substituted.'",
)
t = replace_once(
    t,
    "export const __replayBundleContract=Object.freeze({chainQualified:true,solanaHistorySchedulerOnlyForSolana:true,adaptiveHistoricalWindow:true,actualTradeEntryStart:true,noArbitraryLookback:true,maxWindowYears:15,noSyntheticData:true});",
    "export const __replayBundleContract=Object.freeze({chainQualified:true,solanaHistorySchedulerOnlyForSolana:true,adaptiveHistoricalWindow:true,sevenDayPreEntryContext:true,targetReplayCandles:TARGET_REPLAY_CANDLES,noArbitraryLookback:true,maxWindowYears:15,noSyntheticData:true});",
    "Replay contract",
)
p.write_text(t)

# Universe caller: backend resolves the canonical pre-entry start; preserve chain identity.
p = Path("src/components/universe-workspace.tsx")
t = p.read_text()
t = replace_once(
    t,
    'function replayRequest(wallet:string,mint:string,quoteMint:string){const thread=loadResearchThread(),sameSubject=Boolean(wallet&&mint&&thread.wallet===wallet&&thread.mint===mint),selectedWindow=sameSubject&&thread.fromTs&&thread.toTs&&!thread.replayRef?{from:Math.floor(thread.fromTs/1000),to:Math.ceil(thread.toTs/1000)}:{};return{wallets:[wallet].filter(Boolean),mint,quoteMint,bucketSeconds:60,...selectedWindow};}',
    'function replayRequest(wallet:string,mint:string,quoteMint:string){const thread=loadResearchThread(),sameSubject=Boolean(wallet&&mint&&thread.wallet===wallet&&thread.mint===mint),selectedWindow=sameSubject&&thread.toTs&&!thread.replayRef?{to:Math.ceil(thread.toTs/1000)}:{};return{wallets:[wallet].filter(Boolean),mint,quoteMint,...(sameSubject&&thread.chainKey?{chainKey:thread.chainKey}:{}),bucketSeconds:60,...selectedWindow};}',
    "universe replayRequest",
)
save_old = "setReplay(bundle);saveResearchThread({galaxyId:galaxy.id"
save_new = "setReplay(bundle);saveResearchThread({chainKey:text(subject.chain)||prior.chainKey||null,galaxyId:galaxy.id"
if save_old in t:
    t = t.replace(save_old, save_new, 1)
elif save_new not in t:
    raise SystemExit("universe research thread chain anchor missing")
p.write_text(t)

# Replay player: chain-preserving hydration, pre-entry narration, event-aware pacing, evidence-synced audio.
p = Path("src/components/replay-workspace.tsx")
t = p.read_text()
t = replace_once(
    t,
    'const subject=obj(bundle.subject),windowData=obj(bundle.window),wallets=arr(subject.wallets).map(text).filter(Boolean),wallet=wallets[0]??"",mint=text(subject.mint),quoteMint=text(subject.quoteMint),start=num(windowData.startTime),end=num(windowData.endTime),duration=Math.max(1,end-start),replayKey=`${wallet}:${mint}:${start}:${end}:${events.length}:${candles.length}`;',
    'const subject=obj(bundle.subject),windowData=obj(bundle.window),chainKey=text(subject.chain),wallets=arr(subject.wallets).map(text).filter(Boolean),wallet=wallets[0]??"",mint=text(subject.mint),quoteMint=text(subject.quoteMint),start=num(windowData.startTime),end=num(windowData.endTime),entryTime=num(windowData.entryTime),duration=Math.max(1,end-start),replayKey=`${chainKey}:${wallet}:${mint}:${start}:${end}:${events.length}:${candles.length}`;',
    "Replay subject",
)
t = replace_once(
    t,
    'const[cursor,setCursor]=useState(0),[speed,setSpeed]=useState<ReplaySpeed>(1),[playing,setPlaying]=useState(false),[receipt,setReceipt]=useState<Data|null>(null),[receiptContext,setReceiptContext]=useState<Data|null>(null),[receiptBusy,setReceiptBusy]=useState(false),[receiptError,setReceiptError]=useState(""),[shareStatus,setShareStatus]=useState("");',
    'const[cursor,setCursor]=useState(0),[speed,setSpeed]=useState<ReplaySpeed>(1),[playing,setPlaying]=useState(false),[soundEnabled,setSoundEnabled]=useState(true),[receipt,setReceipt]=useState<Data|null>(null),[receiptContext,setReceiptContext]=useState<Data|null>(null),[receiptBusy,setReceiptBusy]=useState(false),[receiptError,setReceiptError]=useState(""),[shareStatus,setShareStatus]=useState("");',
    "Replay sound state",
)
t = replace_once(
    t,
    'const frameRef=useRef<number|undefined>(undefined),lastFrameRef=useRef<number|undefined>(undefined);',
    'const frameRef=useRef<number|undefined>(undefined),lastFrameRef=useRef<number|undefined>(undefined),audioRef=useRef<AudioContext|null>(null),lastCueRef=useRef("");',
    "Replay refs",
)
t = replace_once(
    t,
    'const currentTs=start+duration*cursor,visibleEvents=events.filter(row=>num(row.timestamp)<=currentTs),currentEvent=visibleEvents.at(-1)??null,thread=loadResearchThread(),sameThread=Boolean(wallet&&mint&&thread.wallet===wallet&&thread.mint===mint),entrySignature=sameThread?thread.entrySignature:null,exitSignature=sameThread?thread.exitSignature:null;\n  const movieBeat=currentEvent?`${text(currentEvent.side??currentEvent.kind??"OBSERVED EVENT").toUpperCase()} · ${formatDate(num(currentEvent.timestamp))}`:"WAITING FOR FIRST INDEXED EVENT";',
    'const currentTs=start+duration*cursor,visibleEvents=events.filter(row=>num(row.timestamp)<=currentTs),currentEvent=visibleEvents.at(-1)??null,nextEvent=events.find(row=>num(row.timestamp)>currentTs)??null,secondsToNext=nextEvent?Math.max(0,(num(nextEvent.timestamp)-currentTs)/1000):0,cinematicRate=secondsToNext>6*3600?8:secondsToNext>30*60?4:secondsToNext>5*60?2:1,preEntry=entryTime>0&&currentTs<entryTime,thread=loadResearchThread(),sameThread=Boolean(wallet&&mint&&thread.wallet===wallet&&thread.mint===mint),entrySignature=sameThread?thread.entrySignature:null,exitSignature=sameThread?thread.exitSignature:null;\n  const movieBeat=preEntry?`PRE-ENTRY MARKET CONTEXT · FIRST OBSERVED ENTRY ${formatDate(entryTime)}`:currentEvent?`${text(currentEvent.side??currentEvent.kind??"OBSERVED EVENT").toUpperCase()} · ${formatDate(num(currentEvent.timestamp))}`:"WAITING FOR FIRST INDEXED EVENT";',
    "Replay movie beat",
)
t = replace_once(
    t,
    'useEffect(()=>{if(!playing){if(frameRef.current!==undefined)cancelAnimationFrame(frameRef.current);frameRef.current=undefined;lastFrameRef.current=undefined;return;}const tick=(now:number)=>{const previous=lastFrameRef.current??now,last=now-previous;lastFrameRef.current=now;setCursor(current=>{const next=clamp(current+last/(16_000/speed));if(next>=1)setPlaying(false);return next;});frameRef.current=requestAnimationFrame(tick);};frameRef.current=requestAnimationFrame(tick);return()=>{if(frameRef.current!==undefined)cancelAnimationFrame(frameRef.current);frameRef.current=undefined;lastFrameRef.current=undefined;};},[playing,speed,replayKey]);',
    'useEffect(()=>{if(!playing){if(frameRef.current!==undefined)cancelAnimationFrame(frameRef.current);frameRef.current=undefined;lastFrameRef.current=undefined;return;}const tick=(now:number)=>{const previous=lastFrameRef.current??now,last=now-previous;lastFrameRef.current=now;setCursor(current=>{const ts=start+duration*current,nextObserved=events.find(row=>num(row.timestamp)>ts),gapSeconds=nextObserved?Math.max(0,(num(nextObserved.timestamp)-ts)/1000):0,autoRate=gapSeconds>6*3600?8:gapSeconds>30*60?4:gapSeconds>5*60?2:1,next=clamp(current+(last*autoRate)/(16_000/speed));if(next>=1)setPlaying(false);return next;});frameRef.current=requestAnimationFrame(tick);};frameRef.current=requestAnimationFrame(tick);return()=>{if(frameRef.current!==undefined)cancelAnimationFrame(frameRef.current);frameRef.current=undefined;lastFrameRef.current=undefined;};},[playing,speed,replayKey,start,duration,events]);',
    "Replay pacing",
)
t = replace_once(
    t,
    'useEffect(()=>{if(!wallet||!mint)return;const timer=window.setTimeout(()=>saveResearchThread({wallet,mint,replayCursor:cursor,replaySpeed:speed}),playing?900:120);return()=>window.clearTimeout(timer);},[wallet,mint,cursor,speed,playing]);',
    'useEffect(()=>{if(!wallet||!mint)return;const timer=window.setTimeout(()=>saveResearchThread({chainKey:chainKey||null,wallet,mint,replayCursor:cursor,replaySpeed:speed}),playing?900:120);return()=>window.clearTimeout(timer);},[chainKey,wallet,mint,cursor,speed,playing]);',
    "Replay thread persistence",
)

hydration_old = 'input:{wallets:[wallet],mint,quoteMint,from:Math.floor(start/1000),to:Math.ceil(end/1000),bucketSeconds:Math.max(60,num(windowData.bucketSeconds)||60)}'
hydration_new = 'input:{wallets:[wallet],mint,quoteMint,...(chainKey?{chainKey}:{}),from:Math.floor(start/1000),to:Math.ceil(end/1000),bucketSeconds:Math.max(60,num(windowData.bucketSeconds)||60)}'
t = replace_once(t, hydration_old, hydration_new, "Replay hydration chain")
t = t.replace('},[needsHydration,hydrationAttempts,wallet,mint,quoteMint,start,end,windowData.bucketSeconds]);', '},[needsHydration,hydrationAttempts,chainKey,wallet,mint,quoteMint,start,end,windowData.bucketSeconds]);', 1)

audio = '''  function primeAudio(){if(!soundEnabled)return;try{const Ctx=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Ctx)return;const ctx=audioRef.current??new Ctx();audioRef.current=ctx;if(ctx.state==="suspended")void ctx.resume();}catch{}}
  useEffect(()=>{if(!soundEnabled||!currentEvent)return;const side=text(currentEvent.side).toLowerCase();if(side!=="buy"&&side!=="sell")return;const key=text(currentEvent.id??currentEvent.signature)||`${side}:${num(currentEvent.timestamp)}`;if(lastCueRef.current===key)return;const ctx=audioRef.current;if(!ctx||ctx.state!=="running")return;lastCueRef.current=key;try{const osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;osc.type=side==="buy"?"sine":"sawtooth";osc.frequency.setValueAtTime(side==="buy"?660:210,now);osc.frequency.exponentialRampToValueAtTime(side==="buy"?940:125,now+.13);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.075,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.18);osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+.2);}catch{}},[currentEvent,soundEnabled]);
  useEffect(()=>()=>{try{void audioRef.current?.close();}catch{}},[]);

'''
marker = '  if(!events.length&&!candles.length){'
if "function primeAudio()" not in t:
    if marker not in t:
        raise SystemExit("Replay audio insertion anchor missing")
    t = t.replace(marker, audio + marker, 1)

t = t.replace('saveResearchThread({wallet:eventWallet||prior.wallet,mint:eventMint||prior.mint', 'saveResearchThread({chainKey:chainKey||prior.chainKey||null,wallet:eventWallet||prior.wallet,mint:eventMint||prior.mint', 1)
t = t.replace('const context=saveResearchThread({wallet,mint,replayCursor:cursor,replaySpeed:speed})', 'const context=saveResearchThread({chainKey:chainKey||null,wallet,mint,replayCursor:cursor,replaySpeed:speed})', 1)
t = t.replace('saveResearchThread({wallet,mint,replayCursor:cursor,replaySpeed:speed});requestTradeResearchMode(mode);', 'saveResearchThread({chainKey:chainKey||null,wallet,mint,replayCursor:cursor,replaySpeed:speed});requestTradeResearchMode(mode);', 1)
t = t.replace('<div className="replay-player__status"><b>{playing?"PLAYING TRICKSTER TRADE MOVIE":"PAUSED · DETERMINISTIC STATE"}</b><span>{formatDate(currentTs)} · {Math.round(cursor*100)}%</span></div>', '<div className="replay-player__status"><b>{playing?`PLAYING · AUTO ${cinematicRate}×`:preEntry?"PAUSED · PRE-ENTRY CONTEXT":"PAUSED · DETERMINISTIC STATE"}</b><span>{formatDate(currentTs)} · {Math.round(cursor*100)}%</span></div>', 1)
t = t.replace('onClick={()=>{if(cursor>=1)setCursor(0);setPlaying(value=>!value);}}', 'onClick={()=>{primeAudio();if(cursor>=1)setCursor(0);setPlaying(value=>!value);}}', 1)
share = '<button type="button" onClick={()=>void shareState()}><Share2 size={12}/> SHARE STATE</button>'
if share in t and "SOUND ON" not in t:
    t = t.replace(share, '<button type="button" onClick={()=>{primeAudio();setSoundEnabled(value=>!value);}}>{soundEnabled?"SOUND ON":"SOUND OFF"}</button>' + share, 1)
p.write_text(t)

# Update density expectations.
p = Path("workers/intelligence-replay-bundle.test.mjs")
t = p.read_text()
t = t.replace("assert.equal(adaptiveReplayBucketSeconds(0,10*86400,60),300);", "assert.equal(adaptiveReplayBucketSeconds(0,10*86400,60),3600);")
t = t.replace("assert.equal(adaptiveReplayBucketSeconds(0,90*86400,60),3600);", "assert.equal(adaptiveReplayBucketSeconds(0,90*86400,60),43200);")
p.write_text(t)

# Contract guard for hackathon-critical behavior.
p = Path("scripts/replay-cinematic-contract.test.mjs")
p.write_text('''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { __replayBundleContract, adaptiveReplayBucketSeconds } from "../workers/intelligence-replay-bundle.mjs";

test("Replay keeps seven-day pre-entry context with bounded candle density",()=>{
  assert.equal(__replayBundleContract.sevenDayPreEntryContext,true);
  assert.equal(__replayBundleContract.targetReplayCandles,240);
  assert.equal(adaptiveReplayBucketSeconds(0,7*86400,60),3600);
});

test("Replay UI preserves chain and ties cinematic cues to observed events",()=>{
  const source=readFileSync("src/components/replay-workspace.tsx","utf8");
  assert.match(source,/chainKey=text\\(subject\\.chain\\)/);
  assert.match(source,/PRE-ENTRY MARKET CONTEXT/);
  assert.match(source,/createOscillator/);
  assert.match(source,/currentEvent\\.side/);
  assert.match(source,/AUTO \\${cinematicRate}/);
});
''')

print("Replay upgrade patch applied")
