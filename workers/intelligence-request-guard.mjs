const MAX_INTELLIGENCE_BODY_BYTES=1024*1024;
const INTELLIGENCE_PREFIX='/api/intelligence/';

function json(body,status,headers={}){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
}

function requestKey(request,url){
  const client=String(request.headers.get('CF-Connecting-IP')||request.headers.get('X-Forwarded-For')||'anonymous').split(',')[0].trim();
  const route=url.pathname.split('/').slice(0,5).join('/');
  return `${client}:${request.method}:${route}`.slice(0,256);
}

export async function guardIntelligenceRequest(request,env={}){
  const url=new URL(request.url);
  if(!url.pathname.startsWith(INTELLIGENCE_PREFIX))return null;
  const declared=Number(request.headers.get('content-length')||0);
  if(Number.isFinite(declared)&&declared>MAX_INTELLIGENCE_BODY_BYTES)return json({ok:false,error:'request_body_too_large'},413);
  if(env.RATE_LIMITER&&typeof env.RATE_LIMITER.limit==='function'){
    try{
      const result=await env.RATE_LIMITER.limit({key:requestKey(request,url)});
      if(result?.success===false)return json({ok:false,error:'rate_limited'},429,{'retry-after':'60'});
    }catch{
      // Binding availability is an infrastructure concern. Existing read-only routes stay available,
      // while deployment preflight requires the production binding before public release.
    }
  }
  return null;
}

export const __intelligenceRequestGuardContract=Object.freeze({maxBodyBytes:MAX_INTELLIGENCE_BODY_BYTES,prefix:INTELLIGENCE_PREFIX});
