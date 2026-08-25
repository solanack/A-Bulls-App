const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));

export function cueToneSpec(cue={}){
  switch(cue.kind){
    case 'buy-impact':return Object.freeze({wave:'triangle',frequency:880,endFrequency:1320,duration:.16,gain:.18});
    case 'sell-impact':return Object.freeze({wave:'sawtooth',frequency:360,endFrequency:170,duration:.19,gain:.16});
    case 'simulation-impact':return Object.freeze({wave:'square',frequency:620,endFrequency:820,duration:.18,gain:.11});
    case 'simulation-transition':return Object.freeze({wave:'sine',frequency:520,endFrequency:700,duration:.28,gain:.09});
    default:return Object.freeze({wave:'sine',frequency:240,endFrequency:320,duration:.22,gain:.075});
  }
}

function scheduleTone(context,destination,cue){
  const spec=cueToneSpec(cue),start=Math.max(0,Number(cue.time)||0),end=start+spec.duration;
  const oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type=spec.wave;
  oscillator.frequency.setValueAtTime(spec.frequency,start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,spec.endFrequency),end);
  gain.gain.setValueAtTime(0,start);
  gain.gain.linearRampToValueAtTime(spec.gain,start+Math.min(.018,spec.duration*.2));
  gain.gain.exponentialRampToValueAtTime(.0001,end);
  oscillator.connect(gain);gain.connect(destination);
  oscillator.start(start);oscillator.stop(end+.01);
}

export async function renderTricksterAudioBuffer(plan={}, {
  OfflineAudioContextClass=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext,
  sampleRate=48000,
  numberOfChannels=2
}={}){
  if(typeof OfflineAudioContextClass!=='function')return null;
  const duration=Math.max(.25,Number(plan.durationSeconds)||0)+.35,length=Math.max(1,Math.ceil(duration*sampleRate));
  let context;
  try{context=new OfflineAudioContextClass(numberOfChannels,length,sampleRate);}catch{return null;}
  const master=context.createGain();master.gain.setValueAtTime(.86,0);master.connect(context.destination);
  for(const cue of plan.cues||[])scheduleTone(context,master,cue);
  try{return await context.startRendering();}catch{return null;}
}

export function audioCueMixInfo(plan={},audioBuffer=null){
  return Object.freeze({cueCount:(plan.cues||[]).length,durationSeconds:Number(plan.durationSeconds)||0,embedded:Boolean(audioBuffer),sampleRate:audioBuffer?.sampleRate||null,channels:audioBuffer?.numberOfChannels||null});
}
