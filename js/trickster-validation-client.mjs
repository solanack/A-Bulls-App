import { validateStoryManifest } from './trickster-story-manifest.mjs';

export class TricksterValidationError extends Error {
  constructor(code,message,status=0) {
    super(message||code);
    this.name='TricksterValidationError';
    this.code=code;
    this.status=status;
  }
}

export async function validateStoryForExport(manifest,{
  apiBase='',
  fetchImpl=globalThis.fetch,
  signal
}={}) {
  const canonical=validateStoryManifest(manifest);
  if(typeof fetchImpl!=='function') {
    throw new TricksterValidationError('validation_unavailable','Evidence validation is unavailable.');
  }
  const base=String(apiBase||'').replace(/\/$/,'');
  const response=await fetchImpl(`${base}/api/intelligence/trickster/validate`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(canonical),
    signal
  });
  let body={};
  try { body=await response.json(); } catch {}
  if(!response.ok||body.ok!==true||body.persisted!==false) {
    throw new TricksterValidationError(
      String(body.error||'validation_failed'),
      String(body.message||'Story evidence could not be validated.'),
      response.status
    );
  }
  return Object.freeze({
    validated:true,
    serverValidated:true,
    videoReady:false,
    persisted:false,
    manifest:body.manifest,
    disclosures:Object.freeze(body.disclosures||[])
  });
}
