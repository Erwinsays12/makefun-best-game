// The world: one state object, its creation, its reset, and its fixed-step
// advance. main.js owns the screens and the loop; this file owns what the
// game *is* between two frames. The title screen runs a quiet attract mode
// (drifting wisps and rising embers) over the same world.
import { ARENA, SUNBURST } from './config.js';
import { createRandom, range } from './random.js';
import { createPlayer, stepActors } from './entities.js';
import { dealSpawns, startWave } from './waves.js';

export function createWorld(seed, sfx, fx) {
  const g = {
    rng: createRandom(seed),
    sfx,
    fx,
    time: 0,
    phase: 'title',
    player: createPlayer(),
    enemies: [],
    bullets: [],
    ebullets: [],
    pickups: [],
    wave: 0,
    waveActive: false,
    spawn: null,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    kills: 0,
    sunburstCharges: SUNBURST.startCharges,
    boss: null,
    shake: 0,
    flash: 0,
    banner: null,
    upgradesTaken: {},
    choices: [],
    stats: { shots: 0, hits: 0 },
    emberTimer: 0,
  };
  return g;
}

/** A fresh run: same world object, new seed, everything cleared. */
export function resetRun(g, seed) {
  g.rng = createRandom(seed);
  g.time = 0;
  g.phase = 'play';
  g.player = createPlayer();
  g.enemies.length = 0;
  g.bullets.length = 0;
  g.ebullets.length = 0;
  g.pickups.length = 0;
  g.wave = 0;
  g.waveActive = false;
  g.spawn = null;
  g.score = 0;
  g.combo = 0;
  g.comboTimer = 0;
  g.kills = 0;
  g.sunburstCharges = SUNBURST.startCharges;
  g.boss = null;
  g.shake = 0;
  g.flash = 0;
  g.banner = null;
  g.upgradesTaken = {};
  g.choices = [];
  g.stats = { shots: 0, hits: 0 };
  startWave(g, 1);
}

/** Back to the title screen, with a fresh attract scene. */
export function toTitle(g) {
  g.phase = 'title';
  g.enemies.length = 0;
  g.bullets.length = 0;
  g.ebullets.length = 0;
  g.pickups.length = 0;
  g.wave = 0;
  g.waveActive = false;
  g.banner = null;
  g.flash = 0;
  g.shake = 0;
  for (let i = 0; i < 7; i += 1) {
    g.enemies.push({
      kind: 'mote',
      x: range(g.rng, ARENA.x + 60, ARENA.x + ARENA.width - 60),
      y: range(g.rng, ARENA.y + 60, ARENA.y + ARENA.height - 60),
      vx: 0,
      vy: 0,
      radius: 14,
      hp: 1,
      maxHp: 1,
      speed: 26,
      score: 0,
      colour: '#8b7ff0',
      glow: '#5a4fd0',
      shotTimer: 0,
      summonTimer: 0,
      burstTimer: 0,
      touchCooldown: 0,
      wobble: g.rng() * Math.PI * 2,
      flash: 0,
    });
  }
}

function stepTitle(g, dt) {
  g.time += dt;
  g.emberTimer -= dt;
  if (g.emberTimer <= 0) {
    g.emberTimer = 0.12;
    g.fx.trail(range(g.rng, 200, 1080), 700, Math.random() < 0.5 ? '#ffd866' : '#8b7ff0');
  }
  for (const wisp of g.enemies) {
    wisp.wobble += dt;
    wisp.x += Math.cos(wisp.wobble * 0.7) * wisp.speed * dt;
    wisp.y += Math.sin(wisp.wobble * 0.9) * wisp.speed * dt;
    if (wisp.x < ARENA.x + 20) wisp.x = ARENA.x + 20;
    if (wisp.x > ARENA.x + ARENA.width - 20) wisp.x = ARENA.x + ARENA.width - 20;
    if (wisp.y < ARENA.y + 20) wisp.y = ARENA.y + 20;
    if (wisp.y > ARENA.y + ARENA.height - 20) wisp.y = ARENA.y + ARENA.height - 20;
  }
  g.fx.update(dt);
}

/** One fixed step of the world in whatever phase it is in. */
export function stepWorld(g, input, dt) {
  if (g.phase === 'title') {
    stepTitle(g, dt);
    return;
  }
  if (g.phase === 'play') {
    g.time += dt;
    dealSpawns(g, dt);
    stepActors(g, input, dt);
    return;
  }
  // Upgrade, paused, over and victory: the world holds still, but the
  // particles and floating text keep drifting so the screen stays alive.
  g.fx.update(dt);
  g.shake = Math.max(0, g.shake - dt * 26);
  g.flash = Math.max(0, g.flash - dt * 1.4);
  if (g.banner) {
    g.banner.t -= dt;
    if (g.banner.t <= 0) g.banner = null;
  }
}
