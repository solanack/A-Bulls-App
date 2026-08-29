export type VoiceHandle = {
  speaking: boolean;
  stop: () => void;
};

type AlienVoiceOptions = {
  muted: boolean;
  volume: number;
  language?: string;
  onBoundary?: (progress: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (sharedAudioContext && sharedAudioContext.state !== "closed") return sharedAudioContext;
  const AudioCtx = globalThis.AudioContext ??
    (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    sharedAudioContext = new AudioCtx({ latencyHint: "interactive" });
    return sharedAudioContext;
  } catch {
    return null;
  }
}

function pickVoice(language = "en") {
  const voices = globalThis.speechSynthesis?.getVoices?.() ?? [];
  const lang = language.toLowerCase();
  const sameLanguage = voices.filter((v) => v.lang?.toLowerCase().startsWith(lang.split("-")[0]));
  const prefer = sameLanguage.find((v) =>
    /male|daniel|george|arthur|guy|david|mark|alex|thomas|google uk english male/i.test(v.name),
  );
  return prefer ?? sameLanguage[0] ?? voices[0] ?? null;
}

/**
 * A quiet procedural "carrier" underneath browser TTS. It does not replace the
 * intelligible speech; it hybridizes it with a non-human subharmonic/metallic bed.
 * Kept entirely client-side so QUERY never needs Worker changes.
 */
function startAlienCarrier(volume: number) {
  const ctx = getAudioContext();
  if (!ctx) return () => {};
  void ctx.resume();

  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(0.058, volume * 0.04));
  master.connect(ctx.destination);

  const low = ctx.createOscillator();
  const lowGain = ctx.createGain();
  low.type = "sine";
  low.frequency.value = 43;
  lowGain.gain.value = 0.76;
  low.connect(lowGain).connect(master);

  const metallic = ctx.createOscillator();
  const band = ctx.createBiquadFilter();
  const metalGain = ctx.createGain();
  metallic.type = "triangle";
  metallic.frequency.value = 167;
  band.type = "bandpass";
  band.frequency.value = 640;
  band.Q.value = 6.2;
  metalGain.gain.value = 0.2;
  metallic.connect(band).connect(metalGain).connect(master);

  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.type = "sine";
  shimmer.frequency.value = 917;
  shimmerGain.gain.value = 0.02;
  shimmer.connect(shimmerGain).connect(master);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 3.8;
  lfoGain.gain.value = 84;
  lfo.connect(lfoGain).connect(band.frequency);

  try {
    low.start();
    metallic.start();
    shimmer.start();
    lfo.start();
  } catch {
    return () => {};
  }

  return () => {
    const now = ctx.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
      low.stop(now + 0.02);
      metallic.stop(now + 0.02);
      shimmer.stop(now + 0.02);
      lfo.stop(now + 0.02);
    } catch {
      // Nodes may already be stopped after an interrupted query.
    }
  };
}

export function unlockSpeech() {
  const audioContext = getAudioContext();
  if (audioContext?.state === "suspended") void audioContext.resume();
  if (!globalThis.speechSynthesis) return;
  globalThis.speechSynthesis.cancel();
  const warm = new SpeechSynthesisUtterance(" ");
  warm.volume = 0;
  warm.rate = 1;
  globalThis.speechSynthesis.speak(warm);
  globalThis.speechSynthesis.cancel();
}

export function speakText(text: string, options: AlienVoiceOptions): VoiceHandle {
  const synth = globalThis.speechSynthesis;
  if (!synth || options.muted || !text.trim()) {
    options.onEnd?.();
    return { speaking: false, stop() {} };
  }

  synth.cancel();
  const language = options.language ?? "en-US";
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  // Intelligible English, but deliberately lower, slower and less conventionally human.
  utterance.rate = 0.78;
  utterance.pitch = 0.42;
  utterance.volume = options.volume;
  const voice = pickVoice(language);
  if (voice) utterance.voice = voice;

  let stopped = false;
  let stopCarrier = () => {};
  utterance.onstart = () => {
    stopCarrier = startAlienCarrier(options.volume);
    options.onStart?.();
  };
  utterance.onboundary = (event) => {
    const char = event.charIndex ?? 0;
    options.onBoundary?.(text.length ? char / text.length : 0);
  };
  utterance.onend = () => {
    stopCarrier();
    if (!stopped) options.onEnd?.();
  };
  utterance.onerror = () => {
    stopCarrier();
    if (!stopped) options.onEnd?.();
  };
  synth.speak(utterance);

  return {
    speaking: true,
    stop() {
      stopped = true;
      stopCarrier();
      synth.cancel();
    },
  };
}
