import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshGame,draw,strip,label} from '../game.mjs';
test('draws all 75 numbers without repetition and stops',()=>{const game=freshGame();for(let i=0;i<75;i++)draw(game);assert.equal(new Set(game.draws).size,75);assert.deepEqual([...game.draws].sort((a,b)=>a-b),Array.from({length:75},(_,i)=>i+1));assert.throws(()=>draw(game));});
test('pause prevents drawing',()=>{const game=freshGame();game.paused=true;assert.throws(()=>draw(game));assert.equal(game.draws.length,0);});
test('printed strips cover all 75 numbers once with correct columns and no free centre',()=>{for(let i=0;i<100;i++){const cards=strip();assert.equal(cards.length,3);assert.equal(new Set(cards.flat(2)).size,75);for(const card of cards){assert.equal(card.flat().length,25);for(const row of card)row.forEach((n,c)=>assert.ok(n>=c*15+1&&n<=c*15+15));}}});
test('letter boundaries',()=>{assert.equal(label(15),'B 15');assert.equal(label(16),'I 16');assert.equal(label(75),'O 75');});
