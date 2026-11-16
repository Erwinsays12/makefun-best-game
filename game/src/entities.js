// The actors: the lantern keeper, the glooms that hunt them, the bolts and
// orbs they trade, and the pickups they drop. Every function here works on
// the world state `g` that world.js creates, and nothing here touches the
// screen — render.js does all the drawing.
import { ARENA, BULLET, ENEMIES, ORB, PLAYER, SUNBURST } from './config.js';
import { range } from './random.js';

export function createPlayer() {
  return {
    x: 640,
    y: 400,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    hearts: PLAYER.maxHearts,
    maxHearts: PLAYER.maxHearts,
    speed: PLAYER.speed,
    fireTimer: 0,
    fireInterval: PLAYER.fireInterval,
    damage: PLAYER.bulletDamage,
    multishot: 1,
    pierce: 0,
    bulletSpeed: PLAYER.bulletSpeed,
    magnetRadius: PLAYER.magnetRadius,
    comboWindow: PLAYER.comboWindow,
    dashTimer: 0,
    dashCooldown: 0,
    dashMax: PLAYER.dashCooldown,
    invulnerable: 0,
    orbiters: 0,
    orbitAngle: 0,
    aimX: 640,
    aimY: 300,
    moving: false,
  };
}

function edgeSpawn(g) {
  const side = Math.floor(g.rng() * 4);
  if (side === 0) return { x: range(g.rng, ARENA.x + 20, ARENA.x + ARENA.width - 20), y: ARENA.y + 16 };
  if (side === 1) return { x: range(g.rng, ARENA.x + 20, ARENA.x + ARENA.width - 20), y: ARENA.y + ARENA.height - 16 };
  if (side === 2) return { x: ARENA.x + 16, y: range(g.rng, ARENA.y + 20, ARENA.y + ARENA.height - 20) };
  return { x: ARENA.x + ARENA.width - 16, y: range(g.rng, ARENA.y + 20, ARENA.y + ARENA.height - 20) };
}

export function spawnEnemy(g, kind, x, y) {
  const def = ENEMIES[kind];
  const pos = x === undefined ? edgeSpawn(g) : { x, y };
  const waveScale = 1 + (g.wave - 1) * 0.06;
  const enemy = {
    kind,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    radius: def.radius,
    hp: Math.round(def.hp * waveScale),
    maxHp: Math.round(def.hp * waveScale),
    speed: def.speed * (1 + (g.wave - 1) * 0.02),
    score: def.score,
    colour: def.colour,
    glow: def.glow,
    shotTimer: range(g.rng, 1, def.shotInterval ?? 2),
    summonTimer: 6,
    burstTimer: 3.5,
    touchCooldown: 0,
    wobble: g.rng() * Math.PI * 2,
    flash: 0,
  };
  g.enemies.push(enemy);
  return enemy;
}

export function spawnBoss(g) {
  const boss = spawnEnemy(g, 'boss', 640, ARENA.y + 90);
  g.boss = boss;
  g.sfx.bossRoar();
  g.banner = { text: 'THE HOLLOW KING', sub: 'Break the dark — win the Hollow', t: 2.6 };
  return boss;
}

function firePlayerBolts(g) {
  const p = g.player;
  const dx = p.aimX - p.x;
  const dy = p.aimY - p.y;
  const base = Math.atan2(dy, dx);
  const count = p.multishot;
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * 0.14;
    const angle = base + offset;
    g.bullets.push({
      x: p.x + Math.cos(angle) * (p.radius + 6),
      y: p.y + Math.sin(angle) * (p.radius + 6),
      vx: Math.cos(angle) * p.bulletSpeed,
      vy: Math.sin(angle) * p.bulletSpeed,
      radius: BULLET.radius,
      damage: p.damage,
      pierce: p.pierce,
      life: BULLET.life,
    });
  }
  g.sfx.shoot();
  g.stats.shots += count;
}

