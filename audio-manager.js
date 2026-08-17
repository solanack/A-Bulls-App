/* Web Audio procedural SFX – no external files required */
(function (global) {
  'use strict';
  let ctx = null;
  let master = null;
  let sfxGain = null;
  let musicGain = null;
  let unlocked = false;
  let shipOscillator = null;
  let shipGain = null;
  let shipFilter = null;
  let lastClashAt = 0;
  let lastEnemyImpactAt = 0;
  let lastBossImpactAt = 0;
  let lastEnemyKillAt = 0;
  let noiseBuffer = null;
  let impactVoices = 0;
  let recordingBridge = null;

  const settings = {
    masterOn: true,
    masterVol: 0.7,
    musicOn: true,
    musicVol: 0.35,
    sfxOn: true,
    sfxVol: 0.8
  };

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain.connect(master);
    musicGain.connect(master);
    master.connect(ctx.destination);
    applyGains();
    return ctx;
  }

  function applyGains() {
    if (!master) return;
    master.gain.value = settings.masterOn ? settings.masterVol : 0;
    if (sfxGain) sfxGain.gain.value = settings.sfxOn ? settings.sfxVol : 0;
    if (musicGain) musicGain.gain.value = settings.musicOn ? settings.musicVol : 0;
  }

  async function unlock() {
    const c = ensure();
    if (!c) return false;
    if (c.state === 'suspended') await c.resume();
    unlocked = true;
    return true;
  }

  function beep(freq, dur, type, vol, dest) {
    if (!settings.masterOn || !unlocked) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest || sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function sweep(startFreq, endFreq, dur, type = 'sawtooth', vol = 0.1) {
    if (!settings.masterOn || !settings.sfxOn || !unlocked) return;
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime, oscillator = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter();
    oscillator.type = type; oscillator.frequency.setValueAtTime(startFreq, t0); oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t0 + dur);
    filter.type = 'bandpass'; filter.frequency.setValueAtTime(1800, t0); filter.Q.value = 1.4;
    gain.gain.setValueAtTime(0.0001, t0); gain.gain.exponentialRampToValueAtTime(vol, t0 + .006); gain.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    oscillator.connect(filter).connect(gain).connect(sfxGain); oscillator.start(t0); oscillator.stop(t0 + dur + .02);
  }

  function bullCall() {
    if (!settings.masterOn || !settings.sfxOn || !unlocked) return;
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime, filter = c.createBiquadFilter(), gain = c.createGain();
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(420, t0); filter.frequency.exponentialRampToValueAtTime(150, t0 + .42);
    gain.gain.setValueAtTime(.0001, t0); gain.gain.exponentialRampToValueAtTime(.19, t0 + .025); gain.gain.exponentialRampToValueAtTime(.0001, t0 + .46);
    filter.connect(gain).connect(sfxGain);
    [['sawtooth', 118, 49], ['triangle', 176, 74]].forEach(([type, start, end], index) => {
      const oscillator = c.createOscillator(); oscillator.type = type; oscillator.detune.value = index ? -12 : 9;
      oscillator.frequency.setValueAtTime(start, t0); oscillator.frequency.exponentialRampToValueAtTime(end, t0 + .42);
      oscillator.connect(filter); oscillator.start(t0); oscillator.stop(t0 + .48);
    });
  }

  function explosionNoise(duration = .16, volume = .11, cutoff = 780) {
    if (!settings.masterOn || !settings.sfxOn || !unlocked) return;
    const c = ensure(); if (!c) return;
    if (!noiseBuffer || noiseBuffer.sampleRate !== c.sampleRate) {
      noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      for (let index = 0; index < channel.length; index++) channel[index] = Math.random() * 2 - 1;
    }
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain(), t0 = c.currentTime;
    source.buffer = noiseBuffer; source.playbackRate.value = .86 + Math.random() * .28;
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoff, t0); filter.frequency.exponentialRampToValueAtTime(90, t0 + duration);
    gain.gain.setValueAtTime(.0001, t0); gain.gain.exponentialRampToValueAtTime(volume, t0 + .008); gain.gain.exponentialRampToValueAtTime(.0001, t0 + duration);
    source.connect(filter).connect(gain).connect(sfxGain); source.start(t0, Math.random() * .5, Math.min(.48, duration)); source.stop(t0 + duration + .02);
  }

  function impactTone(base = 360, duration = .12, volume = .05) {
    if (!settings.masterOn || !settings.sfxOn || !unlocked || impactVoices >= 6) return;
    const c = ensure(); if (!c) return;
    impactVoices++;
    const t0 = c.currentTime, filter = c.createBiquadFilter(), gain = c.createGain();
    filter.type = 'bandpass'; filter.frequency.setValueAtTime(base * 2.8, t0); filter.frequency.exponentialRampToValueAtTime(Math.max(90, base * .65), t0 + duration); filter.Q.value = 1.1;
    gain.gain.setValueAtTime(.0001, t0); gain.gain.exponentialRampToValueAtTime(volume, t0 + .004); gain.gain.exponentialRampToValueAtTime(.0001, t0 + duration);
    const voices = [['triangle', 1], ['sine', 1.52]];
    voices.forEach(([type, ratio], index) => {
      const oscillator = c.createOscillator(); oscillator.type = type; oscillator.detune.value = index ? 7 : -5;
      oscillator.frequency.setValueAtTime(base * ratio, t0); oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, base * ratio * .48), t0 + duration);
      oscillator.connect(filter); oscillator.start(t0); oscillator.stop(t0 + duration + .02);
      if (index === voices.length - 1) oscillator.onended = () => { impactVoices = Math.max(0, impactVoices - 1); };
    });
    filter.connect(gain).connect(sfxGain);
  }

  function shipMovement(amount = .1) {
    if (!settings.masterOn || !settings.sfxOn || !unlocked) return;
    const c = ensure(); if (!c) return;
    if (!shipOscillator) {
      shipOscillator = c.createOscillator(); shipGain = c.createGain(); shipFilter = c.createBiquadFilter();
      shipOscillator.type = 'sawtooth'; shipOscillator.frequency.value = 58;
      shipFilter.type = 'lowpass'; shipFilter.frequency.value = 280; shipFilter.Q.value = 1.8;
      shipGain.gain.value = .0001; shipOscillator.connect(shipFilter).connect(shipGain).connect(sfxGain); shipOscillator.start();
    }
    const energy = Math.max(0, Math.min(1, Number(amount) || 0));
    shipOscillator.frequency.setTargetAtTime(55 + energy * 48, c.currentTime, .045);
    shipFilter.frequency.setTargetAtTime(220 + energy * 430, c.currentTime, .055);
    shipGain.gain.setTargetAtTime(.008 + energy * .026, c.currentTime, .06);
  }
  function stopShipMovement() {
    if (!ctx || !shipGain) return;
    shipGain.gain.setTargetAtTime(.0001, ctx.currentTime, .045);
  }

  const POWER_STINGERS = Object.freeze({
    rapid: [1180, 1520, 'square'], spread: [540, 890, 'triangle'], shield: [190, 1320, 'sine'],
    overdrive: [220, 760, 'sawtooth'], magnet: [410, 620, 'sine'], nova: [880, 1760, 'triangle'],
    doubleTrinity: [620, 1040, 'square'], triangle: [720, 1280, 'triangle'], twin: [330, 660, 'sine'],
    trinity: [390, 1170, 'triangle'], railgun: [1560, 120, 'sawtooth'], plasma: [760, 260, 'square'],
    homing: [520, 1420, 'sine'], bomb: [160, 72, 'square'], bomb2: [230, 58, 'sawtooth']
  });
  function powerStinger(id, phase = 'activate') {
    const cue = POWER_STINGERS[id] || [520, 780, 'sine'];
    const gain = phase === 'pickup' ? .055 : .085;
    sweep(cue[0], cue[1], phase === 'pickup' ? .11 : .19, cue[2], gain);
    if (phase !== 'pickup') setTimeout(() => beep(Math.max(80, cue[1] * 1.25), .09, cue[2], .045), 72);
  }

  const SFX = {
    ui() { if (!settings.sfxOn) return; beep(880, 0.05, 'square', 0.08); },
    jump() { if (!settings.sfxOn) return; beep(220, 0.08, 'triangle', 0.15); beep(330, 0.06, 'square', 0.08); },
    bullJump() { bullCall(); },
    doubleJump() { if (!settings.sfxOn) return; beep(280, 0.07, 'triangle', 0.12); beep(420, 0.08, 'square', 0.1); },
    charge() { if (!settings.sfxOn) return; beep(660, 0.06, 'sine', 0.12); beep(990, 0.08, 'sine', 0.08); },
    stomp() { if (!settings.sfxOn) return; beep(90, 0.12, 'sawtooth', 0.18); },
    laser() { if (!settings.sfxOn) return; beep(1200, 0.15, 'sawtooth', 0.1); },
    pew() { sweep(1900, 240, .13, 'sawtooth', .085); setTimeout(() => sweep(1250, 180, .085, 'square', .035), 28); },
    projectileClash() { const now = performance.now(); if (now - lastClashAt < 45) return; lastClashAt = now; explosionNoise(.09, .05, 1280); impactTone(720, .07, .032); },
    enemyImpact() { const now = performance.now(); if (now - lastEnemyImpactAt < 55) return; lastEnemyImpactAt = now; explosionNoise(.105, .064, 980); impactTone(430, .085, .038); },
    bossImpact() { const now = performance.now(); if (now - lastBossImpactAt < 42) return; lastBossImpactAt = now; explosionNoise(.13, .078, 760); impactTone(280, .13, .055); },
    enemyKill() { const now = performance.now(); if (now - lastEnemyKillAt < 34) return; lastEnemyKillAt = now; explosionNoise(.18, .11, 720); sweep(620, 76, .18, 'square', .105); impactTone(190, .16, .065); },
    bossKill() { explosionNoise(.48, .17, 540); sweep(1250, 44, .68, 'sawtooth', .17); impactTone(145, .42, .1); [0, 95, 190, 285].forEach((delay, i) => setTimeout(() => beep(130 + i * 64, .2, i % 2 ? 'triangle' : 'square', .1), delay)); },
    extraLife() { if (!settings.sfxOn) return; beep(523, .07, 'triangle', .11); setTimeout(() => beep(659, .07, 'triangle', .11), 65); setTimeout(() => beep(988, .16, 'sine', .1), 130); },
    solana() { if (!settings.sfxOn) return; beep(520, 0.1, 'sine', 0.12); beep(780, 0.12, 'sine', 0.1); },
    phantom() { if (!settings.sfxOn) return; beep(180, 0.2, 'triangle', 0.1); },
    super() { if (!settings.sfxOn) return; beep(150, 0.15, 'sawtooth', 0.14); beep(300, 0.2, 'square', 0.1); },
    hit() { if (!settings.sfxOn) return; beep(70, 0.25, 'sawtooth', 0.2); },
    gameOver() { if (!settings.sfxOn) return; beep(200, 0.15, 'triangle', 0.12); beep(120, 0.25, 'sine', 0.12); },
    start() { if (!settings.sfxOn) return; beep(440, 0.08, 'square', 0.1); beep(660, 0.1, 'square', 0.1); },
    success() { if (!settings.sfxOn) return; beep(523, 0.08, 'sine', 0.1); beep(784, 0.12, 'sine', 0.1); },
    warn() { if (!settings.sfxOn) return; beep(300, 0.12, 'square', 0.1); },
    bearEntry(pattern = '') {
      const offset = String(pattern).length % 5 * 24;
      sweep(180 + offset, 72, .24, 'sawtooth', .055);
      setTimeout(() => beep(116 + offset / 2, .12, 'triangle', .045), 75);
    },
    bossPhase(kind = 'meme') {
      const base = kind === 'bull' ? 82 : 126;
      explosionNoise(kind === 'bull' ? .36 : .24, .11, kind === 'bull' ? 420 : 690);
      [0, 85, 170].forEach((delay, index) => setTimeout(() => beep(base * (index + 1), .18, index % 2 ? 'square' : 'sawtooth', .075), delay));
    },
    nearMiss() { sweep(820, 1680, .105, 'triangle', .038); },
    combo(count = 5) {
      const base = 420 + Math.min(20, Number(count) || 0) * 12;
      [0, 55, 110].forEach((delay, index) => setTimeout(() => beep(base * (1 + index * .22), .09, 'square', .055), delay));
    },
    capture() {
      explosionNoise(.34, .12, 520);
      [196, 294, 440, 659].forEach((frequency, index) => setTimeout(() => beep(frequency, .16, index < 2 ? 'triangle' : 'sine', .08), index * 72));
    },
    power(id, phase) { powerStinger(id, phase); },
    epochVictory() { [392, 523, 659, 988].forEach((frequency, index) => setTimeout(() => beep(frequency, .2, index < 2 ? 'triangle' : 'sine', .09), index * 90)); },
    shipUnlock() { sweep(180, 1680, .52, 'sawtooth', .095); setTimeout(() => beep(1318, .24, 'sine', .08), 360); },
    shipMove(amount) { shipMovement(amount); },
    shipStop() { stopShipMovement(); }
  };

  let musicTimer = null;
  function startMusic() {
    stopMusic();
    if (!settings.musicOn || !settings.masterOn) return;
    const c = ensure();
    if (!c || !unlocked) return;
    const tick = () => {
      if (!settings.musicOn || !unlocked) return;
      beep(55, 0.15, 'sawtooth', 0.04, musicGain);
      beep(82.5, 0.1, 'triangle', 0.03, musicGain);
      musicTimer = setTimeout(tick, 480);
    };
    tick();
  }
  function stopMusic() {
    if (musicTimer) clearTimeout(musicTimer);
    musicTimer = null;
  }

  function createRecordingStream() {
    const c = ensure();
    if (!c?.createMediaStreamDestination || !master) return null;
    if (recordingBridge) {
      try { master.disconnect(recordingBridge.destination); } catch (_) {}
      recordingBridge.stream.getTracks().forEach(track => track.stop());
      recordingBridge = null;
    }
    const destination = c.createMediaStreamDestination();
    master.connect(destination);
    const bridge = {
      destination,
      stream: destination.stream,
      stop() {
        if (recordingBridge !== bridge) return;
        try { master.disconnect(destination); } catch (_) {}
        destination.stream.getTracks().forEach(track => track.stop());
        recordingBridge = null;
      }
    };
    recordingBridge = bridge;
    return bridge;
  }

  global.AudioManager = {
    unlock,
    settings,
    applyGains,
    createRecordingStream,
    sfx: SFX,
    startMusic,
    stopMusic,
    loadFromProfile(p) {
      if (!p || !p.settings) return;
      if (p.settings.sound === false) settings.masterOn = false;
      if (typeof p.settings.masterVol === 'number') settings.masterVol = p.settings.masterVol;
      if (typeof p.settings.musicOn === 'boolean') settings.musicOn = p.settings.musicOn;
      if (typeof p.settings.sfxOn === 'boolean') settings.sfxOn = p.settings.sfxOn;
      applyGains();
    },
    saveToProfile(p) {
      p.settings = p.settings || {};
      p.settings.sound = settings.masterOn;
      p.settings.masterVol = settings.masterVol;
      p.settings.musicOn = settings.musicOn;
      p.settings.sfxOn = settings.sfxOn;
    }
  };
})(window);
