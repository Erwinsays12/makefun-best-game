// Particles and floating score text. One fixed pool, allocated once at boot:
// bursts reuse dead slots instead of allocating, so a long run never grows
// memory. Everything here is cosmetic — it never changes the simulation.
export function createEffects() {
  const particles = [];
  const floaters = [];

  function spawn(x, y, opts) {
    const found = particles.find((p) => !p.alive);
    const p = found ?? { alive: false };
    if (!found) particles.push(p);
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = opts.vx ?? 0;
    p.vy = opts.vy ?? 0;
    p.life = opts.life ?? 0.6;
    p.maxLife = p.life;
    p.size = opts.size ?? 3;
    p.colour = opts.colour ?? '#ffd866';
    p.drag = opts.drag ?? 2.2;
    p.gravity = opts.gravity ?? 0;
  }

  return {
    particles,
    floaters,
    burst(x, y, colour, count, speed, size) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.35 + Math.random() * 0.65);
        spawn(x, y, {
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v,
          life: 0.35 + Math.random() * 0.45,
          size: size * (0.6 + Math.random() * 0.8),
          colour,
        });
      }
    },
    ring(x, y, colour, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        spawn(x, y, {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.5,
          size: 4,
          colour,
          drag: 1.2,
        });
      }
    },
    trail(x, y, colour) {
      spawn(x, y, { vx: 0, vy: 0, life: 0.3, size: 5, colour, drag: 4 });
    },
    text(x, y, message, colour) {
      floaters.push({ x, y, message, colour: colour ?? '#f2ead8', life: 0.9, maxLife: 0.9 });
    },
    update(dt) {
      for (const p of particles) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          continue;
        }
        const drag = Math.max(0, 1 - p.drag * dt);
        p.vx *= drag;
        p.vy *= drag;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = floaters.length - 1; i >= 0; i -= 1) {
        const f = floaters[i];
        f.life -= dt;
        f.y -= 42 * dt;
        if (f.life <= 0) floaters.splice(i, 1);
      }
    },
  };
}
