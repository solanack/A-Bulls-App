import test from 'node:test';
import assert from 'node:assert/strict';
import { TricksterValidationError,validateStoryForExport } from './trickster-validation-client.mjs';

const manifest={
  id:'story-1',storyType:'transaction-replay',
  subject:{kind:'transaction',id:'sig-1'},
  coverage:{from:1,to:2,verifiedPercent:100,statement:'Verified selected range.'},
  evidence:[{id:'e-1',signature:'sig-1',source:'rpc'}],
  claims:[{id:'c-1',kind:'observed',statement:'Observed transaction.',evidenceIds:['e-1']}],
  scenes:[{id:'s-1',type:'evidence',durationFrames:30,claimIds:['c-1']}],
  output:{aspectRatio:'9:16',rendererVersion:'trickster-v1'}
};

test('server validation is required before export handoff',async()=>{
  let request;
  const result=await validateStoryForExport(manifest,{
    apiBase:'https://api.example/',
    fetchImpl:async(url,init)=>{
      request={url,init};
      return new Response(JSON.stringify({ok:true,persisted:false,manifest,disclosures:[]}),{
        status:200,headers:{'content-type':'application/json'}
      });
    }
  });
  assert.equal(request.url,'https://api.example/api/intelligence/trickster/validate');
  assert.equal(request.init.method,'POST');
  assert.equal(result.validated,true);
  assert.equal(result.videoReady,false);
});

test('disabled server does not silently authorize export',async()=>{
  await assert.rejects(
    validateStoryForExport(manifest,{fetchImpl:async()=>new Response(JSON.stringify({ok:false,error:'feature_disabled'}),{
      status:404,headers:{'content-type':'application/json'}
    })}),
    error=>error instanceof TricksterValidationError&&error.code==='feature_disabled'
  );
});

test('local manifest validation happens before network',async()=>{
  let called=false;
  await assert.rejects(validateStoryForExport({...manifest,claims:[]},{fetchImpl:async()=>{called=true;}}));
  assert.equal(called,false);
});
