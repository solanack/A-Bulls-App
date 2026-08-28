export function detectExportCapabilities(scope = globalThis) {
  return Object.freeze({
    webCodecs: typeof scope.VideoEncoder === 'function' && typeof scope.VideoFrame === 'function',
    offscreenCanvas: typeof scope.OffscreenCanvas === 'function',
    mediaRecorder: typeof scope.MediaRecorder === 'function',
    hardwareConcurrency: Number(scope.navigator?.hardwareConcurrency ?? 0),
    deviceMemory: Number(scope.navigator?.deviceMemory ?? 0)
  });
}

export function chooseExportPlan(capabilities, request = {}) {
  const ratio = request.aspectRatio ?? '9:16';
  const highCapacity = capabilities.hardwareConcurrency >= 6 && capabilities.deviceMemory >= 6;
  if (capabilities.webCodecs) {
    return Object.freeze({
      mode: 'on-device-webcodecs',
      muxer: 'mediabunny',
      width: ratio === '9:16' ? (highCapacity ? 1080 : 720) : (highCapacity ? 1920 : 1280),
      height: ratio === '9:16' ? (highCapacity ? 1920 : 1280) : (highCapacity ? 1080 : 720),
      fps: highCapacity ? 30 : 24,
      serverFallback: true
    });
  }
  if (capabilities.mediaRecorder) {
    return Object.freeze({
      mode: 'on-device-mediarecorder',
      muxer: 'browser',
      width: ratio === '9:16' ? 720 : 1280,
      height: ratio === '9:16' ? 1280 : 720,
      fps: 24,
      serverFallback: true
    });
  }
  return Object.freeze({
    mode: 'server-render-required',
    muxer: 'server',
    width: ratio === '9:16' ? 1080 : 1920,
    height: ratio === '9:16' ? 1920 : 1080,
    fps: 30,
    serverFallback: true
  });
}
