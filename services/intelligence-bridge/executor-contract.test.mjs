import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHistoricalTask, verifiedExecutorResult, createHistoricalExecutor } from './executor-contract.mjs';

const task={taskId:9,wallet:'11111111111111111111111111111111',source:'archive-a',sourceKind:'old-faithful',requestedFrom:100,requestedTo:200};

test('normalizes only supported bounded historical tasks',()=>{
  assert.deepEqual(normalizeHistoricalTask(task),task);
  assert.throws(()=>normalizeHistoricalTask({...task,sourceKind:'yellowstone'}),/unsupported_historical_executor_kind/);
  assert.throws(()=>normalizeHistoricalTask({...task,requestedFrom:300,requestedTo:200}),/valid_requested_window_required/);
});

test('verified result must cover the entire requested interval',()=>{
  const result=verifiedExecutorResult(task,{rows:[],searchedFrom:90,searchedTo:210,rangeVerified:true});
  assert.equal(result.rangeVerified,true);
  assert.equal(result.observedRows,0);
  assert.throws(()=>verifiedExecutorResult(task,{rows:[],searchedFrom:101,searchedTo:210,rangeVerified:true}),/provider_range_does_not_cover_task/);
  assert.throws(()=>verifiedExecutorResult(task,{rows:[],searchedFrom:90,searchedTo:210,rangeVerified:false}),/provider_range_verification_required/);
});

test('executor rejects cross-kind dispatch and unverified provider output',async()=>{
  const executor=createHistoricalExecutor({kind:'old-faithful',retrieve:async()=>({rows:[{signature:'sig'}],searchedFrom:100,searchedTo:200,rangeVerified:true})});
  const result=await executor(task);
  assert.equal(result.rows.length,1);
  await assert.rejects(()=>executor({...task,sourceKind:'substreams'}),/executor_source_kind_mismatch/);
  const unsafe=createHistoricalExecutor({kind:'old-faithful',retrieve:async()=>({rows:[],searchedFrom:100,searchedTo:200})});
  await assert.rejects(()=>unsafe(task),/provider_range_verification_required/);
});
