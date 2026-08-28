/* Shared media background manager for the menu and game runtime. */
(function (global) {
  'use strict';

  const TYPES = Object.freeze({ DEFAULT: 'default', IMAGE: 'image', GIF: 'gif', LOCAL_VIDEO: 'local-video', YOUTUBE: 'youtube', TWITCH: 'twitch' });
  const DB_NAME = 'bbrs-media-v3';
  const STORE = 'blobs';
  const YOUTUBE_RESUME_KEY = 'bbrs_youtube_resume_v1';
  const DEFAULT_YOUTUBE_URLS = Object.freeze([
    'https://youtu.be/MagELQywiGI?si=3mp73nRD7naz3jyy'
  ]);
  const DEFAULT_TWITCH_URL = 'https://www.twitch.tv/fazebanks/v/2839051235?sr=a';
  const LEGACY_DEFAULT_YOUTUBE_IDS = new Set([
    'RDATgrd7XflbW9zdF9yZWNlbnQ',
    'PL3-sRm8xAzY-556lOpSGH6wVzyofoGpzU',
    'pgm6QfpSlJI'
  ]);
  const targets = {
    menu: { layer: 'menuMediaLayer', image: 'menuImageBackground', video: 'menuVideoBackground', scene: 'menuMediaScene', host: 'menuMediaPlayerHost' },
    invaders: { layer: 'invadersMediaLayer', image: 'invadersImageBackground', video: 'invadersVideoBackground', scene: 'invadersMediaScene', host: 'invadersMediaPlayerHost', sound: 'invadersMediaSound', status: 'invadersMediaStatus' }
  };
  let dbPromise;
  let youtubeApiPromise;
  let twitchScript;
  let listeningTarget = null;
  let resumeTimer = 0;
  const objectUrls = new Map();
  const youtubePlayers = new Map();
  const twitchPlayers = new Map();

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }
  async function idb(method, key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, method === 'get' ? 'readonly' : 'readwrite');
      const request = method === 'put' ? tx.objectStore(STORE).put(value, key)
        : method === 'delete' ? tx.objectStore(STORE).delete(key)
        : tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  const readDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

  function parseYouTubeId(input) {
    const value = String(input || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
    try {
      const url = new URL(value);
      if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
      if (/(^|\.)youtube(?:-nocookie)?\.com$/i.test(url.hostname)) {
        return url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/)?.[1] || null;
      }
    } catch (_) {}
    return null;
  }
  function validPlaylistId(value) {
    return /^(?:PL|RD|UU|OLAK5uy_)[A-Za-z0-9_-]{8,72}$/.test(String(value || ''));
  }
  function normalizeYouTubeSource(source) {
    if (!source) return null;
    if (typeof source === 'object') {
      const kind = source.kind === 'playlist' ? 'playlist' : source.kind === 'video' ? 'video' : null;
      const id = String(source.id || '').trim();
      if (kind === 'video' && /^[A-Za-z0-9_-]{11}$/.test(id)) return { kind, id, key: `video:${id}`, url: `https://www.youtube.com/watch?v=${id}` };
      if (kind === 'playlist' && validPlaylistId(id)) return { kind, id, key: `playlist:${id}`, url: `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}` };
      return null;
    }
    const value = String(source).trim();
    if (!value) return null;
    if (/^[A-Za-z0-9_-]{11}$/.test(value)) return normalizeYouTubeSource({ kind: 'video', id: value });
    if (validPlaylistId(value)) return normalizeYouTubeSource({ kind: 'playlist', id: value });
    try {
      const url = new URL(value);
      if (url.hostname === 'youtu.be') return normalizeYouTubeSource({ kind: 'video', id: url.pathname.split('/').filter(Boolean)[0] });
      if (!/(^|\.)youtube(?:-nocookie)?\.com$/i.test(url.hostname)) return null;
      const playlistId = url.searchParams.get('list');
      if (validPlaylistId(playlistId)) return normalizeYouTubeSource({ kind: 'playlist', id: playlistId });
      const videoId = url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/)?.[1];
      return normalizeYouTubeSource({ kind: 'video', id: videoId });
    } catch (_) { return null; }
  }
  function parseYouTubeSources(input) {
    const values = Array.isArray(input) ? input : String(input || '').split(/[\n,\s]+/);
    const sources = values.map(normalizeYouTubeSource).filter(Boolean);
    return [...new Map(sources.map(source => [source.key, source])).values()].slice(0, 12);
  }
  function parseYouTubeList(input) {
    const values = Array.isArray(input) ? input : String(input || '').split(/[\n,\s]+/);
    return [...new Set(values.map(parseYouTubeId).filter(id => id && id.length === 11))].slice(0, 12);
  }
  function parseTwitch(input) {
    try {
      const url = new URL(String(input || '').trim());
      if (!/(^|\.)twitch\.tv$/i.test(url.hostname)) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'videos' && /^\d+$/.test(parts[1] || '')) return { type: 'video', value: 'v' + parts[1] };
      if (parts[0] && parts[1] === 'v' && /^\d+$/.test(parts[2] || '')) return { type: 'video', value: 'v' + parts[2] };
      if (parts[0] && /^[A-Za-z0-9_]{1,25}$/.test(parts[0])) return { type: 'channel', value: parts[0].toLowerCase() };
    } catch (_) {}
    return null;
  }
  function nodes(target) {
    const ids = targets[target] || targets.invaders || targets.menu;
    return Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, document.getElementById(id)]));
  }
  function currentTarget() {
    if (document.getElementById('invadersGameView')?.classList.contains('active')) return 'invaders';
    return 'menu';
  }
  function safeSave(saveFn) { if (typeof saveFn === 'function') saveFn(); else if (typeof global.save === 'function') global.save(); }
  function readResume() {
    try { return JSON.parse(localStorage.getItem(YOUTUBE_RESUME_KEY) || 'null') || {}; } catch (_) { return {}; }
  }
  function writeResume(value) {
    try { localStorage.setItem(YOUTUBE_RESUME_KEY, JSON.stringify({ ...value, savedAt: Date.now() })); } catch (_) {}
  }
  function selectYouTubeSource(profile, forceRandom = false) {
    const sources = parseYouTubeSources(profile.bg?.youtubeSources || []);
    if (!sources.length) return null;
    const resume = readResume();
    if (!forceRandom) {
      const resumed = sources.find(source => source.key === resume.sourceKey);
      if (resumed) return resumed;
    }
    if (profile.bg?.youtubeRandom && sources.length > 1) {
      const choices = forceRandom ? sources.filter(source => source.key !== resume.sourceKey) : sources;
      return choices[Math.floor(Math.random() * choices.length)];
    }
    return sources[0];
  }
  function loadYouTubeApi() {
    if (global.YT?.Player) return Promise.resolve(global.YT);
    if (youtubeApiPromise) return youtubeApiPromise;
    youtubeApiPromise = new Promise((resolve, reject) => {
      const prior = global.onYouTubeIframeAPIReady;
      global.onYouTubeIframeAPIReady = () => { prior?.(); resolve(global.YT); };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('YouTube player could not load'));
      document.head.appendChild(script);
      setTimeout(() => { if (!global.YT?.Player) reject(new Error('YouTube player timed out')); }, 15000);
    });
    return youtubeApiPromise;
  }
  function saveYouTubePosition(target) {
    const entry = youtubePlayers.get(target);
    if (!entry?.ready) return;
    try {
      const videoId = entry.player.getVideoData()?.video_id || (entry.source?.kind === 'video' ? entry.source.id : null);
      const seconds = Math.max(0, Number(entry.player.getCurrentTime()) || 0);
      const playlistIndex = Math.max(0, Number(entry.player.getPlaylistIndex?.()) || 0);
      if (entry.source) writeResume({ sourceKey: entry.source.key, sourceKind: entry.source.kind, sourceId: entry.source.id, videoId, playlistIndex, seconds, randomizeStart: false });
    } catch (_) {}
  }
  function queueYouTubeSource(player, source, resume, playNow = false) {
    const canResume = resume.sourceKey === source.key;
    const seconds = canResume ? Math.max(0, Number(resume.seconds) || 0) : 0;
    if (source.kind === 'playlist') {
      const options = { listType: 'playlist', list: source.id, index: canResume ? Math.max(0, Number(resume.playlistIndex) || 0) : 0, startSeconds: seconds };
      if (playNow) player.loadPlaylist(options); else player.cuePlaylist(options);
      player.setLoop?.(true);
      return;
    }
    if (playNow) player.loadVideoById({ videoId: source.id, startSeconds: seconds });
    else { player.cueVideoById({ videoId: source.id, startSeconds: seconds }); if (seconds > 0) player.seekTo(seconds, true); }
  }
  function randomStartSeconds(duration) {
    const total = Math.max(0, Number(duration) || 0);
    if (total < 35) return 0;
    const floor = Math.min(24, total * 0.12);
    const ceiling = Math.max(floor, total - Math.min(24, total * 0.12));
    return Math.floor(floor + Math.random() * Math.max(1, ceiling - floor));
  }
  function applyRandomYouTubeStart(entry) {
    if (!entry?.ready || !entry.randomSeekPending) return false;
    const player = entry.player;
    try {
      if (entry.source.kind === 'playlist' && !entry.randomTrackSelected) {
        const list = player.getPlaylist?.() || [];
        if (list.length > 1) {
          const index = Math.floor(Math.random() * list.length);
          entry.randomTrackSelected = true;
          entry.randomPlaylistIndex = index;
          player.playVideoAt(index);
          return false;
        }
        entry.randomTrackSelected = true;
      }
      const duration = Number(player.getDuration?.()) || 0;
      if (duration <= 0) return false;
      const seconds = randomStartSeconds(duration);
      entry.randomSeekPending = false;
      entry.randomSeconds = seconds;
      player.seekTo(seconds, true);
      writeResume({
        sourceKey: entry.source.key,
        sourceKind: entry.source.kind,
        sourceId: entry.source.id,
        videoId: player.getVideoData?.()?.video_id || (entry.source.kind === 'video' ? entry.source.id : null),
        playlistIndex: entry.randomPlaylistIndex ?? Math.max(0, Number(player.getPlaylistIndex?.()) || 0),
        seconds,
        randomizeStart: false
      });
      return true;
    } catch (_) { return false; }
  }
  function startResumeClock() {
    clearInterval(resumeTimer);
    resumeTimer = setInterval(() => youtubePlayers.forEach((_, target) => saveYouTubePosition(target)), 1500);
  }
  function updateListenerBar() {
    const bar = document.getElementById('youtubeListeningBar');
    const toggle = document.getElementById('youtubeListenerToggle');
    if (bar) bar.hidden = !listeningTarget;
    if (toggle) toggle.textContent = listeningTarget ? 'PAUSE' : 'PLAY';
  }
  function updateSoundButton(profile, target) {
    const n = nodes(target);
    if (!n.sound) return;
    n.sound.hidden = true;
    n.sound.disabled = true;
    n.sound.setAttribute?.('aria-hidden', 'true');
    n.sound.tabIndex = -1;
    n.sound.textContent = profile.bg?.mediaAudio ? '🔊 MEDIA' : '🔇 MEDIA';
  }
  function setMediaStatus(target, text, state = 'ready') {
    const status = nodes(target).status;
    if (!status) return;
    status.hidden = true;
    status.setAttribute?.('aria-hidden', 'true');
    status.textContent = text || '';
    status.dataset.state = state;
  }
  function showSoundGate(target, message = 'Your browser blocked automatic sound. Tap once to enable it.') {
    const gate = document.getElementById('youtubeSoundGate');
    const copy = document.getElementById('youtubeSoundGateCopy');
    const title = document.getElementById('mediaGateTitle');
    const button = document.getElementById('youtubeSoundGateButton');
    if (!gate) return;
    gate.dataset.target = target;
    gate.hidden = false;
    const twitch = twitchPlayers.has(target);
    if (title) title.textContent = twitch ? 'TWITCH IS READY' : 'MEDIA IS READY';
    if (button) button.textContent = twitch ? 'PLAY TWITCH' : 'PLAY WITH SOUND';
    if (copy) copy.textContent = message;
    setMediaStatus(target, 'TAP ENABLE SOUND', 'blocked');
  }
  function hideSoundGate() {
    const gate = document.getElementById('youtubeSoundGate');
    if (gate) gate.hidden = true;
  }
  function destroyTarget(target) {
    saveYouTubePosition(target);
    const n = nodes(target);
    if (n.image) { n.image.hidden = true; n.image.removeAttribute('src'); }
    if (n.video) { n.video.pause(); n.video.hidden = true; n.video.removeAttribute('src'); n.video.load(); }
    if (n.scene) n.scene.hidden = true;
    n.layer?.classList?.remove('interactive-media');
    const youtube = youtubePlayers.get(target);
    try { youtube?.player?.destroy?.(); } catch (_) {}
    youtubePlayers.delete(target);
    try { twitchPlayers.get(target)?.pause?.(); } catch (_) {}
    twitchPlayers.delete(target);
    if (n.host) n.host.replaceChildren();
    const url = objectUrls.get(target);
    if (url) URL.revokeObjectURL(url);
    objectUrls.delete(target);
  }
  async function loadTwitchScript() {
    if (global.Twitch?.Player) return;
    if (!twitchScript) twitchScript = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://player.twitch.tv/js/embed/v1.js'; script.async = true;
      script.onload = resolve; script.onerror = () => reject(new Error('Twitch player could not load')); document.head.appendChild(script);
    });
    await twitchScript;
  }
  function commandYouTube(target, command) {
    const entry = youtubePlayers.get(target);
    if (!entry?.ready) { if (entry) entry.pending = command; return false; }
    try {
      if (command === 'play') { entry.pending = 'play'; entry.player.playVideo(); }
      if (command === 'pause') { saveYouTubePosition(target); entry.player.pauseVideo(); }
      if (command === 'unmute') { entry.player.unMute(); entry.player.setVolume(100); }
      if (command === 'mute') entry.player.mute();
      return true;
    } catch (_) { return false; }
  }
  function playTwitch(target, profile, showGateOnFailure = true) {
    const player = twitchPlayers.get(target) || [...twitchPlayers.values()][0];
    if (!player) {
      if (showGateOnFailure) showSoundGate(target, 'Twitch is still loading. Tap again in a moment.');
      return false;
    }
    try {
      player.setMuted(!profile?.bg?.mediaAudio);
      player.play();
      hideSoundGate();
      setMediaStatus(target, profile?.bg?.mediaAudio ? 'TWITCH SOUND ON' : 'TWITCH PLAYING', 'playing');
      return true;
    } catch (_) {
      if (showGateOnFailure) showSoundGate(target, 'Tap PLAY TWITCH to satisfy the mobile playback requirement.');
      return false;
    }
  }
  function applyFit(profile) {
    const fit = profile?.bg?.fitMedia !== false;
    ['landingUploadedImage', 'gameImageBackground', 'gameVideoBackground', 'invadersImageBackground', 'invadersVideoBackground']
      .forEach(id => document.getElementById(id)?.classList?.toggle?.('media-fit', fit));
  }

  function syncLandingPresentation(profile) {
    const home = document.getElementById('homeView');
    const twitch = profile?.bg?.gameType === TYPES.TWITCH ? profile.bg.twitch : null;
    const twitchActive = Boolean(twitch?.value);
    const youtubeActive = profile?.bg?.gameType === TYPES.YOUTUBE
      && Array.isArray(profile?.bg?.youtubeSources)
      && profile.bg.youtubeSources.length > 0;
    home?.classList?.toggle('twitch-media-mode', twitchActive);
    home?.classList?.toggle('youtube-media-mode', youtubeActive);
    return twitchActive || youtubeActive;
  }

  const Manager = {
    TYPES,
    parseYouTubeList,
    parseYouTubeSources,
    sourceToUrl: source => normalizeYouTubeSource(source)?.url || '',
    defaultYouTubeUrls: DEFAULT_YOUTUBE_URLS,
    defaultTwitchUrl: DEFAULT_TWITCH_URL,
    migrateProfile(profile) {
      profile.bg = profile.bg || {};
      profile.bg.menuType ||= profile.menuWall ? TYPES.IMAGE : TYPES.DEFAULT;
      profile.bg.gameType ||= profile.gameWall ? TYPES.IMAGE : TYPES.DEFAULT;
      const legacyVideos = parseYouTubeList(profile.bg.youtubeIds?.length ? profile.bg.youtubeIds : profile.bg.youtubeId).map(id => ({ kind: 'video', id }));
      let sources = parseYouTubeSources(profile.bg.youtubeSources?.length ? profile.bg.youtubeSources : legacyVideos);
      if (profile.bg.youtubePlaylistPackVersion !== 3) {
        sources = sources.filter(source => !LEGACY_DEFAULT_YOUTUBE_IDS.has(source.id));
        sources = parseYouTubeSources([...sources, ...DEFAULT_YOUTUBE_URLS]);
        profile.bg.youtubePlaylistPackVersion = 3;
      }
      profile.bg.youtubeSeeded = true;
      profile.bg.youtubeSources = sources;
      profile.bg.youtubeIds = sources.filter(source => source.kind === 'video').map(source => source.id);
      profile.bg.youtubeRandom = sources.length > 1 && profile.bg.youtubeRandom === true;
      if (profile.bg.twitchPackVersion !== 2) {
        if (!profile.bg.twitch || (profile.bg.twitch.type === 'channel' && profile.bg.twitch.value === 'fazebanks')) profile.bg.twitch = parseTwitch(DEFAULT_TWITCH_URL);
        profile.bg.twitchPackVersion = 2;
      }
      profile.bg.fitMedia = profile.bg.fitMedia !== false;
      if (profile.bg.gameType === TYPES.YOUTUBE) profile.bg.mediaAudio = true;
      else profile.bg.mediaAudio = profile.bg.mediaAudio === true;
      return profile;
    },
    async applyMenu(profile) {
      const fallback = document.getElementById('landingDefaultImage');
      const upload = document.getElementById('landingUploadedImage');
      if (!fallback || !upload) return;
      syncLandingPresentation(profile);
      // Preserve the established landing artwork; Dusk Atelier harmonizes its
      // framing and ambient treatment without replacing the underlying asset.
      fallback.src = 'assets/opening/menu-bull-solana.webp';
      fallback.hidden = false;
      const interactiveStream = [TYPES.YOUTUBE, TYPES.TWITCH].includes(profile.bg?.gameType);
      if (profile.menuWall && !interactiveStream) { upload.src = profile.menuWall; upload.hidden = false; upload.removeAttribute('aria-hidden'); }
      else { upload.hidden = true; upload.removeAttribute('src'); upload.setAttribute('aria-hidden', 'true'); }
      applyFit(profile);
      await this.applyGame(profile, 'menu');
    },
    async applyGame(profile, target = currentTarget()) {
      this.migrateProfile(profile);
      applyFit(profile);
      if (target === 'menu') syncLandingPresentation(profile);
      const n = nodes(target);
      if (!n.image || !n.video || !n.scene || !n.host) return;
      const type = profile.bg.gameType;
      n.layer?.classList?.toggle('interactive-media', target === 'menu' && [TYPES.YOUTUBE, TYPES.TWITCH].includes(type));
      // Twitch is intentionally landing-page only. It never mounts, plays, or
      // steals audio inside game runtime.
      if (type === TYPES.TWITCH && target !== 'menu') {
        destroyTarget(target); updateSoundButton(profile, target); return;
      }
      if (type === TYPES.YOUTUBE && profile.bg.youtubeSources.length) {
        const selectedSource = selectYouTubeSource(profile);
        const existing = youtubePlayers.get(target);
        if (existing && existing.source?.key === selectedSource?.key) {
          const resume = readResume();
          if (resume.sourceKey === selectedSource.key && resume.randomizeStart === true) {
            existing.randomSeekPending = true;
            existing.randomTrackSelected = false;
            existing.randomPlaylistIndex = null;
            existing.pending = 'play';
            if (existing.ready && existing.player) queueYouTubeSource(existing.player, selectedSource, resume, true);
          }
          n.scene.hidden = false; n.layer?.classList?.toggle('interactive-media', target === 'menu'); updateSoundButton(profile, target); return;
        }
        const donorPair = [...youtubePlayers.entries()].find(([otherTarget, entry]) => otherTarget !== target && entry.source?.key === selectedSource?.key);
        if (donorPair) {
          const [otherTarget, entry] = donorPair;
          saveYouTubePosition(otherTarget); destroyTarget(target);
          const iframe = entry.player?.getIframe?.();
          if (iframe) n.host.appendChild(iframe);
          nodes(otherTarget).scene.hidden = true;
          nodes(otherTarget).layer?.classList?.remove('interactive-media');
          entry.target = target;
          youtubePlayers.delete(otherTarget); youtubePlayers.set(target, entry);
          n.scene.hidden = false; n.layer?.classList?.toggle('interactive-media', target === 'menu'); updateSoundButton(profile, target); return;
        }
      }
      if (type === TYPES.TWITCH && target === 'menu' && twitchPlayers.has('menu')) {
        n.scene.hidden = false; n.layer?.classList?.add('interactive-media');
        playTwitch('menu', profile, false); updateSoundButton(profile, target); return;
      }
      destroyTarget(target);
      n.layer?.classList?.toggle('interactive-media', target === 'menu' && [TYPES.YOUTUBE, TYPES.TWITCH].includes(type));
      if ([TYPES.IMAGE, TYPES.GIF].includes(type) && profile.gameWall) { n.image.src = profile.gameWall; n.image.hidden = false; }
      if (type === TYPES.LOCAL_VIDEO) {
        const blob = await idb('get', 'shared-game-video').catch(() => null);
        if (blob) {
          const url = URL.createObjectURL(blob); objectUrls.set(target, url);
          n.video.src = url; n.video.loop = true; n.video.muted = target === 'menu' ? true : !profile.bg.mediaAudio; n.video.playsInline = true; n.video.hidden = false;
          if (target === 'menu') n.video.play?.().catch?.(() => {});
        }
      }
      if (type === TYPES.YOUTUBE && profile.bg.youtubeSources.length) {
        const source = selectYouTubeSource(profile);
        const mount = document.createElement('div');
        mount.id = `youtube-${target}-${Date.now()}`;
        n.host.appendChild(mount); n.scene.hidden = false;
        try {
          await loadYouTubeApi();
          await new Promise((resolve, reject) => {
            const resumeAtCreate = readResume();
            const entry = {
              player: null, ready: false, source, pending: null, shuffledKey: null, target,
              randomSeekPending: resumeAtCreate.sourceKey === source.key && resumeAtCreate.randomizeStart === true,
              randomTrackSelected: false,
              randomPlaylistIndex: null,
              randomSeconds: null
            };
            youtubePlayers.set(target, entry);
            const playerOptions = {
              host: 'https://www.youtube-nocookie.com',
              playerVars: { autoplay: 0, controls: 1, playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin },
              events: {
                onReady(event) {
                  entry.ready = true;
                  const resume = readResume();
                  queueYouTubeSource(event.target, source, resume, entry.pending === 'play');
                  if (profile.bg.mediaAudio) { event.target.unMute(); event.target.setVolume(100); } else event.target.mute();
                  setMediaStatus(entry.target, 'YOUTUBE READY', 'ready');
                  resolve();
                },
                onStateChange(event) {
                  if (event.data === global.YT.PlayerState.CUED && entry.source.kind === 'playlist' && profile.bg.youtubeRandom && entry.shuffledKey !== entry.source.key) {
                    entry.shuffledKey = entry.source.key; event.target.setShuffle?.(true); event.target.setLoop?.(true);
                  }
                  if (event.data === global.YT.PlayerState.CUED && entry.pending === 'play') event.target.playVideo();
                  if (event.data === global.YT.PlayerState.PLAYING) {
                    applyRandomYouTubeStart(entry);
                    entry.pending = null; hideSoundGate();
                    setMediaStatus(entry.target, profile.bg.mediaAudio ? 'YOUTUBE SOUND ON' : 'YOUTUBE MUTED', profile.bg.mediaAudio ? 'playing' : 'muted');
                  }
                  if (event.data === global.YT.PlayerState.PAUSED) setMediaStatus(entry.target, 'YOUTUBE PAUSED • POSITION SAVED', 'paused');
                  if (event.data === global.YT.PlayerState.ENDED && profile.bg.youtubeRandom) {
                    saveYouTubePosition(entry.target);
                    if (entry.source.kind === 'playlist') return;
                    const next = selectYouTubeSource(profile, true);
                    entry.source = next; entry.shuffledKey = null;
                    entry.randomSeekPending = true; entry.randomTrackSelected = false; entry.randomPlaylistIndex = null;
                    writeResume({ sourceKey: next.key, sourceKind: next.kind, sourceId: next.id, videoId: next.kind === 'video' ? next.id : null, playlistIndex: 0, seconds: 0, randomizeStart: true });
                    queueYouTubeSource(event.target, next, {}, true);
                  }
                },
                onAutoplayBlocked() {
                  showSoundGate(entry.target); toast('Tap ENABLE SOUND once — playback will stay unlocked');
                },
                onError() { const error = new Error('This YouTube video or playlist cannot be embedded'); toast(error.message); reject(error); }
              }
            };
            entry.player = new global.YT.Player(mount, playerOptions);
          });
          startResumeClock();
        } catch (error) { toast(error.message || 'YouTube background unavailable'); }
      }
      if (type === TYPES.TWITCH && profile.bg.twitch) {
        n.scene.hidden = false;
        try {
          await loadTwitchScript();
          const options = { width: '100%', height: '100%', parent: [location.hostname || 'localhost'], autoplay: true, muted: true };
          if (profile.bg.twitch.type === 'channel') options.channel = profile.bg.twitch.value; else options.video = profile.bg.twitch.value;
          const player = new global.Twitch.Player(n.host.id, options); twitchPlayers.set(target, player);
          player.addEventListener(global.Twitch.Player.READY, () => {
            player.setMuted(!profile.bg.mediaAudio);
            setMediaStatus(target, 'TWITCH READY • TAP PLAY', 'ready');
            showSoundGate(target, 'Twitch requires one tap to start live video on mobile.');
          });
          if (global.Twitch.Player.PLAY) player.addEventListener(global.Twitch.Player.PLAY, () => {
            hideSoundGate();
            setMediaStatus(target, profile.bg.mediaAudio ? 'TWITCH SOUND ON' : 'TWITCH PLAYING', 'playing');
          });
          if (global.Twitch.Player.PLAYBACK_BLOCKED) player.addEventListener(global.Twitch.Player.PLAYBACK_BLOCKED, () => {
            showSoundGate(target, 'Twitch blocked autoplay. Tap PLAY TWITCH once to start.');
          });
        } catch (error) { toast(error.message || 'Twitch background unavailable'); }
      }
      updateSoundButton(profile, target);
    },
    async setMenuImageFile(file, profile, saveFn) {
      if (!file?.type.startsWith('image/')) throw new Error('Choose an image or GIF');
      if (file.size > 6 * 1024 * 1024) throw new Error('Image is larger than 6MB');
      profile.menuWall = await readDataUrl(file); profile.bg = profile.bg || {}; profile.bg.menuType = file.type === 'image/gif' ? TYPES.GIF : TYPES.IMAGE; safeSave(saveFn); this.applyMenu(profile);
    },
    clearMenu(profile, saveFn) { profile.menuWall = null; profile.bg = profile.bg || {}; profile.bg.menuType = TYPES.DEFAULT; safeSave(saveFn); this.applyMenu(profile); },
    async setGameImageFile(file, profile, saveFn) {
      if (!file?.type.startsWith('image/')) throw new Error('Choose an image or GIF');
      if (file.size > 6 * 1024 * 1024) throw new Error('Image is larger than 6MB');
      profile.gameWall = await readDataUrl(file); profile.bg = profile.bg || {}; Object.assign(profile.bg, { gameType: file.type === 'image/gif' ? TYPES.GIF : TYPES.IMAGE, twitch: null }); safeSave(saveFn);
      await this.applyGame(profile, currentTarget());
    },
    async setGameVideoFile(file, profile, saveFn) {
      const valid = file && (/^video\/(mp4|webm)$/i.test(file.type) || /\.(mp4|webm)$/i.test(file.name));
      if (!valid) throw new Error('Use MP4 or WebM video');
      if (file.size > 80 * 1024 * 1024) throw new Error('Video is larger than 80MB');
      await idb('put', 'shared-game-video', file); profile.gameWall = null; profile.bg = profile.bg || {}; Object.assign(profile.bg, { gameType: TYPES.LOCAL_VIDEO, gameMediaName: file.name, twitch: null }); safeSave(saveFn);
      await this.applyGame(profile, currentTarget());
    },
    async setYouTubeList(value, random, profile, saveFn) {
      const sources = parseYouTubeSources(value);
      if (!sources.length) throw new Error('Add at least one valid YouTube video or playlist URL');
      profile.gameWall = null; profile.bg = profile.bg || {};
      Object.assign(profile.bg, {
        gameType: TYPES.YOUTUBE,
        youtubeId: sources.find(source => source.kind === 'video')?.id || null,
        youtubeIds: sources.filter(source => source.kind === 'video').map(source => source.id),
        youtubeSources: sources,
        youtubeSeeded: true,
        youtubeRandom: random === true,
        twitch: null,
        mediaAudio: true
      });
      const prior = readResume();
      const choices = random && sources.length > 1 ? sources.filter(source => source.key !== prior.sourceKey) : sources;
      const selected = random ? choices[Math.floor(Math.random() * choices.length)] : sources[0];
      safeSave(saveFn); writeResume({ sourceKey: selected.key, sourceKind: selected.kind, sourceId: selected.id, videoId: selected.kind === 'video' ? selected.id : null, playlistIndex: 0, seconds: 0, randomizeStart: random === true });
      await this.applyGame(profile, currentTarget());
      return sources.length;
    },
    async setYouTube(value, profile, saveFn) { return this.setYouTubeList(value, false, profile, saveFn); },
    async setTwitch(value, profile, saveFn) {
      const twitch = parseTwitch(value); if (!twitch) throw new Error('Enter a Twitch channel or video URL');
      profile.gameWall = null; profile.bg = profile.bg || {}; Object.assign(profile.bg, { gameType: TYPES.TWITCH, twitch }); safeSave(saveFn);
      syncLandingPresentation(profile);
      await this.applyGame(profile, 'menu');
    },
    setFitMedia(enabled, profile, saveFn) {
      profile.bg = profile.bg || {};
      profile.bg.fitMedia = enabled === true;
      safeSave(saveFn);
      applyFit(profile);
      return profile.bg.fitMedia;
    },
    playTwitch(profile, target = 'menu') {
      profile.bg = profile.bg || {};
      profile.bg.mediaAudio = true;
      safeSave();
      global.AudioManager?.stopMusic?.();
      return playTwitch(target, profile);
    },
    async clearGame(profile, saveFn) {
      profile.gameWall = null; profile.bg = profile.bg || {}; Object.assign(profile.bg, { gameType: TYPES.DEFAULT, twitch: null, gameMediaName: null, mediaAudio: false });
      await idb('delete', 'shared-game-video').catch(() => {}); safeSave(saveFn); destroyTarget('invaders'); this.stopListening();
      syncLandingPresentation(profile);
      await this.applyMenu(profile);
    },
    async toggleMediaAudio(profile, target = currentTarget()) {
      profile.bg = profile.bg || {}; profile.bg.mediaAudio = !profile.bg.mediaAudio; safeSave();
      const n = nodes(target); if (n.video) n.video.muted = !profile.bg.mediaAudio;
      commandYouTube(target, profile.bg.mediaAudio ? 'unmute' : 'mute');
      try { twitchPlayers.get(target)?.setMuted(!profile.bg.mediaAudio); } catch (_) {}
      if (profile.bg.mediaAudio) global.AudioManager?.stopMusic?.(); else global.AudioManager?.startMusic?.();
      updateSoundButton(profile, target); return profile.bg.mediaAudio;
    },
    armFromGesture(profile, target = currentTarget()) {
      if (!profile?.bg) return false;
      const type = profile.bg.gameType;
      if (![TYPES.YOUTUBE, TYPES.TWITCH, TYPES.LOCAL_VIDEO].includes(type)) return false;
      if (type === TYPES.TWITCH && target !== 'menu') return false;
      profile.bg.mediaAudio = true; safeSave(); global.AudioManager?.stopMusic?.();
      const n = nodes(target);
      if (type === TYPES.LOCAL_VIDEO && n.video && !n.video.hidden && n.video.src) {
        n.video.muted = false; n.video.play?.().catch?.(() => showSoundGate(target, 'Tap once to enable uploaded-video sound.'));
        hideSoundGate(); setMediaStatus(target, 'VIDEO SOUND ON', 'playing'); updateSoundButton(profile, target); return true;
      }
      if (type === TYPES.TWITCH) {
        const played = playTwitch(target, profile);
        updateSoundButton(profile, target);
        return played;
      }
      const pair = youtubePlayers.has(target) ? [target, youtubePlayers.get(target)] : [...youtubePlayers.entries()][0];
      const entry = pair?.[1];
      if (!entry) { setMediaStatus(target, 'LOADING YOUTUBE…', 'loading'); return false; }
      entry.pending = 'play';
      if (!entry.ready) { setMediaStatus(target, 'LOADING YOUTUBE…', 'loading'); return false; }
      try {
        entry.player.unMute(); entry.player.setVolume(100); entry.player.playVideo();
        hideSoundGate(); setMediaStatus(target, 'YOUTUBE SOUND ON', 'playing'); updateSoundButton(profile, target); return true;
      } catch (_) { showSoundGate(target); return false; }
    },
    async onRunStart(profile, target = currentTarget()) {
      listeningTarget = null; updateListenerBar();
      const n = nodes(target);
      if (profile.bg?.gameType === TYPES.TWITCH) {
        try { twitchPlayers.get('menu')?.pause?.(); } catch (_) {}
        destroyTarget(target); updateSoundButton(profile, target); return;
      }
      if (profile.bg?.gameType === TYPES.YOUTUBE) { profile.bg.mediaAudio = true; safeSave(); }
      if (profile.bg?.mediaAudio && [TYPES.YOUTUBE, TYPES.LOCAL_VIDEO].includes(profile.bg?.gameType)) global.AudioManager?.stopMusic?.();
      if (n.video && !n.video.hidden && n.video.src) { n.video.muted = !profile.bg?.mediaAudio; try { await n.video.play(); } catch (_) {} }
      commandYouTube(target, profile.bg?.mediaAudio ? 'unmute' : 'mute'); commandYouTube(target, 'play');
      updateSoundButton(profile, target);
    },
    onRunPause(target = currentTarget()) {
      if (listeningTarget) return;
      const n = nodes(target); try { n.video?.pause(); } catch (_) {}
      commandYouTube(target, 'pause'); try { twitchPlayers.get(target)?.pause?.(); } catch (_) {}
      hideSoundGate();
    },
    onRunResume(profile, target = currentTarget()) { return this.onRunStart(profile, target); },
    onRunEnd(target = currentTarget()) { this.onRunPause(target); },
    onAppHidden() {
      listeningTarget = null; updateListenerBar();
      for (const target of Object.keys(targets)) {
        const n = nodes(target); try { n.video?.pause(); } catch (_) {}
        commandYouTube(target, 'pause'); try { twitchPlayers.get(target)?.pause?.(); } catch (_) {}
      }
    },
    continueListening(profile, target = currentTarget()) {
      if (profile.bg?.gameType !== TYPES.YOUTUBE) { toast('Keep Listening is available for YouTube backgrounds'); return false; }
      listeningTarget = target; profile.bg.mediaAudio = true; safeSave();
      global.AudioManager?.stopMusic?.();
      commandYouTube(target, 'unmute'); commandYouTube(target, 'play');
      hideSoundGate(); setMediaStatus(target, 'YOUTUBE CONTINUES', 'playing');
      updateSoundButton(profile, target); updateListenerBar(); return true;
    },
    async resumeOnLanding(profile, sourceTarget = 'invaders') {
      if (profile.bg?.gameType !== TYPES.YOUTUBE) return false;
      saveYouTubePosition(sourceTarget);
      await this.applyGame(profile, 'menu');
      listeningTarget = 'menu'; profile.bg.mediaAudio = true; safeSave();
      commandYouTube('menu', 'unmute'); commandYouTube('menu', 'play');
      hideSoundGate(); setMediaStatus('menu', 'YOUTUBE CONTINUES', 'playing');
      updateListenerBar(); return true;
    },
    toggleListening(profile) {
      if (!listeningTarget) return false;
      const entry = youtubePlayers.get(listeningTarget);
      let playing = false;
      try { playing = entry?.player?.getPlayerState?.() === global.YT.PlayerState.PLAYING; } catch (_) {}
      commandYouTube(listeningTarget, playing ? 'pause' : 'play');
      const button = document.getElementById('youtubeListenerToggle'); if (button) button.textContent = playing ? 'PLAY' : 'PAUSE';
      return !playing;
    },
    stopListening() {
      if (listeningTarget) commandYouTube(listeningTarget, 'pause');
      listeningTarget = null; updateListenerBar();
    },
    stopPlayback(target = currentTarget()) {
      const n = nodes(target); try { n.video?.pause(); } catch (_) {}
      commandYouTube(target, 'pause'); try { twitchPlayers.get(target)?.pause?.(); } catch (_) {}
      listeningTarget = null; updateListenerBar(); hideSoundGate();
      // Exit is final for the active scene: destroy its embed so it cannot resume behind the menu.
      destroyTarget(target);
    },
    syncLandingPresentation,
    landingPresentationSnapshot() {
      const home = document.getElementById('homeView');
      return {
        active: home?.classList?.contains('twitch-media-mode') === true || home?.classList?.contains('youtube-media-mode') === true,
        mode: home?.classList?.contains('twitch-media-mode') ? 'twitch' : home?.classList?.contains('youtube-media-mode') ? 'youtube' : 'default',
        playerInteractive: nodes('menu').layer?.classList?.contains('interactive-media') === true
      };
    }
  };

  global.BackgroundManager = Manager;
  global.parseYouTubeId = parseYouTubeId;
  global.parseTwitch = parseTwitch;
})(window);
