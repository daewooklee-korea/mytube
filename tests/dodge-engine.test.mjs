import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, advance, intersects, difficultyAt, hitsObstacle, SHAPES, WIDTH } from '../public/games/dodge-engine.mjs'

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
test('survival continues beyond 30 seconds and scores keep increasing',()=>{
 const g=running();g.player.y=-100;advance(g,30.1);assert.equal(g.status,'running');assert.equal(g.score,30);advance(g,90);assert.equal(g.status,'running');assert.ok(Math.abs(g.elapsed-120.1)<1e-6);assert.equal(g.score,120)
})
test('paused simulation stays frozen; a new round resets everything',()=>{
 const g=running();advance(g,1);g.status='paused';const before=JSON.stringify(g);advance(g,5,{direction:1});assert.equal(JSON.stringify(g),before);const fresh=createGame();assert.equal(fresh.elapsed,0);assert.equal(fresh.score,0);assert.equal(fresh.obstacles.length,0);assert.equal(fresh.player.x,180)
})
test('points depend only on time, never on passed boxes',()=>{
 const g=running();g.obstacles=[{x:36,y:530,w:38,h:28,speed:0}];advance(g,.5);assert.equal(g.dodged,1);assert.equal(g.score,0);advance(g,.5);assert.equal(g.score,1)
})
test('waves grow from one to two to three distinct boxes, spread across the arena',()=>{
 for(const [t,count] of [[0,1],[9.99,1],[10,2],[19.99,2],[20,3],[30,3]])assert.equal(difficultyAt(t).boxesPerWave,count)
 for(const [t,count] of [[0,1],[10,2],[20,3]]){const g=running();g.elapsed=t;g.spawnIn=0;advance(g,1/120);assert.equal(g.obstacles.length,count);assert.equal(new Set(g.obstacles.map(o=>o.x)).size,count)}
})

function seeded(seed) {
 return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
}
test('stationary players are hit across the arena, including old lane gaps and edges',()=>{
 for(const seed of [1,42,2026]) for(let x=18;x<=342;x+=3){
  const g=running(seeded(seed));g.player.x=x;advance(g,120)
  assert.equal(g.status,'lost',`stationary x=${x}, seed=${seed}`)
 }
})
test('spawn positions vary continuously and cover both edges with partially visible blocks',()=>{
 const g=running(seeded(42));g.player.y=-100;const positions=[]
 for(let i=0;i<100;i++){g.spawnIn=0;advance(g,1/120);positions.push(...g.obstacles.map(o=>o.x));g.obstacles=[]}
 assert.equal(new Set(positions).size,100)
 assert.ok(positions.every(x=>x>=-19&&x<=WIDTH+19))
 assert.ok(positions.some(x=>x>60&&x<84),'old safe gap receives blocks')
})

test('all ten shapes spawn and collision follows visible outlines',()=>{
 const g=running(seeded(123));g.player.y=-100;const shapes=new Set()
 for(let i=0;i<200;i++){g.spawnIn=0;advance(g,1/120);g.obstacles.forEach(o=>shapes.add(o.shape));g.obstacles=[]}
 assert.deepEqual([...shapes].sort(),[...SHAPES].sort())
 for(const shape of SHAPES){
  const o={x:0,y:0,w:38,h:38,shape}
  assert.equal(hitsObstacle({x:0,y:0,w:4,h:4},o),true)
  if(['circle','triangle','diamond','hexagon'].includes(shape))assert.equal(hitsObstacle({x:18,y:-18,w:2,h:2},o),false)
 }
})

test('heart notch and star gaps remain empty while lobes and tips collide',()=>{
 const hit=(shape,x,y)=>hitsObstacle({x,y,w:1,h:1},{x:0,y:0,w:100,h:100,shape})
 assert.equal(hit('heart',0,-40),false)
 assert.equal(hit('heart',27,-40),true)
 assert.equal(hit('heart',0,40),true)
 assert.equal(hit('star',0,-45),true)
 assert.equal(hit('star',25,-30),false)
 assert.equal(hit('star',0,0),true)
})

test('flower petals and waterfall height use their visible collision geometry',()=>{
 const flower={x:0,y:0,w:100,h:100,shape:'flower'}
 assert.equal(hitsObstacle({x:0,y:-45,w:1,h:1},flower),true)
 assert.equal(hitsObstacle({x:25,y:-43.3,w:1,h:1},flower),false)
 const waterfall={x:0,y:0,w:38,h:64,shape:'waterfall'}
 assert.equal(hitsObstacle({x:0,y:30,w:1,h:1},waterfall),true)
 assert.equal(hitsObstacle({x:21,y:0,w:1,h:1},waterfall),false)
 const g=running(()=>.999999);g.spawnIn=0;advance(g,1/120)
 assert.equal(g.obstacles[0].shape,'waterfall');assert.equal(g.obstacles[0].h,64)
})

function balancedRandom(seed) {
 return ()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}
}
test('edge camping has comparable survival time to interior positions',()=>{
 const means=[18,90,180,270,342].map(x=>{
  let total=0
  for(let seed=1;seed<=1000;seed++){
   const g=running(balancedRandom(seed));g.player.x=x;advance(g,120)
   assert.equal(g.status,'lost');total+=g.elapsed
  }
  return total/1000
 })
 const interior=(means[1]+means[2]+means[3])/3
 for(const edge of [means[0],means[4]])assert.ok(edge/interior>.8&&edge/interior<1.2,JSON.stringify(means))
})
