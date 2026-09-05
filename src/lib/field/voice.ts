import { synthesizeAlienVoice, type AlienVoiceAlignment } from "@/lib/alien-voice";

export type VoiceHandle = {
  speaking: boolean;
  stop: () => void;
};

type AlienVoiceOptions = {
  muted: boolean;
  volume: number;
  language?: string;
  onBoundary?: (progress: number) => void;
  onEnergy?: (energy: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (sharedAudioContext && sharedAudioContext.state !== "closed") return sharedAudioContext;
  const AudioCtx =
    globalThis.AudioContext ??
    (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
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
  const sameLanguage = voices.filter((voice) =>
    voice.lang?.toLowerCase().startsWith(lang.split("-")[0]),
  );
  const preferred = sameLanguage.find((voice) =>
    /male|daniel|george|arthur|guy|david|mark|alex|thomas|google uk english male/i.test(voice.name),
  );
  return preferred ?? sameLanguage[0] ?? voices[0] ?? null;
}

/** A quiet resonant biological carrier; intelligibility always comes from speech. */
function startAlienCarrier(volume: number) {
  const ctx = getAudioContext();
  if (!ctx) return () => {};
  void ctx.resume();
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(0.032, volume * 0.026));
  master.connect(ctx.destination);

  const low = ctx.createOscillator();
  const lowGain = ctx.createGain();
  low.type = "sine";
  low.frequency.value = 41;
  lowGain.gain.value = 0.65;
  low.connect(lowGain).connect(master);

  const metallic = ctx.createOscillator();
  const band = ctx.createBiquadFilter();
  const metalGain = ctx.createGain();
  metallic.type = "triangle";
  metallic.frequency.value = 163;
  band.type = "bandpass";
  band.frequency.value = 710;
  band.Q.value = 7.2;
  metalGain.gain.value = 0.14;
  metallic.connect(band).connect(metalGain).connect(master);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 3.1;
  lfoGain.gain.value = 72;
  lfo.connect(lfoGain).connect(band.frequency);
  low.start();
  metallic.start();
  lfo.start();

  return () => {
    const now = ctx.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      low.stop(now + 0.04);
      metallic.stop(now + 0.04);
      lfo.stop(now + 0.04);
    } catch {
      // Already stopped by an interrupted query.
    }
  };
}

function base64Bytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function makeDarkImpulse(ctx: AudioContext) {
  const length = Math.floor(ctx.sampleRate * 0.72);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 3.4);
      data[i] = (Math.random() * 2 - 1) * decay * (channel ? 0.82 : 1);
    }
  }
  return impulse;
}

function scheduleAlignment(
  alignment: AlienVoiceAlignment | null,
  options: AlienVoiceOptions,
  timers: ReturnType<typeof setTimeout>[],
) {
  if (!alignment) return;
  for (let i = 0; i < alignment.characters.length; i += 2) {
    if (!alignment.characters[i]?.trim()) continue;
    const delay = Math.max(0, alignment.starts[i] * 1000);
    timers.push(
      globalThis.setTimeout(() => options.onBoundary?.(i / alignment.characters.length), delay),
    );
  }
}

function playBrowserVoice(
  text: string,
  options: AlienVoiceOptions,
  isStopped: () => boolean,
  finish: () => void,
  setStop: (stop: () => void) => void,
) {
  const synth = globalThis.speechSynthesis;
  if (!synth || isStopped()) return false;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.language ?? "en-US";
  utterance.rate = 0.8;
  utterance.pitch = 0.48;
  utterance.volume = options.volume;
  const voice = pickVoice(utterance.lang);
  if (voice) utterance.voice = voice;
  let stopCarrier = () => {};
  utterance.onstart = () => {
    if (isStopped()) return;
    stopCarrier = startAlienCarrier(options.volume);
    options.onStart?.();
  };
  utterance.onboundary = (event) => {
    const progress = text.length ? (event.charIndex ?? 0) / text.length : 0;
    options.onBoundary?.(progress);
    options.onEnergy?.(0.58);
    globalThis.setTimeout(() => !isStopped() && options.onEnergy?.(0.12), 85);
  };
  utterance.onend = () => {
    stopCarrier();
    finish();
  };
  utterance.onerror = () => {
    stopCarrier();
    finish();
  };
  setStop(() => {
    stopCarrier();
    synth.cancel();
  });
  synth.speak(utterance);
  return true;
}

