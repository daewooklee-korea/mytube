export const WIDTH = 360
export const HEIGHT = 510
export const GOAL = 30
const clamp = (x, min, max) => Math.max(min, Math.min(max, x))

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
      const lane = Math.floor(clamp(game.random(), 0, 0.999999) * 5)
      game.obstacles.push({ x: 36 + lane * 72, y: -25, w: 38, h: 28, speed: 175 + game.elapsed * 3.3 })
      game.spawnIn += 0.67 - game.elapsed * 0.006
    }
    for (const obstacle of game.obstacles) {
      obstacle.y += obstacle.speed * step
      if (intersects(game.player, obstacle)) game.status = 'lost'
    }
    const passed = game.obstacles.filter(o => o.y - o.h / 2 > HEIGHT)
    game.dodged += passed.length
    game.obstacles = game.obstacles.filter(o => o.y - o.h / 2 <= HEIGHT)
    game.score = Math.floor((game.elapsed + 1e-8) * 100) + game.dodged * 20
    // Contact on the final step is a collision, not a successful survival.
    if (game.status === 'running' && game.elapsed >= GOAL - 1e-8) { game.elapsed = GOAL; game.status = 'won' }
  }
  return game
}
