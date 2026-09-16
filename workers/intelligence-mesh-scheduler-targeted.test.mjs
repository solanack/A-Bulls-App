import test from 'node:test';
import assert from 'node:assert/strict';
import { claimQueuedHistoryJobs, historyRetrySeconds } from './intelligence-mesh-scheduler.mjs';

function mockDb(rows=[]){
  const calls=[];
  return {
    calls,
    prepare(sql){
      const statement={sql,args:[]};calls.push(statement);
      return {
        bind(...args){statement.args=args;return this;},
        async all(){return {results:rows};},
        async run(){return {meta:{changes:1}};}
      };
    }
  };
}

test('targeted Replay claims only requested queued history job ids',async()=>{
  const db=mockDb([{id:42,wallet:'11111111111111111111111111111111',cursor_before:null,page_size:25,requested_from:100,requested_to:200}]);
  const claimed=await claimQueuedHistoryJobs(db,2,[42,42,0,-1]);
  assert.equal(claimed.length,1);
  assert.equal(claimed[0].id,42);
  assert.match(db.calls[0].sql,/id IN \(\?\)/);
  assert.equal(db.calls[0].args[1],42);
  assert.equal(db.calls[0].args.at(-1),2);
  assert.match(db.calls[1].sql,/id=\? AND state='queued'/);
  assert.deepEqual(db.calls[1].args,[42]);
});

test('cron scheduler claim remains general when no requested ids are supplied',async()=>{
  const db=mockDb([]);
  const claimed=await claimQueuedHistoryJobs(db,3,[]);
  assert.deepEqual(claimed,[]);
  assert.doesNotMatch(db.calls[0].sql,/id IN/);
  assert.equal(db.calls[0].args.length,2);
  assert.equal(db.calls[0].args[1],3);
});

test('Replay history retry cadence honors the bounded production configuration',()=>{
  assert.equal(historyRetrySeconds({INTELLIGENCE_HISTORY_RETRY_SECONDS:'5'}),5);
  assert.equal(historyRetrySeconds({INTELLIGENCE_HISTORY_RETRY_SECONDS:'1'}),3);
  assert.equal(historyRetrySeconds({INTELLIGENCE_HISTORY_RETRY_SECONDS:'999'}),120);
});
