export const WIDTH = 360
export const HEIGHT = 510
export const GOAL = 30
export const SCORE_PER_SECOND = 1
const clamp = (x, min, max) => Math.max(min, Math.min(max, x))

export function difficultyAt(seconds) {
  const level = Math.min(3, 1 + Math.floor(Math.max(0, seconds) / 10))
  return { level, boxesPerWave: level, interval: 0.9 - (level - 1) * 0.12, speed: 175 + Math.min(GOAL, Math.max(0, seconds)) * 2.5 }
}

export function createGame(random = Math.random) {
  return { status: 'ready', elapsed: 0, score: 0, dodged: 0, player: { x: WIDTH / 2, y: HEIGHT - 62, w: 28, h: 28 }, obstacles: [], spawnIn: 0.55, accumulator: 0, random }
}

export function intersects(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h
}

// Fixed simulation steps keep the timer, speed and collision checks independent of refresh rate.
export function advance(game, seconds, input = {}) {
  if (game.status !== 'running' || !Number.isFinite(seconds) || seconds <= 0) return game
  game.accumulator += seconds
  const dt = 1 / 120
  while (game.accumulator + 1e-10 >= dt && game.status === 'running') {
    game.accumulator -= dt
    const remaining = GOAL - game.elapsed
    const step = Math.min(dt, remaining)
    const direction = clamp(input.direction || 0, -1, 1)
    const target = Number.isFinite(input.target) ? clamp(input.target, 18, WIDTH - 18) : null
    const movement = target !== null ? clamp(target - game.player.x, -310 * step, 310 * step) : direction * 310 * step
    game.player.x = clamp(game.player.x + movement, 18, WIDTH - 18)
    game.elapsed = Math.min(GOAL, game.elapsed + step)
    game.spawnIn -= step
    if (game.spawnIn <= 0) {
      const difficulty = difficultyAt(game.elapsed)
      const lanes = [0, 1, 2, 3, 4]
      for (let i = 0; i < difficulty.boxesPerWave; i++) {
        const index = Math.floor(clamp(game.random(), 0, 0.999999) * lanes.length)
        const lane = lanes.splice(index, 1)[0]
        game.obstacles.push({ x: 36 + lane * 72, y: -25, w: 38, h: 28, speed: difficulty.speed })
      }
      game.spawnIn += difficulty.interval
    }
    for (const obstacle of game.obstacles) {
      obstacle.y += obstacle.speed * step
      if (intersects(game.player, obstacle)) game.status = 'lost'
    }
    const passed = game.obstacles.filter(o => o.y - o.h / 2 > HEIGHT)
    game.dodged += passed.length
    game.obstacles = game.obstacles.filter(o => o.y - o.h / 2 <= HEIGHT)
    game.score = Math.floor((game.elapsed + 1e-8) * SCORE_PER_SECOND)
    // Contact on the final step is a collision, not a successful survival.
    if (game.status === 'running' && game.elapsed >= GOAL - 1e-8) { game.elapsed = GOAL; game.status = 'won' }
  }
  return game
}
