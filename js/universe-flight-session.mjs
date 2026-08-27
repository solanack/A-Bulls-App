import {planFlightDestination,destinationPrompt} from './universe-flight-destination.mjs';
import {projectionToFlightSector,replayToFlightTimeline,flightMarketStateFromReplay} from './universe-flight-sector.mjs';
import {createFlightRecorder,recordingToMovieInputs} from './universe-flight-recorder.mjs';
import {buildTricksterDirectorCues} from './trickster-universe-director.mjs';
import {buildTradeMovieDraft} from './trade-movie-manifest.mjs';

const s=v=>String(v??'').trim();

export function createUniverseFlightSession(options={}){
  const recorder=createFlightRecorder(options.recorder||{});
  const state={destination:null,plan:null,sector:null,replay:null,timeline:[],directorCues:[],recording:null};
  return Object.freeze({
    planDestination(query,context={}){state.plan=planFlightDestination({query},context);return Object.freeze({...state.plan,prompt:destinationPrompt(state.plan)});},
    lockDestination(destination){if(!destination?.id&&!destination?.query)throw new TypeError('destination id required');state.destination=Object.freeze({...destination,id:s(destination.id||destination.query)});return state.destination;},
    loadProjection(items=[],projectionOptions={}){state.sector=projectionToFlightSector(items,{...projectionOptions,subjectId:projectionOptions.subjectId||state.destination?.id});return state.sector;},
    loadReplay(bundle={}){state.replay=bundle;state.timeline=replayToFlightTimeline(bundle);state.directorCues=buildTricksterDirectorCues(state.timeline);return Object.freeze({timeline:state.timeline,market:flightMarketStateFromReplay(bundle),directorCues:state.directorCues});},
    startRecording(at){return recorder.start(at);},
    sampleFlight(frame,at){return recorder.sample(frame,at);},
    cue(type,payload,at){return recorder.cue(type,payload,at);},
    attachEvidence(receipt){return recorder.attachEvidence(receipt);},
    stopRecording(at){state.recording=recorder.stop(at);return state.recording;},
    buildMovie({id,storyType='custom',subject,coverage}={}){if(!state.recording)throw new Error('recording_required');const inputs=recordingToMovieInputs(state.recording);return buildTradeMovieDraft({id,storyType,subject:subject||state.destination||{kind:'unknown',id:'unknown'},evidence:inputs.evidence,flightPath:inputs.flightPath,replayEvents:inputs.replayEvents,coverage});},
    snapshot(){return Object.freeze({destination:state.destination,plan:state.plan,sector:state.sector,replayLoaded:Boolean(state.replay),timelineCount:state.timeline.length,directorCueCount:state.directorCues.length,recording:state.recording});}
  });
}

export const __universeFlightSessionContract=Object.freeze({networkInjectedExternally:true,clientPhysicsIndependent:true,replayAndCreatorComposable:true});
