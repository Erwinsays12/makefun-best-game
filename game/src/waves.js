// The wave director and the between-wave upgrade draft. A wave is a shuffled
// queue of foe kinds dealt out on a timer; when the queue is empty and the
// field is clear, the wave is won. The boss wave ends the game when its
// boss falls. Between waves the keeper drafts one of three upgrade cards.
import { FINAL_WAVE, UPGRADES, WAVES } from './config.js';
import { shuffle } from './random.js';
import { spawnBoss, spawnEnemy } from './entities.js';

/** The spawn queue for a wave: its kinds shuffled so the mix stays surprising. */
export function buildSpawnQueue(g, wave) {
  const spec = WAVES[wave - 1];
  const queue = [];
  for (let i = 0; i < spec.motes; i += 1) queue.push('mote');
  for (let i = 0; i < spec.spitters; i += 1) queue.push('spitter');
  for (let i = 0; i < spec.splitters; i += 1) queue.push('splitter');
  for (let i = 0; i < spec.brutes; i += 1) queue.push('brute');
  shuffle(g.rng, queue);
  return { queue, interval: spec.interval, boss: spec.boss ?? false, timer: 1.2, bossSpawned: false };
}

export function startWave(g, wave) {
  g.wave = wave;
  g.spawn = buildSpawnQueue(g, wave);
  g.waveActive = true;
  g.banner = {
    text: wave === FINAL_WAVE ? `WAVE ${wave} — FINAL` : `WAVE ${wave}`,
    sub: wave === FINAL_WAVE ? 'The Hollow King wakes' : `${g.spawn.queue.length} glooms approach`,
    t: 2.4,
  };
  g.sfx.waveStart();
}

/** Deal the next foe off the queue, or the boss when its turn comes. */
export function dealSpawns(g, dt) {
  if (!g.waveActive || !g.spawn) return;
  const spawn = g.spawn;
  spawn.timer -= dt;
  if (spawn.timer > 0) return;
  if (spawn.queue.length > 0) {
    spawnEnemy(g, spawn.queue.shift());
    spawn.timer = spawn.interval;
    return;
  }
  if (spawn.boss && !spawn.bossSpawned) {
    spawn.bossSpawned = true;
    spawnBoss(g);
    return;
  }
  // Queue spent and the boss (if any) is out: the wave ends when the field clears.
  if (g.enemies.length === 0) {
    g.waveActive = false;
    if (g.phase === 'play') {
      if (g.wave >= FINAL_WAVE) return; // victory is set by the boss's death
      g.sunburstCharges = Math.min(4, g.sunburstCharges + 1);
      g.choices = rollUpgrades(g);
      g.phase = 'upgrade';
      g.sfx.upgrade();
    }
  }
}

/** Three upgrades the keeper has not maxed out yet, drawn at random. */
export function rollUpgrades(g) {
  const taken = g.upgradesTaken;
  const pool = UPGRADES.filter((u) => (taken[u.id] ?? 0) < u.max);
  shuffle(g.rng, pool);
  return pool.slice(0, 3);
}

/** Apply one upgrade card to the keeper. */
export function applyUpgrade(g, id) {
  const p = g.player;
  g.upgradesTaken[id] = (g.upgradesTaken[id] ?? 0) + 1;
  if (id === 'damage') p.damage += 1;
  else if (id === 'rate') p.fireInterval *= 0.86;
  else if (id === 'multishot') p.multishot += 1;
  else if (id === 'pierce') p.pierce += 1;
  else if (id === 'speed') p.speed *= 1.12;
  else if (id === 'dash') p.dashMax *= 0.75;
  else if (id === 'heart') {
    p.maxHearts += 1;
    p.hearts = Math.min(p.maxHearts, p.hearts + 1);
  } else if (id === 'magnet') p.magnetRadius *= 1.6;
  else if (id === 'orbiter') p.orbiters += 1;
  else if (id === 'burst') g.sunburstCharges = Math.min(4, g.sunburstCharges + 1);
  else if (id === 'combo') p.comboWindow += 1.5;
  else if (id === 'velocity') p.bulletSpeed *= 1.18;
  g.sfx.upgrade();
}
