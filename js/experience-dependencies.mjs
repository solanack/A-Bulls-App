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

export function loadThree(importer=path=>import(path)) {
  return load('three',importer);
}

export function loadMediabunny(importer=path=>import(path)) {
  return load('mediabunny',importer);
}

export function experienceDependencyAssets() {
  return ASSETS;
}

export function experienceDependencyFallbackAssets() {
  return FALLBACK_ASSETS;
}
