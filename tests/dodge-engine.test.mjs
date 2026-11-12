import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, advance, intersects, WIDTH } from '../public/games/dodge-engine.mjs'

const running = (random = () => 0) => Object.assign(createGame(random), { status: 'running' })
test('same elapsed time, movement and score at 30, 60 and 144 FPS', () => {
  const games = [30,60,144].map(fps=>{const g=running();for(let i=0;i<fps*2;i++)advance(g,1/fps,{direction:1});return g})
  for(const g of games){assert.ok(Math.abs(g.elapsed-2)<1e-8);assert.equal(g.player.x,WIDTH-18);assert.equal(g.score,games[0].score);assert.equal(g.obstacles.length,games[0].obstacles.length)}
})
test('release stops movement; both boundaries remain in arena',()=>{
 const g=running();advance(g,.2,{direction:1});const x=g.player.x;advance(g,.2);assert.equal(g.player.x,x);advance(g,1,{direction:-1});assert.equal(g.player.x,18)
})
test('target uses bounded movement, cannot teleport across blocks',()=>{
 const g=running();g.player.x=50;g.obstacles=[{x:80,y:g.player.y,w:38,h:28,speed:0}];advance(g,.2,{target:300});assert.equal(g.status,'lost');assert.ok(g.player.x<80)
})
test('near miss survives; body contact ends round',()=>{
 assert.equal(intersects({x:0,y:0,w:28,h:28},{x:34,y:0,w:38,h:28}),false)
 const g=running();g.obstacles=[{x:g.player.x,y:g.player.y,w:38,h:28,speed:0}];advance(g,1/60);assert.equal(g.status,'lost');const elapsed=g.elapsed;advance(g,10);assert.equal(g.elapsed,elapsed)
})
test('30 seconds wins and freezes score/time',()=>{
 const g=running();advance(g,30.1);assert.equal(g.status,'won');assert.equal(g.elapsed,30);const score=g.score;advance(g,10);assert.equal(g.score,score)
})
test('paused simulation stays frozen; a new round resets everything',()=>{
 const g=running();advance(g,1);g.status='paused';const before=JSON.stringify(g);advance(g,5,{direction:1});assert.equal(JSON.stringify(g),before);const fresh=createGame();assert.equal(fresh.elapsed,0);assert.equal(fresh.score,0);assert.equal(fresh.obstacles.length,0);assert.equal(fresh.player.x,180)
})
test('passing blocks grants 20 points, only once',()=>{
 const g=running();g.obstacles=[{x:36,y:530,w:38,h:28,speed:0}];advance(g,1/120);assert.equal(g.dodged,1);assert.equal(g.score,20);advance(g,1/120);assert.equal(g.dodged,1)
})
