// The screenshot scenes behind ?shot=title|play|upgrade|victory. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (keep clear of glooms, chase shards,
// aim at the nearest foe), so the frame is what a short game really looks
// like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { applyUpgrade, rollUpgrades, startWave } from './waves.js';
import { resetRun, stepWorld, toTitle } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_VICTORY } from './render.js';

/** Steer the keeper: away from close glooms, toward shards, aim at the nearest foe. */
function autopilot(g) {
  const p = g.player;
  let mx = 0;
  let my = 0;
  let foe = null;
  let foeDist = Infinity;
  for (const enemy of g.enemies) {
    const dx = enemy.x - p.x;
    const dy = enemy.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < foeDist) {
      foeDist = dist;
      foe = enemy;
    }
    if (dist < 230) {
      const push = (230 - dist) / 230;
      mx -= (dx / dist) * push;
      my -= (dy / dist) * push;
    }
  }
  for (const orb of g.ebullets) {
    const dx = orb.x - p.x;
    const dy = orb.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 110) {
      const push = (110 - dist) / 110;
      mx -= (dx / dist) * push;
      my -= (dy / dist) * push;
    }
  }
  if (foeDist > 230) {
    let shard = null;
    let shardDist = Infinity;
    for (const item of g.pickups) {
      const dist = Math.hypot(item.x - p.x, item.y - p.y);
      if (dist < shardDist) {
        shardDist = dist;
        shard = item;
      }
    }
    if (shard && shardDist < 320) {
      mx += (shard.x - p.x) / shardDist;
      my += (shard.y - p.y) / shardDist;
    } else if (foe) {
      // Kite: circle the nearest foe at fighting distance instead of
      // standing still while it closes in.
      const dx = foe.x - p.x;
      const dy = foe.y - p.y;
      const strafe = Math.sin(g.time * 1.7) > 0 ? 1 : -1;
      mx += (-dy / foeDist) * strafe * 0.9;
      my += (dx / foeDist) * strafe * 0.9;
      if (foeDist > 300) {
        mx += (dx / foeDist) * 0.7;
        my += (dy / foeDist) * 0.7;
      } else if (foeDist < 200) {
        mx -= (dx / foeDist) * 0.5;
        my -= (dy / foeDist) * 0.5;
      }
    }
  }
  // Drift back toward the middle if pushed to a wall.
  if (p.x < 160) mx += 0.6;
  if (p.x > 1120) mx -= 0.6;
  if (p.y < 180) my += 0.6;
  if (p.y > 620) my -= 0.6;
  const len = Math.hypot(mx, my) || 1;
  const near = g.enemies.filter((e) => Math.hypot(e.x - p.x, e.y - p.y) < 280).length;
  return {
    direction: { x: mx / len, y: my / len },
    aimX: foe ? foe.x : p.x,
    aimY: foe ? foe.y : p.y - 100,
    firing: foe !== null,
    dash: foeDist < 115 && p.dashCooldown <= 0,
    sunburst: near >= 5 && g.sunburstCharges > 0,
  };
}

function runSteps(g, seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (g.phase !== 'play') break;
    stepWorld(g, pilot ? autopilot(g) : { direction: { x: 0, y: 0 }, aimX: 640, aimY: 300, firing: false, dash: false, sunburst: false }, STEP);
  }
}

/**
 * Set the world to the named scene and return the screen to draw over it.
 * Any other name stages the title.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    resetRun(world, 7);
    // Play through waves 1 and 2, taking the first draft card each time,
    // then catch wave 3 mid-fight: motes, spitters and splitters together,
    // so the shot shows the real mix.
    let targetSeconds = -1;
    let elapsed = 0;
    while (elapsed < 120) {
      if (world.phase === 'upgrade') {
        applyUpgrade(world, world.choices[0].id);
        startWave(world, world.wave + 1);
        world.phase = 'play';
        targetSeconds = world.wave >= 3 ? 0 : -1;
      }
      if (world.phase !== 'play') break;
      stepWorld(world, autopilot(world), STEP);
      elapsed += STEP;
      if (targetSeconds >= 0) {
        targetSeconds += STEP;
        if (targetSeconds >= 4) break;
      }
    }
    return { screen: world.phase === 'play' ? SCREEN_PLAY : SCREEN_OVER, best: world.score };
  }
  if (name === 'upgrade') {
    resetRun(world, 7);
    // Play until the first wave is cleared and the draft opens.
    const steps = Math.floor(100 / STEP);
    for (let i = 0; i < steps; i += 1) {
      if (world.phase !== 'play') break;
      stepWorld(world, autopilot(world), STEP);
    }
    if (world.phase === 'play') {
      // The pilot ran out of time: clear the field by hand so the draft
      // still shows over a real, played world.
      world.enemies.length = 0;
      world.waveActive = false;
      world.choices = rollUpgrades(world);
      world.phase = 'upgrade';
    }
    return { screen: world.phase === 'upgrade' ? SCREEN_UPGRADE : SCREEN_PLAY, best: world.score };
  }
  if (name === 'victory') {
    resetRun(world, 11);
    const p = world.player;
    p.damage = 4;
    p.multishot = 3;
    p.pierce = 2;
    p.fireInterval = 0.12;
    p.speed = 340;
    p.orbiters = 2;
    p.maxHearts = 6;
    p.hearts = 6;
    // Skip ahead to the final wave.
    world.enemies.length = 0;
    world.bullets.length = 0;
    world.ebullets.length = 0;
    world.wave = 9;
    world.waveActive = false;
    startWave(world, 10);
    const steps = Math.floor(200 / STEP);
    for (let i = 0; i < steps; i += 1) {
      if (world.phase !== 'play') break;
      const input = autopilot(world);
      if (world.sunburstCharges > 0 && world.boss && world.boss.hp < world.boss.maxHp * 0.4) input.sunburst = true;
      stepWorld(world, input, STEP);
    }
    return { screen: world.phase === 'victory' ? SCREEN_VICTORY : SCREEN_PLAY, best: world.score };
  }
  toTitle(world);
  runSteps(world, 6, false);
  return { screen: SCREEN_TITLE, best: 0 };
}
