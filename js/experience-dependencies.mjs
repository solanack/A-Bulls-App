const ASSETS=Object.freeze({
  three:'../vendor/experience/three-0.185.0.module.min.js',
  mediabunny:'../vendor/experience/mediabunny-1.55.2.min.mjs'
});
const FALLBACK_ASSETS=Object.freeze({
  three:'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.min.js',
  mediabunny:'https://cdn.jsdelivr.net/npm/mediabunny@1.55.2/dist/bundles/mediabunny.min.mjs'
});

async function load(name,importer) {
  const local=ASSETS[name],fallback=FALLBACK_ASSETS[name];
  if(!local||!fallback) throw new RangeError(`unknown experience dependency: ${name}`);
  try { return await importer(local); }
  catch {
    try { return await importer(fallback); }
    catch { return null; }
  }
}

function preferStableMobileField(){
  return globalThis.matchMedia?.('(pointer: coarse)').matches===true && Math.min(globalThis.innerWidth||9999,globalThis.screen?.width||9999)<=900;
}

export function loadThree(importer=path=>import(path)) {
  // The mobile Particle Field uses the deterministic 2D renderer until the WebGL
  // path is proven across Android GPUs. This prevents the center-line shader artifact.
  if(preferStableMobileField())return Promise.resolve(null);
  return load('three',importer);
}

export function loadMediabunny(importer=path=>import(path)) {
  return load('mediabunny',importer);
}

export function experienceDependencyAssets() { return ASSETS; }
export function experienceDependencyFallbackAssets() { return FALLBACK_ASSETS; }