export function unlockSpeech() {
  const audioContext = getAudioContext();
  if (audioContext?.state === "suspended") void audioContext.resume();
  if (!globalThis.speechSynthesis) return;
  globalThis.speechSynthesis.cancel();
  const warm = new SpeechSynthesisUtterance(" ");
  warm.volume = 0;
  globalThis.speechSynthesis.speak(warm);
  globalThis.speechSynthesis.cancel();
}

export function speakText(text: string, options: AlienVoiceOptions): VoiceHandle {
  let stopped = false;
  let ended = false;
  let activeStop = () => {};
  let animationFrame = 0;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const handle: VoiceHandle = {
    speaking: !options.muted && Boolean(text.trim()),
    stop() {
      if (stopped) return;
      stopped = true;
      handle.speaking = false;
      activeStop();
      cancelAnimationFrame(animationFrame);
      for (const timer of timers) clearTimeout(timer);
      options.onEnergy?.(0);
    },
  };
  const finish = () => {
    if (ended || stopped) return;
    ended = true;
    handle.speaking = false;
    cancelAnimationFrame(animationFrame);
    for (const timer of timers) clearTimeout(timer);
    options.onEnergy?.(0);
    options.onEnd?.();
  };

  if (!handle.speaking) {
    options.onEnd?.();
    return handle;
  }

  void (async () => {
    const delivery = await synthesizeAlienVoice({ data: { text } });
    if (stopped) return;
    const ctx = getAudioContext();
    if (!delivery.ok || !delivery.audioBase64 || !ctx) {
      playBrowserVoice(
        text,
        options,
        () => stopped,
        finish,
        (stop) => {
          activeStop = stop;
        },
      );
      return;
    }

    try {
      await ctx.resume();
      const audio = await ctx.decodeAudioData(base64Bytes(delivery.audioBase64));
      if (stopped) return;
      const source = ctx.createBufferSource();
      source.buffer = audio;
      source.playbackRate.value = 0.965;

      const dry = ctx.createGain();
      dry.gain.value = 0.82;
      const delay = ctx.createDelay(0.2);
      delay.delayTime.value = 0.036;
      const resonance = ctx.createBiquadFilter();
      resonance.type = "bandpass";
      resonance.frequency.value = 760;
      resonance.Q.value = 1.7;
      const resonanceGain = ctx.createGain();
      resonanceGain.gain.value = 0.11;
      const convolver = ctx.createConvolver();
      convolver.buffer = makeDarkImpulse(ctx);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.075;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -19;
      compressor.knee.value = 16;
      compressor.ratio.value = 3.2;
      const master = ctx.createGain();
      master.gain.value = options.volume;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.68;

      source.connect(dry).connect(compressor);
      source.connect(delay).connect(resonance).connect(resonanceGain).connect(compressor);
      source.connect(convolver).connect(reverbGain).connect(compressor);
      compressor.connect(master).connect(analyser).connect(ctx.destination);

      const samples = new Uint8Array(analyser.fftSize);
      const energyTick = () => {
        if (stopped || ended) return;
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) {
          const centered = (value - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / samples.length);
        options.onEnergy?.(Math.max(0, Math.min(1, (rms - 0.012) * 6.8)));
        animationFrame = requestAnimationFrame(energyTick);
      };
      source.onended = finish;
      activeStop = () => {
        try {
          source.stop();
        } catch {
          // Already stopped.
        }
        source.disconnect();
      };
      scheduleAlignment(delivery.alignment, options, timers);
      options.onStart?.();
      source.start();
      energyTick();
    } catch {
      if (!stopped) {
        playBrowserVoice(
          text,
          options,
          () => stopped,
          finish,
          (stop) => {
            activeStop = stop;
          },
        );
      }
    }
  })();

  return handle;
}
