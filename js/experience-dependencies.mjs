const ASSETS=Object.freeze({
  three:'../vendor/experience/three-0.185.0.module.min.js',
  mediabunny:'../vendor/experience/mediabunny-1.55.2.min.mjs'
});

async function load(name,importer) {
  const path=ASSETS[name];
  if(!path) throw new RangeError(`unknown experience dependency: ${name}`);
  try { return await importer(path); }
  catch { return null; }
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
