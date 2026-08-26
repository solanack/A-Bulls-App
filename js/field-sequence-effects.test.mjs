import test from 'node:test';
import assert from 'node:assert/strict';
import {marketPhaseFieldEffect} from './field-sequence-effects.mjs';

test('phase field effect is derived from bounded descriptive counts only',()=>{const effect=marketPhaseFieldEffect({id:'phase-2',label:'PHASE 2',from:100,to:200,eventCount:100,walletCount:20,buyCount:60,sellCount:40});assert.equal(effect.phaseId,'phase-2');assert.equal(effect.eventCount,100);assert.equal(effect.walletCount,20);assert.equal(effect.buyShare,.6);assert.ok(effect.scale>1);assert.match(effect.disclosure,/not a market-regime/i);});
test('phase effect stays neutral when buy sell evidence is absent',()=>{const effect=marketPhaseFieldEffect({eventCount:3,walletCount:2,buyCount:0,sellCount:0});assert.equal(effect.buyShare,.5);assert.equal(effect.rotation,0);});
test('phase intensity and scale remain bounded for large counts',()=>{const effect=marketPhaseFieldEffect({eventCount:1e9,walletCount:1e6,buyCount:1e6,sellCount:1});assert.ok(effect.density<=1);assert.ok(effect.participation<=1);assert.ok(effect.scale<=1.36);assert.ok(effect.intensity<=1.2);});
