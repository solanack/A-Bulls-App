import test from 'node:test';
import assert from 'node:assert/strict';
import { drawTricksterCaption } from './trickster-caption-renderer.mjs';

function ctx(){const texts=[];return{canvas:{width:1080,height:1920},texts,save(){},restore(){},beginPath(){},roundRect(){},rect(){},fill(){},measureText(value){return{width:String(value).length*12};},fillText(value){texts.push(String(value));},set globalAlpha(v){this._alpha=v;},set fillStyle(v){this._fill=v;},set font(v){this._font=v;}};}

test('draws provenance label, caption and disclosure',()=>{const context=ctx();drawTricksterCaption(context,{label:'SIMULATION',text:'Mirrored timing only.',disclosure:'Not observed history.'});assert.ok(context.texts.includes('SIMULATION'));assert.ok(context.texts.includes('Mirrored timing only.'));assert.ok(context.texts.includes('Not observed history.'));});
