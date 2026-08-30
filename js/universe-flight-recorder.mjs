const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;

export function createFlightRecorder(options={}){
  const maxFrames=Math.max(120,Math.min(12000,Math.trunc(n(options.maxFrames)||3600)));
  const sampleMs=Math.max(33,Math.min(1000,Math.trunc(n(options.sampleMs)||100)));
  const state={startedAt:0,lastSampleAt:0,frames:[],cues:[],evidence:new Map(),active:false};
  return Object.freeze({
    start(at=Date.now()){state.startedAt=n(at)||Date.now();state.lastSampleAt=0;state.frames.length=0;state.cues.length=0;state.evidence.clear();state.active=true;return state.startedAt;},
    sample(frame={},at=Date.now()){if(!state.active||state.frames.length>=maxFrames)return false;const t=n(at)||Date.now();if(state.lastSampleAt&&t-state.lastSampleAt<sampleMs)return false;state.lastSampleAt=t;state.frames.push(Object.freeze({t:Math.max(0,t-state.startedAt),x:n(frame.x),y:n(frame.y),a:n(frame.a),vx:n(frame.vx),vy:n(frame.vy),cameraX:n(frame.cameraX??frame.x),cameraY:n(frame.cameraY??frame.y),zoom:n(frame.zoom)||1}));return true;},
    cue(type,payload={},at=Date.now()){if(!state.active)return null;const cue=Object.freeze({t:Math.max(0,(n(at)||Date.now())-state.startedAt),type:s(type)||'event',payload:{...payload}});state.cues.push(cue);return cue;},
    attachEvidence(receipt={}){const id=s(receipt.id);if(!id)throw new TypeError('evidence id required');if(!receipt.signature&&!receipt.sourceReference&&!receipt.archiveReference)throw new TypeError('evidence source required');state.evidence.set(id,Object.freeze({...receipt,id}));return id;},
    stop(at=Date.now()){state.active=false;return Object.freeze({schemaVersion:'universe-flight-recording-v1',startedAt:state.startedAt,endedAt:n(at)||Date.now(),sampleMs,frames:Object.freeze([...state.frames]),cues:Object.freeze([...state.cues]),evidence:Object.freeze([...state.evidence.values()])});},
    get active(){return state.active;},get frameCount(){return state.frames.length;},get cueCount(){return state.cues.length;}
  });
}

export function recordingToMovieInputs(recording={}){
  const flightPath=(recording.frames||[]).map(f=>({t:f.t,x:f.x,y:f.y,a:f.a,cameraX:f.cameraX,cameraY:f.cameraY,zoom:f.zoom}));
  const replayEvents=(recording.cues||[]).filter(c=>c.type==='replay-event'||c.type==='trade-event').map(c=>({t:c.t,evidenceId:s(c.payload?.evidenceId),...c.payload}));
  return Object.freeze({flightPath:Object.freeze(flightPath),replayEvents:Object.freeze(replayEvents),evidence:Object.freeze([...(recording.evidence||[])])});
}

export const __flightRecorderContract=Object.freeze({clientOnly:true,boundedFrames:true,defaultSampleMs:100,defaultMaxFrames:3600,storesReferencesNotBlockchainCopies:true});

