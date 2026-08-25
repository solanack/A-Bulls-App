import { manifestDisclosures, validateStoryManifest } from '../js/trickster-story-manifest.mjs';

const MAX_BODY_BYTES = 512 * 1024;
const json = (body,status=200) => new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  }
});

function enabled(env={}) {
  return String(env.TRICKSTER_STUDIO_ENABLED||'').trim().toLowerCase()==='true';
}

async function readBoundedJson(request) {
  const declared=Number(request.headers.get('content-length')||0);
  if(Number.isFinite(declared)&&declared>MAX_BODY_BYTES) {
    throw new RangeError('manifest_too_large');
  }
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES) {
    throw new RangeError('manifest_too_large');
  }
  try { return JSON.parse(raw); }
  catch { throw new SyntaxError('invalid_json'); }
}

export async function handleTricksterRequest(request,env={}) {
  const url=new URL(request.url);
  if(url.pathname!=='/api/intelligence/trickster/validate') return null;
  if(request.method!=='POST') return json({ok:false,error:'method_not_allowed'},405);
  if(!enabled(env)) return json({ok:false,error:'feature_disabled'},404);

  try {
    const input=await readBoundedJson(request);
    const manifest=validateStoryManifest(input);
    return json({
      ok:true,
      persisted:false,
      publishable:true,
      manifest,
      disclosures:manifestDisclosures(manifest)
    });
  } catch(error) {
    const code=error instanceof RangeError&&error.message==='manifest_too_large'
      ? 'manifest_too_large'
      : error instanceof SyntaxError&&error.message==='invalid_json'
        ? 'invalid_json'
        : 'invalid_manifest';
    const status=code==='manifest_too_large'?413:400;
    return json({
      ok:false,
      error:code,
      message:code==='invalid_manifest'?String(error?.message||error):undefined
    },status);
  }
}