function updatePlayer(g, input, dt) {
  const p = g.player;
  p.fireTimer -= dt;
  p.dashCooldown -= dt;
  p.invulnerable -= dt;
  p.orbitAngle += dt * 3.2;

  const dir = input.direction;
  p.moving = dir.x !== 0 || dir.y !== 0;
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashVx * dt;
    p.y += p.dashVy * dt;
    g.fx.trail(p.x, p.y, '#ffd866');
  } else {
    const speed = p.speed;
    p.vx = dir.x * speed;
    p.vy = dir.y * speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (input.dash && p.dashCooldown <= 0 && p.moving) {
      p.dashTimer = 0.16;
      p.dashCooldown = p.dashMax;
      p.dashVx = dir.x * 780;
      p.dashVy = dir.y * 780;
      p.invulnerable = Math.max(p.invulnerable, 0.22);
      g.sfx.dash();
      g.fx.ring(p.x, p.y, '#ffe9a8', 10, 220);
    }
  }
  p.x = Math.min(ARENA.x + ARENA.width - p.radius, Math.max(ARENA.x + p.radius, p.x));
  p.y = Math.min(ARENA.y + ARENA.height - p.radius, Math.max(ARENA.y + p.radius, p.y));
  p.aimX = input.aimX;
  p.aimY = input.aimY;

  if (input.firing && p.fireTimer <= 0) {
    firePlayerBolts(g);
    p.fireTimer = p.fireInterval;
  }

  // Orbiting embers grind whatever they touch.
  if (p.orbiters > 0) {
    for (let i = 0; i < p.orbiters; i += 1) {
      const angle = p.orbitAngle + (i / p.orbiters) * Math.PI * 2;
      const ox = p.x + Math.cos(angle) * 52;
      const oy = p.y + Math.sin(angle) * 52;
      for (const enemy of g.enemies) {
        if (enemy.touchCooldown > 0) continue;
        const dx = enemy.x - ox;
        const dy = enemy.y - oy;
        if (dx * dx + dy * dy < (enemy.radius + 12) * (enemy.radius + 12)) {
          enemy.touchCooldown = 0.5;
          damageEnemy(g, enemy, 1);
        }
      }
    }
  }
}

function steer(g, enemy, dt, targetX, targetY, speed) {
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  enemy.x += (dx / dist) * speed * dt;
  enemy.y += (dy / dist) * speed * dt;
}

function updateEnemies(g, dt) {
  const p = g.player;
  for (const enemy of g.enemies) {
    enemy.flash -= dt;
    enemy.touchCooldown -= dt;
    enemy.wobble += dt;
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (enemy.kind === 'mote' || enemy.kind === 'splitter' || enemy.kind === 'brute') {
      const wobble = enemy.kind === 'mote' ? Math.sin(enemy.wobble * 3) * 24 : 0;
      steer(g, enemy, dt, p.x + wobble, p.y, enemy.speed);
    } else if (enemy.kind === 'spitter') {
      // Keeps its distance and lobs dark orbs.
      if (dist > 340) steer(g, enemy, dt, p.x, p.y, enemy.speed);
      else if (dist < 220) steer(g, enemy, dt, p.x, p.y, -enemy.speed * 0.7);
      else {
        enemy.x += Math.cos(enemy.wobble) * enemy.speed * 0.4 * dt;
        enemy.y += Math.sin(enemy.wobble * 1.3) * enemy.speed * 0.4 * dt;
      }
      enemy.shotTimer -= dt;
      if (enemy.shotTimer <= 0 && dist < 460) {
        enemy.shotTimer = ENEMIES.spitter.shotInterval * (0.9 + g.rng() * 0.3);
        g.ebullets.push({
          x: enemy.x,
          y: enemy.y,
          vx: (dx / dist) * ORB.speed,
          vy: (dy / dist) * ORB.speed,
          radius: ORB.radius,
          life: ORB.life,
        });
      }
    } else if (enemy.kind === 'boss') {
      const enraged = enemy.hp < enemy.maxHp * 0.3;
      steer(g, enemy, dt, p.x, p.y, enemy.speed * (enraged ? 1.6 : 1));
      enemy.burstTimer -= dt;
      if (enemy.burstTimer <= 0) {
        enemy.burstTimer = enraged ? 2.6 : 3.8;
        const count = enraged ? 14 : 10;
        for (let i = 0; i < count; i += 1) {
          const angle = (i / count) * Math.PI * 2 + enemy.wobble;
          g.ebullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * ORB.speed * 0.85,
            vy: Math.sin(angle) * ORB.speed * 0.85,
            radius: ORB.radius,
            life: ORB.life,
          });
        }
        g.sfx.bossRoar();
      }
      enemy.summonTimer -= dt;
      if (enemy.summonTimer <= 0) {
        enemy.summonTimer = 7;
        for (let i = 0; i < 3; i += 1) {
          spawnEnemy(g, 'mote', enemy.x + range(g.rng, -70, 70), enemy.y + range(g.rng, -70, 70));
        }
        g.fx.ring(enemy.x, enemy.y, '#d84a6a', 16, 260);
      }
    }

    // Touching the keeper hurts.
    if (dist < enemy.radius + p.radius && p.invulnerable <= 0 && p.dashTimer <= 0) {
      hurtPlayer(g, enemy);
    }
  }
}

