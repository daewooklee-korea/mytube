export const WIDTH = 360
export const HEIGHT = 510
export const SCORE_PER_SECOND = 1
const clamp = (x, min, max) => Math.max(min, Math.min(max, x))

export function difficultyAt(seconds) {
  const level = Math.min(3, 1 + Math.floor(Math.max(0, seconds) / 10))
  return { level, boxesPerWave: level, interval: 0.9 - (level - 1) * 0.12, speed: 175 + Math.min(30, Math.max(0, seconds)) * 2.5 }
}

export function createGame(random = Math.random) {
  return { status: 'ready', elapsed: 0, score: 0, dodged: 0, player: { x: WIDTH / 2, y: HEIGHT - 62, w: 28, h: 28 }, obstacles: [], spawnIn: 0.55, accumulator: 0, random }
}

export function intersects(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h
}

export const SHAPES = ['rectangle', 'square', 'circle', 'triangle', 'diamond', 'hexagon', 'heart', 'star']
export function vertices(o) {
 const points = o.shape === 'heart' ? [[0,-.24],[.13,-.43],[.27,-.5],[.41,-.44],[.5,-.29],[.49,-.1],[.37,.1],[0,.5],[-.37,.1],[-.49,-.1],[-.5,-.29],[-.41,-.44],[-.27,-.5],[-.13,-.43]]
  : o.shape === 'star' ? Array.from({length:10},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/5,r=i%2?.22:.5;return [Math.cos(angle)*r,Math.sin(angle)*r]})
  : o.shape === 'triangle' ? [[0,-.5],[.5,.5],[-.5,.5]]
  : o.shape === 'diamond' ? [[0,-.5],[.5,0],[0,.5],[-.5,0]]
  : o.shape === 'hexagon' ? [[-.25,-.5],[.25,-.5],[.5,0],[.25,.5],[-.25,.5],[-.5,0]]
  : [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]
 return points.map(([x,y])=>({x:o.x+x*o.w,y:o.y+y*o.h}))
}
export function hitsObstacle(player, obstacle) {
 if (!intersects(player, obstacle)) return false
 if (obstacle.shape === 'circle') {
  const dx = Math.max(0, Math.abs(player.x-obstacle.x)-player.w/2)
  const dy = Math.max(0, Math.abs(player.y-obstacle.y)-player.h/2)
  return dx*dx+dy*dy < (obstacle.w/2)**2
 }
 const a=vertices(player), b=vertices(obstacle)
 // Concave silhouettes are a union of triangles, preserving their empty
 // notches rather than treating the whole convex hull as solid.
 if(obstacle.shape==='heart'||obstacle.shape==='star'){
  return b.some((point,i)=>polygonsIntersect(a,[{x:obstacle.x,y:obstacle.y},point,b[(i+1)%b.length]]))
 }
 return polygonsIntersect(a,b)
}
function polygonsIntersect(a,b) {
 for(const polygon of [a,b]) for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length],axis={x:q.y-p.y,y:p.x-q.x}
  const project=points=>points.map(v=>v.x*axis.x+v.y*axis.y)
  const pa=project(a),pb=project(b)
  if(Math.max(...pa)<=Math.min(...pb)||Math.max(...pb)<=Math.min(...pa))return false
 }
 return true
}

// Fixed simulation steps keep the timer, speed and collision checks independent of refresh rate.
export function advance(game, seconds, input = {}) {
  if (game.status !== 'running' || !Number.isFinite(seconds) || seconds <= 0) return game
  game.accumulator += seconds
  const dt = 1 / 120
  while (game.accumulator + 1e-10 >= dt && game.status === 'running') {
    game.accumulator -= dt
    const step = dt
    const direction = clamp(input.direction || 0, -1, 1)
    const target = Number.isFinite(input.target) ? clamp(input.target, 18, WIDTH - 18) : null
    const movement = target !== null ? clamp(target - game.player.x, -310 * step, 310 * step) : direction * 310 * step
    game.player.x = clamp(game.player.x + movement, 18, WIDTH - 18)
    game.elapsed += step
    game.spawnIn -= step
    if (game.spawnIn <= 0) {
      const difficulty = difficultyAt(game.elapsed)
      // Jitter across the entire arena instead of five fixed lanes. Each
      // wave gets one sample per band, so blocks spread out without leaving
      // permanent gaps between columns (including at the arena edges).
      const width = 38
      const span = WIDTH - width
      for (let i = 0; i < difficulty.boxesPerWave; i++) {
        const sample = clamp(game.random(), 0, 0.999999)
        const x = width / 2 + (i + sample) * span / difficulty.boxesPerWave
        const shape = SHAPES[Math.floor(clamp(game.random(), 0, 0.999999) * SHAPES.length)]
        game.obstacles.push({ x, y: -25, shape, w: width, h: shape === 'rectangle' ? 28 : width, speed: difficulty.speed })
      }
      game.spawnIn += difficulty.interval
    }
    for (const obstacle of game.obstacles) {
      obstacle.y += obstacle.speed * step
      if (hitsObstacle(game.player, obstacle)) game.status = 'lost'
    }
    const passed = game.obstacles.filter(o => o.y - o.h / 2 > HEIGHT)
    game.dodged += passed.length
    game.obstacles = game.obstacles.filter(o => o.y - o.h / 2 <= HEIGHT)
    game.score = Math.floor((game.elapsed + 1e-8) * SCORE_PER_SECOND)
  }
  return game
}
