import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldFocusForEntity,findFieldEntity} from './field-entity-focus.mjs';

test('focus keeps the observed entity position and uses kind-specific camera distance',()=>{const focus=fieldFocusForEntity({id:'wallet-a',kind:'wallet',position:[4,-2,9]});assert.deepEqual(focus.target,[4,-2,9]);assert.equal(focus.distance,88);assert.match(focus.disclosure,/does not imply identity, ownership, coordination, intent, causation, importance, or future behavior/);});
test('finds only an exact loaded entity match and never fabricates one',()=>{const particles=[{id:'abc',kind:'wallet'},{id:'abc',kind:'token'},{id:'def',kind:'transaction'}];assert.equal(findFieldEntity(particles,{entityId:'abc',entityKind:'token'}),particles[1]);assert.equal(findFieldEntity(particles,{entityId:'missing'}),null);});
test('search query may focus an exact loaded entity but no fuzzy identity inference occurs',()=>{const particles=[{id:'ExactPublicKey',kind:'wallet'}];assert.equal(findFieldEntity(particles,{query:'ExactPublicKey'}),particles[0]);assert.equal(findFieldEntity(particles,{query:'Exact'}),null);});
