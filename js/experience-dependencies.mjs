const ASSETS=Object.freeze({
  three:'../vendor/experience/three-0.185.0.module.min.js',
  mediabunny:'../vendor/experience/mediabunny-1.55.2.min.mjs'
});

function threeNamespace(mod) {
  if (mod && typeof mod.WebGLRenderer === 'function') return mod;
  if (mod?.default && typeof mod.default.WebGLRenderer === 'function') return mod.default;
  return null;
}

async function load(name,importer) {
  const path=ASSETS[name];
  if(!path) throw new RangeError(`unknown experience dependency: ${name}`);
  try { return await importer(path); }
  catch { return null; }
}

export async function loadThree(importer=path=>import(path)) {
  const paths=[ASSETS.three,'/vendor/experience/three-0.185.0.module.min.js'];
  const seen=new Set();
  for (const path of paths) {
    if (seen.has(path)) continue;
    seen.add(path);
    try {
      const ns = threeNamespace(await importer(path));
      if (ns) return ns;
    } catch {
      /* try the next pinned local path */
    }
  }
  return null;
}

export function loadMediabunny(importer=path=>import(path)) {
  return load('mediabunny',importer);
}

export function experienceDependencyAssets() {
  return ASSETS;
}
