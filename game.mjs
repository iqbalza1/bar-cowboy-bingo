import { randomInt, randomUUID } from 'node:crypto';
export function freshGame(){return {id:randomUUID(),draws:[],stage:0,paused:false,winners:[],updatedAt:new Date().toISOString()};}
export function draw(game){if(game.paused)throw Error('Resume the game before drawing.');const available=Array.from({length:75},(_,i)=>i+1).filter(n=>!game.draws.includes(n));if(!available.length)throw Error('All 75 numbers have been called.');game.draws.push(available[randomInt(available.length)]);}
export function shuffle(values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function strip(){const columns=Array.from({length:5},(_,c)=>shuffle(Array.from({length:15},(_,i)=>c*15+i+1)));return Array.from({length:3},(_,card)=>Array.from({length:5},(_,r)=>columns.map(col=>col[card*5+r])));}
export function label(n){return n?`${'BINGO'[Math.floor((n-1)/15)]} ${n}`:'—';}
