export const WIDTH = 360
export const HEIGHT = 510
export const SCORE_PER_SECOND = 1
const clamp = (x, min, max) => Math.max(min, Math.min(max, x))

export function difficultyAt(seconds) {
  const level = Math.min(3, 1 + Math.floor(Math.max(0, seconds) / 10))
  return { level, interval: 2.15 - (level - 1) * 0.25, speed: 175 + Math.min(30, Math.max(0, seconds)) * 2.5 }
}

export function createGame(random = Math.random) {
  return { status: 'ready', elapsed: 0, score: 0, dodged: 0, player: { x: WIDTH / 2, y: HEIGHT - 62, w: 28, h: 28 }, obstacles: [], spawnIn: 0.55, accumulator: 0, random }
}

export function intersects(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h
}

// Each 1 is an individual rectangular obstacle, not a painted silhouette.
export const FORMATIONS = {
 heart: ['01100110','11111111','11111111','01111110','00111100','00011000'],
 flower: ['000111000','000111000','110010011','111111111','110111011','000111000','000010000','000110000','000010000'],
 waterfall: ['1111111','1010101','1010101','1010101','1010101','1010101','1010101','1010101','1010101','1010101'],
 arrow: ['0001000','0011100','0111110','1111111','0001000','0001000','0001000'],
 diamond: ['0001000','0011100','0110110','1100011','0110110','0011100','0001000']
}
export const CELL_SIZE = 12
export const CELL_PITCH = 16
export const hitsObstacle = intersects

export function formationBlocks(name, center, top, speed, mirror = false) {
 const rows = FORMATIONS[name]
 const width = (rows[0].length - 1) * CELL_PITCH + CELL_SIZE
 const blocks = []
 rows.forEach((row, r)=>[...row].forEach((cell,c)=>{
  if(cell==='1')blocks.push({x:center-width/2+CELL_SIZE/2+(mirror?row.length-1-c:c)*CELL_PITCH,
   y:top+CELL_SIZE/2+r*CELL_PITCH,w:CELL_SIZE,h:CELL_SIZE,speed,formation:name})
 }))
 return blocks
}
export function createFormation(random, speed) {
 const names = Object.keys(FORMATIONS)
 const sample = ()=>clamp(random(),0,.999999)
 const name = names[Math.floor(sample()*names.length)]
 const rows = FORMATIONS[name]
 const width = (rows[0].length - 1) * CELL_PITCH + CELL_SIZE
 const height = (rows.length - 1) * CELL_PITCH + CELL_SIZE
 // Explicitly mix edge-aligned and interior formations: every pattern stays
 // recognizable on screen, while both edges remain exposed to real blocks.
 const placement=sample(), offset=sample()
 const left=placement<.3?0:placement<.6?WIDTH-width:offset*(WIDTH-width)
 return formationBlocks(name,left+width/2,-height,speed,sample()<.5)
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
      game.obstacles.push(...createFormation(game.random, difficulty.speed))
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
