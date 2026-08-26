import test from 'node:test';
import assert from 'node:assert/strict';
import { createOldFaithfulJsonRpcTransport } from './old-faithful-jsonrpc-transport.mjs';

const wallet='11111111111111111111111111111111';
const response=body=>new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:body}),{status:200,headers:{'content-type':'application/json'}});

test('filters rows to requested time range and verifies after crossing lower bound',async()=>{
  const calls=[];
  const pages=[[
    {signature:'s5',slot:5,blockTime:500},{signature:'s4',slot:4,blockTime:400},{signature:'s3',slot:3,blockTime:300}
  ],[
    {signature:'s2',slot:2,blockTime:200},{signature:'s1',slot:1,blockTime:100}
  ]];
  const transport=createOldFaithfulJsonRpcTransport({endpoint:'https://archive.example',pageSize:3,maxPages:5,fetchImpl:async(_url,init)=>{calls.push(JSON.parse(init.body));return response(pages.shift()||[]);}});
  const result=await transport({wallet,requestedFrom:150,requestedTo:350});
  assert.equal(result.rangeVerified,true);
  assert.deepEqual(result.rows.map(row=>row.signature),['s2','s3']);
  assert.equal(result.pages,2);
  assert.equal(calls[1].params[1].before,'s3');
});

test('verified zero rows stays a bounded provider search rather than no-activity claim',async()=>{
  const transport=createOldFaithfulJsonRpcTransport({endpoint:'https://archive.example',fetchImpl:async()=>response([])});
  const result=await transport({wallet,requestedFrom:100,requestedTo:200});
  assert.equal(result.rangeVerified,true);
  assert.deepEqual(result.rows,[]);
  assert.match(result.disclosure,/provider search/i);
  assert.doesNotMatch(result.disclosure,/no activity/i);
});

test('fails closed when page budget ends before the lower boundary is crossed',async()=>{
  const transport=createOldFaithfulJsonRpcTransport({endpoint:'https://archive.example',pageSize:2,maxPages:1,fetchImpl:async()=>response([{signature:'new-2',slot:2,blockTime:500},{signature:'new-1',slot:1,blockTime:400}])});
  await assert.rejects(()=>transport({wallet,requestedFrom:100,requestedTo:200}),/page_budget_exhausted/);
});

test('rejects invalid wallets and non-http endpoints before retrieval',async()=>{
  assert.throws(()=>createOldFaithfulJsonRpcTransport({endpoint:'file:///archive'}),/endpoint_required/);
  const transport=createOldFaithfulJsonRpcTransport({endpoint:'https://archive.example',fetchImpl:async()=>response([])});
  await assert.rejects(()=>transport({wallet:'not-a-wallet',requestedFrom:1,requestedTo:2}),/valid_public_wallet/);
});

test('fails closed on JSON-RPC errors',async()=>{
  const transport=createOldFaithfulJsonRpcTransport({endpoint:'https://archive.example',fetchImpl:async()=>new Response(JSON.stringify({jsonrpc:'2.0',id:1,error:{code:-32603,message:'archive unavailable'}}),{status:200})});
  await assert.rejects(()=>transport({wallet,requestedFrom:1,requestedTo:2}),/old_faithful_rpc_-32603/);
});