function updateBullets(g, dt) {
  for (let i = g.bullets.length - 1; i >= 0; i -= 1) {
    const b = g.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < ARENA.x || b.x > ARENA.x + ARENA.width || b.y < ARENA.y || b.y > ARENA.y + ARENA.height;
    if (!dead) {
      for (let j = g.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = g.enemies[j];
        const dx = enemy.x - b.x;
        const dy = enemy.y - b.y;
        const reach = enemy.radius + b.radius;
        if (dx * dx + dy * dy < reach * reach) {
          g.stats.hits += 1;
          damageEnemy(g, enemy, b.damage);
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            dead = true;
          }
          break;
        }
      }
    }
    if (dead) g.bullets.splice(i, 1);
  }

  for (let i = g.ebullets.length - 1; i >= 0; i -= 1) {
    const o = g.ebullets[i];
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    const p = g.player;
    const dx = p.x - o.x;
    const dy = p.y - o.y;
    const reach = p.radius + o.radius;
    let dead = o.life <= 0 || o.x < ARENA.x || o.x > ARENA.x + ARENA.width || o.y < ARENA.y || o.y > ARENA.y + ARENA.height;
    if (!dead && dx * dx + dy * dy < reach * reach && p.invulnerable <= 0 && p.dashTimer <= 0) {
      hurtPlayer(g, null);
      dead = true;
    }
    if (dead) g.ebullets.splice(i, 1);
  }
}

function updatePickups(g, dt) {
  const p = g.player;
  for (let i = g.pickups.length - 1; i >= 0; i -= 1) {
    const item = g.pickups[i];
    item.life -= dt;
    item.bob += dt * 4;
    const dx = p.x - item.x;
    const dy = p.y - item.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < p.magnetRadius) {
      item.x += (dx / dist) * 340 * dt;
      item.y += (dy / dist) * 340 * dt;
    }
    if (dist < p.radius + 16) {
      collectPickup(g, item);
      g.pickups.splice(i, 1);
    } else if (item.life <= 0) {
      g.pickups.splice(i, 1);
    }
  }
}

function collectPickup(g, item) {
  if (item.kind === 'shard') {
    addScore(g, 25, item.x, item.y);
    g.sfx.pickup();
  } else if (item.kind === 'heart') {
    g.player.hearts = Math.min(g.player.maxHearts, g.player.hearts + 1);
    g.fx.text(item.x, item.y - 10, '+1 HEART', '#ff5a6e');
    g.sfx.heart();
  } else if (item.kind === 'burst') {
    g.sunburstCharges = Math.min(SUNBURST.maxCharges, g.sunburstCharges + 1);
    g.fx.text(item.x, item.y - 10, '+1 SUNBURST', '#ffd866');
    g.sfx.pickup();
  }
}

function dropPickup(g, enemy) {
  const roll = g.rng();
  if (enemy.kind === 'boss') {
    g.pickups.push({ kind: 'heart', x: enemy.x, y: enemy.y, life: 12, bob: 0 });
    return;
  }
  if (enemy.kind === 'brute' && roll < 0.35) {
    g.pickups.push({ kind: 'heart', x: enemy.x, y: enemy.y, life: 10, bob: 0 });
  } else if (roll < 0.1) {
    g.pickups.push({ kind: 'burst', x: enemy.x, y: enemy.y, life: 10, bob: 0 });
  } else if (roll < 0.35) {
    g.pickups.push({ kind: 'shard', x: enemy.x, y: enemy.y, life: 10, bob: 0 });
  }
}

export function damageEnemy(g, enemy, amount) {
  enemy.hp -= amount;
  enemy.flash = 0.09;
  g.sfx.hit();
  g.fx.burst(enemy.x, enemy.y, enemy.colour, 3, 120, 2.5);
  if (enemy.hp <= 0) killEnemy(g, enemy);
}

