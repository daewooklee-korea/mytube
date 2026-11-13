import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, advance, intersects, difficultyAt, hitsObstacle, FORMATIONS, formationBlocks, createFormation, WIDTH } from '../public/games/dodge-engine.mjs'

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
test('difficulty increases formation cadence and speed without overlapping entire waves',()=>{
 for(const t of [0,10,20,30]){
  const d=difficultyAt(t)
  const maxHeight=Math.max(...Object.values(FORMATIONS).map(rows=>rows.length*16))
  assert.ok(d.interval*d.speed>maxHeight+28+60)
 }
 assert.ok(difficultyAt(20).interval<difficultyAt(0).interval)
})
test('every formation is made of distinct small rectangular blocks',()=>{
 for(const [name,rows] of Object.entries(FORMATIONS)){
  const blocks=formationBlocks(name,180,0,200)
  assert.equal(blocks.length,rows.join('').replaceAll('0','').length)
  assert.ok(blocks.length>15)
  assert.ok(blocks.every(b=>b.w===12&&b.h===12&&b.formation===name))
  assert.equal(new Set(blocks.map(b=>`${b.x},${b.y}`)).size,blocks.length)
 }
})
test('empty spaces inside a formation do not collide, occupied cells do',()=>{
 const blocks=formationBlocks('diamond',180,0,200)
 assert.equal(blocks.some(b=>hitsObstacle({x:180,y:54,w:2,h:2},b)),false)
 const block=blocks[0]
 assert.equal(hitsObstacle({x:block.x,y:block.y,w:2,h:2},block),true)
})
test('random formations cover all patterns, both edges and interior without clipping',()=>{
 const random=balancedRandom(42),names=new Set(),positions=new Set();let left=false,right=false
 for(let i=0;i<500;i++){
  const blocks=createFormation(random,200);names.add(blocks[0].formation)
  const min=Math.min(...blocks.map(b=>b.x-b.w/2)),max=Math.max(...blocks.map(b=>b.x+b.w/2))
  assert.ok(min>=-1e-8&&max<=WIDTH+1e-8)
  positions.add(min);left ||= min===0;right ||= max===WIDTH
 }
 assert.equal(names.size,Object.keys(FORMATIONS).length);assert.ok(left&&right);assert.ok(positions.size>100)
})
test('no stationary position survives indefinitely, including both edges',()=>{
 for(const seed of [1,42,2026])for(let x=18;x<=342;x+=6){
  const g=running(balancedRandom(seed));g.player.x=x;advance(g,120)
  assert.equal(g.status,'lost',`x=${x}, seed=${seed}`)
 }
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
