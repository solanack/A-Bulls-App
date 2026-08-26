import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStoryProject, TricksterProjectStoreLimits } from './trickster-project-store.mjs';

test('requires a stable project id',()=>{
  assert.throws(()=>normalizeStoryProject({manifest:{}}),/project id is required/);
});

test('freezes a public-evidence project record with retained coverage',()=>{
  const project=normalizeStoryProject({
    id:'story-1',
    storyType:'transaction-replay',
    subject:{signature:'sig'},
    coverage:{verifiedPercent:80,statement:'bounded'},
    manifest:{id:'story-1',storyType:'transaction-replay',coverage:{verifiedPercent:80}},
    bundle:{storyType:'transaction-replay',evidence:[{id:'e1'}]},
    timeline:{durationSeconds:10},
    sceneRuntime:[]
  });
  assert.equal(project.id,'story-1');
  assert.equal(project.coverage.verifiedPercent,80);
  assert.equal(project.schemaVersion,1);
  assert.match(project.disclosure,/saved locally/i);
  assert.equal(Object.isFrozen(project),true);
});

test('project store is explicitly bounded',()=>{
  assert.equal(TricksterProjectStoreLimits.maxProjects,12);
  assert.ok(TricksterProjectStoreLimits.maxBytes>0);
});