function killEnemy(g, enemy) {
  const index = g.enemies.indexOf(enemy);
  if (index !== -1) g.enemies.splice(index, 1);
  g.kills += 1;
  g.combo += 1;
  g.comboTimer = g.player.comboWindow;
  const mult = comboMultiplier(g);
  addScore(g, enemy.score, enemy.x, enemy.y, mult);
  g.sfx.kill(enemy.kind);
  g.fx.burst(enemy.x, enemy.y, enemy.colour, enemy.kind === 'boss' ? 60 : 14, enemy.kind === 'boss' ? 320 : 220, 4);
  g.fx.ring(enemy.x, enemy.y, enemy.glow, 10, 200);
  g.shake = Math.min(14, g.shake + (enemy.kind === 'boss' ? 14 : enemy.kind === 'brute' ? 7 : 3));
  if (enemy.kind === 'splitter') {
    spawnEnemy(g, 'mote', enemy.x - 18, enemy.y);
    spawnEnemy(g, 'mote', enemy.x + 18, enemy.y);
  }
  if (enemy.kind === 'boss') {
    g.boss = null;
    dropPickup(g, enemy);
    g.banner = null;
    g.phase = 'victory';
    g.sfx.victory();
    return;
  }
  dropPickup(g, enemy);
  if (g.combo > 0 && g.combo % 10 === 0) {
    g.banner = { text: `${g.combo} STREAK`, sub: `x${mult} score`, t: 1.4 };
  }
}

export function comboMultiplier(g) {
  return Math.min(5, 1 + Math.floor(g.combo / 8));
}

export function addScore(g, base, x, y, mult) {
  const value = base * (mult ?? 1);
  g.score += value;
  if (x !== undefined) g.fx.text(x, y - 14, `+${value}`, '#f2ead8');
}

export function hurtPlayer(g, source) {
  const p = g.player;
  if (p.invulnerable > 0 || p.dashTimer > 0) return;
  p.hearts -= 1;
  p.invulnerable = PLAYER.invulnerableAfterHit;
  g.combo = 0;
  g.comboTimer = 0;
  g.shake = 16;
  g.flash = 0.35;
  g.sfx.hurt();
  g.fx.burst(p.x, p.y, '#ff5a6e', 22, 260, 4);
  if (source) {
    // Shove the attacker back so one touch is not two.
    const dx = source.x - p.x;
    const dy = source.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    source.x += (dx / dist) * 46;
    source.y += (dy / dist) * 46;
  }
  if (p.hearts <= 0) {
    g.banner = null;
    g.phase = 'over';
    g.sfx.gameOver();
    g.fx.burst(p.x, p.y, '#ffd866', 50, 320, 5);
  }
}

/** The Sunburst: a nova that clears every orb and wounds every gloom. */
export function sunburst(g) {
  if (g.sunburstCharges <= 0) return;
  g.sunburstCharges -= 1;
  g.ebullets.length = 0;
  g.flash = 0.5;
  g.shake = 18;
  g.sfx.sunburst();
  g.fx.ring(g.player.x, g.player.y, '#ffd866', 36, 620);
  g.fx.ring(g.player.x, g.player.y, '#fff3c4', 24, 480);
  for (let i = g.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = g.enemies[i];
    const dx = enemy.x - g.player.x;
    const dy = enemy.y - g.player.y;
    if (dx * dx + dy * dy < SUNBURST.radius * SUNBURST.radius) {
      damageEnemy(g, enemy, SUNBURST.damage);
    }
  }
}

/** One fixed simulation step of everything that moves. */
export function stepActors(g, input, dt) {
  updatePlayer(g, input, dt);
  updateEnemies(g, dt);
  updateBullets(g, dt);
  updatePickups(g, dt);
  g.fx.update(dt);
  if (g.comboTimer > 0) {
    g.comboTimer -= dt;
    if (g.comboTimer <= 0) g.combo = 0;
  }
  g.shake = Math.max(0, g.shake - dt * 26);
  g.flash = Math.max(0, g.flash - dt * 1.4);
  if (g.banner) {
    g.banner.t -= dt;
    if (g.banner.t <= 0) g.banner = null;
  }
}
