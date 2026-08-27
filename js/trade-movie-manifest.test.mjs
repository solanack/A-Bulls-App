import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTradeMovieManifest,tradeMovieDisclosures,__tradeMovieContract} from './trade-movie-manifest.mjs';

const evidence=[{id:'e1',signature:'sig1',source:'helius',blockTime:100}];
const coverage={from:100,to:200,verifiedPercent:80,statement:'Partial indexed coverage.'};

test('observed flight segment requires evidence',()=>{
  assert.throws(()=>validateTradeMovieManifest({id:'m',storyType:'massive-win',subject:{kind:'wallet',id:'w'},evidence,coverage,segments:[{type:'flight',startMs:0,durationMs:100,observed:true,evidenceIds:[]}]}),/requires evidence/);
});

test('simulation must be explicitly non-observed and disclosed',()=>{
  assert.throws(()=>validateTradeMovieManifest({id:'m',storyType:'custom',subject:{kind:'wallet',id:'w'},evidence,coverage,segments:[{type:'simulation',startMs:0,durationMs:100,observed:true,evidenceIds:['e1']}]}),/cannot be observed/);
  assert.throws(()=>validateTradeMovieManifest({id:'m',storyType:'custom',subject:{kind:'wallet',id:'w'},evidence,coverage,segments:[{type:'simulation',startMs:0,durationMs:100,observed:false,evidenceIds:[]}]}),/requires disclosure/);
});

test('valid trade movie preserves provenance and coverage disclosure',()=>{
  const m=validateTradeMovieManifest({id:'movie-1',storyType:'massive-win',subject:{kind:'wallet',id:'w'},evidence,coverage,segments:[{id:'f',type:'flight',startMs:0,durationMs:1000,observed:true,evidenceIds:['e1']},{id:'s',type:'simulation',startMs:1000,durationMs:500,observed:false,evidenceIds:[],disclosure:'What If simulation.'}]});
  assert.equal(m.evidence[0].signature,'sig1');assert.deepEqual(tradeMovieDisclosures(m),['Partial indexed coverage.','What If simulation.']);
});

test('contract locks creator integrity',()=>{
  assert.equal(__tradeMovieContract.evidenceRequiredForObservedSegments,true);assert.equal(__tradeMovieContract.simulationMustBeDisclosed,true);assert.equal(__tradeMovieContract.noBlockchainDataDuplication,true);
});
