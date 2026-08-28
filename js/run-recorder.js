/* Memory-only Game session recording and native mobile sharing. */
(function (global) {
  'use strict';

  const MAX_RECORDING_MS = 30 * 60 * 1000;
  const VIDEO_BITS_PER_SECOND = 900_000;
  const FRAME_RATE = 15;
  const MIME_CANDIDATES = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm'
  ];

  let recorder = null;
  let stream = null;
  let audioBridge = null;
  let chunks = [];
  let readyBlob = null;
  let readyFile = null;
  let stopPromise = null;
  let stopResolve = null;
  let discardOnStop = false;
  let limitTimer = 0;
  let stopFallbackTimer = 0;
  let stopFinalized = false;
  let status = 'idle';
  let lastError = '';
  let metadata = {};
  let armed = false;

  function emit(detail = {}) {
    try {
      global.dispatchEvent(new CustomEvent('bbrs:recording-status', {
        detail: { status, armed, hasRecording: !!readyBlob, error: lastError, ...detail }
      }));
    } catch (_) {}
  }

  function supported() {
    return !!(
      global.MediaRecorder &&
      global.MediaStream &&
      global.File &&
      global.HTMLCanvasElement?.prototype?.captureStream
    );
  }

  function chooseMimeType() {
    if (!global.MediaRecorder?.isTypeSupported) return '';
    return MIME_CANDIDATES.find(type => global.MediaRecorder.isTypeSupported(type)) || '';
  }

  function extensionFor(type) {
    return String(type || '').includes('mp4') ? 'mp4' : 'webm';
  }

  function shareSafeType(type) {
    const base = String(type || '').split(';')[0].trim().toLowerCase();
    return base === 'video/mp4' ? 'video/mp4' : 'video/webm';
  }

  function clearReady() {
    readyBlob = null;
    readyFile = null;
  }

  function setArmed(value) {
    armed = value === true;
    emit({ armChanged: true });
    return armed;
  }

  function isArmed() {
    return armed;
  }

  function releaseStream() {
    clearTimeout(limitTimer);
    clearTimeout(stopFallbackTimer);
    limitTimer = 0;
    stopFallbackTimer = 0;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    audioBridge?.stop?.();
    audioBridge = null;
  }

  function finalizeStop() {
    if (stopFinalized) return;
    stopFinalized = true;
    releaseStream();
    recorder = null;
    if (!discardOnStop && chunks.length) {
      const type = shareSafeType(chunks.find(chunk => chunk?.type)?.type || chooseMimeType() || 'video/webm');
      readyBlob = new Blob(chunks, { type });
      if (readyBlob.size > 0) {
        const extension = extensionFor(type);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        readyFile = new File([readyBlob], `a-bulls-app-run-${stamp}.${extension}`, { type });
        status = 'ready';
        emit({ size: readyBlob.size, type, metadata });
      } else {
        clearReady(); status = 'error'; lastError = 'The browser produced an empty recording.'; emit();
      }
    } else {
      clearReady();
      status = 'idle';
      emit({ discarded: true });
    }
    chunks = [];
    discardOnStop = false;
    const resolve = stopResolve;
    stopPromise = null;
    stopResolve = null;
    resolve?.(readyFile);
  }

  async function discard(reason = 'discarded') {
    lastError = '';
    clearReady();
    if (recorder && recorder.state !== 'inactive') {
      discardOnStop = true;
      const pending = stopPromise || new Promise(resolve => { stopResolve = resolve; });
      stopPromise = pending;
      try { recorder.stop(); } catch (_) { finalizeStop(); }
      await pending;
    } else {
      releaseStream();
      recorder = null;
      chunks = [];
      status = 'idle';
      emit({ discarded: true, reason });
    }
    return true;
  }

  async function start(options = {}) {
    await discard('new-run');
    metadata = options.metadata || {};
    const sessionWasArmed = armed;
    armed = false;
    emit({ armConsumed: sessionWasArmed });
    if (!sessionWasArmed || options.enabled !== true) return { started: false, reason: 'not-armed' };
    if (!supported()) {
      status = 'unsupported';
      lastError = 'This browser cannot record the game canvas.';
      emit();
      return { started: false, reason: 'unsupported' };
    }
    const canvas = options.canvas;
    if (!(canvas instanceof global.HTMLCanvasElement)) {
      status = 'error';
      lastError = 'The game renderer was not ready for recording.';
      emit();
      return { started: false, reason: 'canvas-unavailable' };
    }
    try {
      const videoStream = canvas.captureStream(FRAME_RATE);
      audioBridge = global.AudioManager?.createRecordingStream?.() || null;
      const tracks = [
        ...videoStream.getVideoTracks(),
        ...(audioBridge?.stream?.getAudioTracks?.() || [])
      ];
      stream = new MediaStream(tracks);
      const mimeType = chooseMimeType();
      const recorderOptions = { videoBitsPerSecond: VIDEO_BITS_PER_SECOND };
      if (mimeType) recorderOptions.mimeType = mimeType;
      recorder = new MediaRecorder(stream, recorderOptions);
      chunks = [];
      discardOnStop = false;
      stopFinalized = false;
      recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      recorder.onerror = event => {
        lastError = event.error?.message || 'Recording failed.';
        status = 'error';
        emit();
      };
      recorder.onstop = finalizeStop;
      recorder.start(750);
      status = 'recording';
      lastError = '';
      limitTimer = setTimeout(() => stop({ reason: 'time-limit' }), MAX_RECORDING_MS);
      emit({ type: recorder.mimeType || mimeType, includesGameAudio: !!audioBridge });
      return { started: true, includesGameAudio: !!audioBridge };
    } catch (error) {
      releaseStream();
      recorder = null;
      status = 'error';
      lastError = error?.message || String(error);
      emit();
      return { started: false, reason: 'start-failed', error: lastError };
    }
  }

  function stop(options = {}) {
    metadata = { ...metadata, ...(options.metadata || {}), stopReason: options.reason || 'run-ended' };
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(readyFile);
    if (stopPromise) return stopPromise;
    status = 'finalizing';
    emit();
    const pending = new Promise(resolve => { stopResolve = resolve; });
    stopPromise = pending;
    try {
      if (recorder.state === 'recording') recorder.requestData?.();
      // A few Android WebViews fail to deliver `stop` after backgrounding.
      // Finalize available chunks instead of leaving the result UI stuck.
      stopFallbackTimer = setTimeout(finalizeStop, 3500);
      recorder.stop();
    } catch (_) { finalizeStop(); }
    return pending;
  }

  async function download() {
    if (!readyFile || !readyBlob) return { saved: false, reason: 'not-ready' };
    try {
      if (global.showSaveFilePicker) {
        const handle = await global.showSaveFilePicker({
          suggestedName: readyFile.name,
          types: [{ description: 'Game session video', accept: { [readyFile.type]: [`.${extensionFor(readyFile.type)}`] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(readyBlob); await writable.close();
        await discard('saved');
        return { saved: true, method: 'file-picker' };
      }
      const url = URL.createObjectURL(readyBlob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = readyFile.name; anchor.rel = 'noopener';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      await discard('downloaded');
      return { saved: true, method: 'download' };
    } catch (error) {
      return { saved: false, cancelled: error?.name === 'AbortError', reason: error?.message || String(error) };
    }
  }

  async function share() {
    if (!readyFile) return { shared: false, reason: 'not-ready' };
    const payload = {
      title: 'A Bulls App — Game Run',
      text: 'My Game game session',
      files: [readyFile]
    };
    try {
      const filesOnly = { files: [readyFile] };
      if (global.navigator?.share && global.navigator?.canShare?.(filesOnly)) {
        await global.navigator.share(payload);
        await discard('shared');
        return { shared: true, method: 'native-share' };
      }
      const saved = await download();
      return { shared: saved.saved, method: saved.method || 'download', fallback: true, reason: saved.reason, cancelled: saved.cancelled };
    } catch (error) {
      const cancelled = error?.name === 'AbortError';
      // Keep the one in-memory recording available after a cancelled/failed
      // share so the player can retry or use Save Video. Replay/exit still
      // clears it, preserving the one-session memory policy.
      status = 'ready'; lastError = cancelled ? '' : (error?.message || String(error)); emit({ shareFailed: !cancelled });
      return { shared: false, cancelled, retryable: true, reason: error?.message || String(error) };
    }
  }

  global.BBRRunRecorder = Object.freeze({
    supported,
    setArmed,
    isArmed,
    start,
    stop,
    share,
    download,
    discard,
    state: () => ({ status, armed, hasRecording: !!readyBlob, error: lastError, fileName: readyFile?.name || '', type: readyFile?.type || '', size: readyBlob?.size || 0 }),
    capabilities: () => ({ supported: supported(), mimeType: chooseMimeType(), nativeFileShare: !!(global.navigator?.share && global.navigator?.canShare), frameRate: FRAME_RATE, videoBitsPerSecond: VIDEO_BITS_PER_SECOND }),
    policy: Object.freeze({ persistence: 'memory-only', retainedSessions: 1, maxDurationMs: MAX_RECORDING_MS, defaultArmed: false, armScope: 'next-run-only' })
  });
})(window);
