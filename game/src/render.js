// All drawing: the arena, the actors, the HUD and every screen. The
// renderer never changes the world — it reads `g` and paints it. The canvas
// is the fixed 1280x720 logical field, scaled to the window by main.js.
import { ARENA, FIELD, FINAL_WAVE, FONT, FONT_DISPLAY, PALETTE } from './config.js';
import { comboMultiplier } from './entities.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

const CARD = { width: 300, height: 190, gap: 36, y: 300 };

/** The three upgrade cards' rectangles, for drawing and for click hits. */
export function upgradeCardRects() {
  const total = CARD.width * 3 + CARD.gap * 2;
  const x0 = (FIELD.width - total) / 2;
  return [0, 1, 2].map((i) => ({
    x: x0 + i * (CARD.width + CARD.gap),
    y: CARD.y,
    width: CARD.width,
    height: CARD.height,
  }));
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({
      x: (i * 137.5) % FIELD.width,
      y: (i * 89.3) % FIELD.height,
      r: 0.6 + ((i * 7) % 10) / 10,
      twinkle: (i % 5) * 0.7,
    });
  }

  function circle(x, y, r, colour) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
  }

  function glowCircle(x, y, r, colour, alpha) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawLantern(x, y, pulse) {
    glowCircle(x, y, 120 + pulse * 14, 'rgba(247, 201, 72, 0.28)', 1);
    ctx.fillStyle = '#3a2f1a';
    ctx.fillRect(x - 16, y - 6, 32, 34);
    ctx.fillStyle = '#241d10';
    ctx.fillRect(x - 22, y + 26, 44, 8);
    ctx.fillStyle = '#241d10';
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 6);
    ctx.lineTo(x, y - 22);
    ctx.lineTo(x + 16, y - 6);
    ctx.closePath();
    ctx.fill();
    glowCircle(x, y + 10, 26 + pulse * 4, 'rgba(255, 223, 128, 0.9)', 1);
    circle(x, y + 10, 11, '#fff3c4');
  }

  function drawEnemy(enemy, time) {
    const { x, y } = enemy;
    const flash = enemy.flash > 0;
    glowCircle(x, y, enemy.radius * 2.4, enemy.glow, 0.35);
    ctx.save();
    ctx.translate(x, y);
    if (enemy.kind === 'mote') {
      ctx.rotate(Math.sin(enemy.wobble * 2) * 0.2);
      ctx.fillStyle = flash ? '#ffffff' : enemy.colour;
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? enemy.radius + 5 : enemy.radius - 3;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      circle(0, 0, enemy.radius * 0.45, '#1a1030');
    } else if (enemy.kind === 'spitter') {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = flash ? '#ffffff' : enemy.colour;
      ctx.fillRect(-enemy.radius * 0.8, -enemy.radius * 0.8, enemy.radius * 1.6, enemy.radius * 1.6);
      ctx.rotate(-Math.PI / 4);
      circle(0, 0, enemy.radius * 0.4, '#2a0a2e');
      circle(0, 0, enemy.radius * 0.18, '#ff9df5');
    } else if (enemy.kind === 'splitter') {
      ctx.fillStyle = flash ? '#ffffff' : enemy.colour;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      circle(-enemy.radius * 0.35, -enemy.radius * 0.2, enemy.radius * 0.3, '#0d2a1e');
      circle(enemy.radius * 0.35, enemy.radius * 0.25, enemy.radius * 0.3, '#0d2a1e');
    } else if (enemy.kind === 'brute') {
      ctx.fillStyle = flash ? '#ffffff' : enemy.colour;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2 + time * 0.4;
        const px = Math.cos(angle) * enemy.radius;
        const py = Math.sin(angle) * enemy.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a1503';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb37a';
      ctx.beginPath();
      ctx.arc(-enemy.radius * 0.18, -4, 3.5, 0, Math.PI * 2);
      ctx.arc(enemy.radius * 0.18, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'boss') {
      const enraged = enemy.hp < enemy.maxHp * 0.3;
      ctx.fillStyle = flash ? '#ffffff' : enemy.colour;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      // Crown horns.
      ctx.strokeStyle = enraged ? '#ff2a3c' : '#7a1030';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-enemy.radius * 0.7, -enemy.radius * 0.6);
      ctx.lineTo(-enemy.radius * 1.05, -enemy.radius * 1.15);
      ctx.moveTo(enemy.radius * 0.7, -enemy.radius * 0.6);
      ctx.lineTo(enemy.radius * 1.05, -enemy.radius * 1.15);
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(0, -enemy.radius * 1.25);
      ctx.stroke();
      ctx.fillStyle = '#1c0410';
      ctx.beginPath();
      ctx.arc(-enemy.radius * 0.32, -enemy.radius * 0.1, 9, 0, Math.PI * 2);
      ctx.arc(enemy.radius * 0.32, -enemy.radius * 0.1, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = enraged ? '#ff2a3c' : '#ffd7e0';
      ctx.beginPath();
      ctx.arc(-enemy.radius * 0.32, -enemy.radius * 0.1, 4, 0, Math.PI * 2);
      ctx.arc(enemy.radius * 0.32, -enemy.radius * 0.1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1c0410';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, enemy.radius * 0.25, enemy.radius * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    if (enemy.maxHp > 3) {
      const width = enemy.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - width / 2, y - enemy.radius - 14, width, 5);
      ctx.fillStyle = enemy.kind === 'boss' ? PALETTE.boss : '#ffb37a';
      ctx.fillRect(x - width / 2, y - enemy.radius - 14, width * (enemy.hp / enemy.maxHp), 5);
    }
  }

  function drawPlayer(g) {
    const p = g.player;
    const blink = p.invulnerable > 0 && Math.floor(g.time * 14) % 2 === 0;
    if (blink) return;
    if (p.dashTimer > 0) glowCircle(p.x, p.y, 60, 'rgba(255, 233, 168, 0.5)', 1);
    glowCircle(p.x, p.y, 54, 'rgba(247, 201, 72, 0.4)', 1);
    // Orbiting embers.
    for (let i = 0; i < p.orbiters; i += 1) {
      const angle = p.orbitAngle + (i / p.orbiters) * Math.PI * 2;
      const ox = p.x + Math.cos(angle) * 52;
      const oy = p.y + Math.sin(angle) * 52;
      glowCircle(ox, oy, 16, 'rgba(255, 150, 60, 0.7)', 1);
      circle(ox, oy, 6, '#ffb347');
    }
    // The keeper: a little flame wisp with a lantern core.
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(0, -p.radius - 8);
    ctx.quadraticCurveTo(p.radius * 0.9, -p.radius * 0.2, p.radius * 0.55, p.radius * 0.7);
    ctx.quadraticCurveTo(0, p.radius * 1.15, -p.radius * 0.55, p.radius * 0.7);
    ctx.quadraticCurveTo(-p.radius * 0.9, -p.radius * 0.2, 0, -p.radius - 8);
    ctx.fill();
    circle(0, 2, 9, PALETTE.playerCore);
    ctx.fillStyle = '#2a1c05';
    ctx.beginPath();
    ctx.arc(-3.5, 0, 2, 0, Math.PI * 2);
    ctx.arc(3.5, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Aim tick.
    const dx = p.aimX - p.x;
    const dy = p.aimY - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ax = p.x + (dx / dist) * (p.radius + 16);
    const ay = p.y + (dy / dist) * (p.radius + 16);
    ctx.strokeStyle = 'rgba(255, 243, 196, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, ay, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawPickups(g) {
    for (const item of g.pickups) {
      const bob = Math.sin(item.bob) * 3;
      const blink = item.life < 2.5 && Math.floor(item.life * 6) % 2 === 0;
      if (blink) continue;
      if (item.kind === 'shard') {
        glowCircle(item.x, item.y + bob, 22, 'rgba(123, 224, 255, 0.5)', 1);
        ctx.save();
        ctx.translate(item.x, item.y + bob);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#7be0ff';
        ctx.fillRect(-7, -7, 14, 14);
        ctx.restore();
      } else if (item.kind === 'heart') {
        glowCircle(item.x, item.y + bob, 24, 'rgba(255, 90, 110, 0.5)', 1);
        ctx.fillStyle = PALETTE.heart;
        ctx.beginPath();
        ctx.arc(item.x - 5, item.y + bob - 2, 6, 0, Math.PI * 2);
        ctx.arc(item.x + 5, item.y + bob - 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(item.x - 10, item.y + bob);
        ctx.lineTo(item.x + 10, item.y + bob);
        ctx.lineTo(item.x, item.y + bob + 11);
        ctx.closePath();
        ctx.fill();
      } else {
        glowCircle(item.x, item.y + bob, 26, 'rgba(247, 201, 72, 0.6)', 1);
        ctx.fillStyle = '#ffd866';
        ctx.beginPath();
        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2;
          const r = i % 2 === 0 ? 11 : 5;
          ctx.lineTo(item.x + Math.cos(angle) * r, item.y + bob + Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawHud(g) {
    const p = g.player;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Hearts.
    for (let i = 0; i < p.maxHearts; i += 1) {
      const x = 28 + i * 34;
      const y = 34;
      ctx.fillStyle = i < p.hearts ? PALETTE.heart : PALETTE.heartEmpty;
      ctx.beginPath();
      ctx.arc(x - 5, y - 2, 7, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 11, y);
      ctx.lineTo(x + 11, y);
      ctx.lineTo(x, y + 12);
      ctx.closePath();
      ctx.fill();
    }
    // Wave, score, best.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(`WAVE ${Math.max(1, g.wave)}${g.wave >= FINAL_WAVE ? ' — FINAL' : ''}`, 28, 74);
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(`${g.score}`, 640, 36);
    ctx.font = `400 15px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`BEST ${Math.max(g.best, g.score)}`, 640, 62);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(`${g.kills} banished`, 1252, 30);
    ctx.font = `400 15px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('Q / E — Sunburst', 1252, 56);
    ctx.textAlign = 'left';
    // Combo.
    if (g.combo >= 4) {
      ctx.fillStyle = '#ffd866';
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText(`COMBO x${comboMultiplier(g)}  (${g.combo})`, 28, 112);
      ctx.fillStyle = 'rgba(255, 216, 102, 0.4)';
      ctx.fillRect(28, 124, 120 * (g.comboTimer / p.comboWindow), 5);
    }
    // Dash cooldown and Sunburst charges, bottom-left.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 14px ${FONT}`;
    ctx.fillText('DASH', 28, 692);
    const dashReady = p.dashCooldown <= 0;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(76, 685, 110, 10);
    ctx.fillStyle = dashReady ? '#ffd866' : '#8a7a3a';
    ctx.fillRect(76, 685, 110 * (dashReady ? 1 : 1 - p.dashCooldown / p.dashMax), 10);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('SUNBURST', 210, 692);
    for (let i = 0; i < g.sunburstCharges; i += 1) {
      ctx.fillStyle = '#ffd866';
      ctx.beginPath();
      ctx.arc(292 + i * 22, 690, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Boss bar.
    if (g.boss) {
      const width = 560;
      const x = (FIELD.width - width) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x, 44, width, 16);
      ctx.fillStyle = PALETTE.boss;
      ctx.fillRect(x, 44, width * (g.boss.hp / g.boss.maxHp), 16);
      ctx.strokeStyle = '#7a1030';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 44, width, 16);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('THE HOLLOW KING', FIELD.width / 2, 36);
      ctx.textAlign = 'left';
    }
  }

  function drawBanner(g) {
    if (!g.banner) return;
    const alpha = Math.min(1, g.banner.t * 2);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 52px ${FONT_DISPLAY}`;
    ctx.fillText(g.banner.text, FIELD.width / 2, 250);
    ctx.font = `400 20px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(g.banner.sub, FIELD.width / 2, 292);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function drawParticles(g) {
    for (const p of g.fx.particles) {
      if (!p.alive) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      circle(p.x, p.y, p.size, p.colour);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const f of g.fx.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.colour;
      ctx.font = `700 17px ${FONT}`;
      ctx.fillText(f.message, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function panel(x, y, width, height) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  }

  function drawTitle(g) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.lantern;
    ctx.font = `700 84px ${FONT_DISPLAY}`;
    ctx.fillText('EMBERKEEP', FIELD.width / 2, 210);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 26px ${FONT}`;
    ctx.fillText('Last Light of the Hollow', FIELD.width / 2, 256);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 18px ${FONT}`;
    ctx.fillText('Hold the lantern. Banish the glooms. Survive all 10 waves.', FIELD.width / 2, 300);
    ctx.fillText('Defeat the Hollow King and the Hollow is yours again.', FIELD.width / 2, 328);
    if (g.best > 0) {
      ctx.fillStyle = '#ffd866';
      ctx.font = `700 20px ${FONT}`;
      ctx.fillText(`BEST SCORE  ${g.best}`, FIELD.width / 2, 372);
    }
    const pulse = 0.6 + 0.4 * Math.sin(g.time * 2.4);
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('Click or press Space to begin', FIELD.width / 2, 470);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 16px ${FONT}`;
    ctx.fillText('Move — WASD / Arrows      Aim — Mouse      Fire — Hold click', FIELD.width / 2, 540);
    ctx.fillText('Dash — Shift      Sunburst — Q / E      Pause — P      Mute — M', FIELD.width / 2, 566);
    ctx.fillText('Between waves, pick one upgrade card with the mouse.', FIELD.width / 2, 592);
    ctx.textAlign = 'left';
  }

  function drawUpgrade(g) {
    ctx.fillStyle = 'rgba(6, 6, 14, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 40px ${FONT_DISPLAY}`;
    ctx.fillText(`Wave ${g.wave} cleared`, FIELD.width / 2, 190);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 20px ${FONT}`;
    ctx.fillText('Choose one blessing for the road ahead', FIELD.width / 2, 228);
    const rects = upgradeCardRects();
    g.choices.forEach((choice, i) => {
      const r = rects[i];
      panel(r.x, r.y, r.width, r.height);
      ctx.fillStyle = PALETTE.lantern;
      ctx.font = `700 26px ${FONT_DISPLAY}`;
      ctx.fillText(choice.name, r.x + r.width / 2, r.y + 56);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `400 19px ${FONT}`;
      ctx.fillText(choice.text, r.x + r.width / 2, r.y + 100);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `400 15px ${FONT}`;
      const taken = g.upgradesTaken[choice.id] ?? 0;
      ctx.fillText(taken > 0 ? `Taken ${taken} time${taken > 1 ? 's' : ''} before` : 'A new blessing', r.x + r.width / 2, r.y + 140);
      ctx.fillStyle = PALETTE.lantern;
      ctx.font = `700 15px ${FONT}`;
      ctx.fillText(`[ ${i + 1} ]`, r.x + r.width / 2, r.y + 168);
    });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 16px ${FONT}`;
    ctx.fillText('Click a card, or press 1, 2 or 3', FIELD.width / 2, 540);
    ctx.textAlign = 'left';
  }

  function drawStats(g, lines) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(`Score  ${g.score}`, FIELD.width / 2, 330);
    ctx.font = `400 20px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 372 + i * 30));
    ctx.textAlign = 'left';
  }

  function drawOver(g) {
    ctx.fillStyle = 'rgba(10, 4, 8, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5a6e';
    ctx.font = `700 64px ${FONT_DISPLAY}`;
    ctx.fillText('THE LIGHT FADES', FIELD.width / 2, 230);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 20px ${FONT}`;
    ctx.fillText(`The glooms overran the Hollow on wave ${g.wave}.`, FIELD.width / 2, 272);
    drawStats(g, [
      `Waves survived: ${g.wave - 1} of ${FINAL_WAVE}`,
      `Glooms banished: ${g.kills}`,
      `Best score: ${Math.max(g.best, g.score)}`,
    ]);
    const pulse = 0.6 + 0.4 * Math.sin(g.time * 2.4);
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText('Click or press Space to light the lantern again', FIELD.width / 2, 520);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function drawVictory(g) {
    ctx.fillStyle = 'rgba(10, 12, 4, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.lantern;
    ctx.font = `700 64px ${FONT_DISPLAY}`;
    ctx.fillText('THE HOLLOW IS LIT', FIELD.width / 2, 230);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 20px ${FONT}`;
    ctx.fillText('The Hollow King is banished. Dawn returns to the Hollow.', FIELD.width / 2, 272);
    drawStats(g, [
      `All ${FINAL_WAVE} waves cleared`,
      `Glooms banished: ${g.kills}`,
      `Accuracy: ${g.stats.shots > 0 ? Math.round((100 * g.stats.hits) / g.stats.shots) : 0}%`,
      `Best score: ${Math.max(g.best, g.score)}`,
    ]);
    const pulse = 0.6 + 0.4 * Math.sin(g.time * 2.4);
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText('Click or press Space to play again', FIELD.width / 2, 540);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(6, 6, 14, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 56px ${FONT_DISPLAY}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 20px ${FONT}`;
    ctx.fillText('Press P or click to keep playing', FIELD.width / 2, 372);
    ctx.textAlign = 'left';
  }

  function draw(g, screen, mouse) {
    ctx.save();
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    // Backdrop: deep night with slow stars.
    const backdrop = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    backdrop.addColorStop(0, '#0d0d1d');
    backdrop.addColorStop(1, '#07070f');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      const alpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(g.time * 1.2 + star.twinkle));
      ctx.globalAlpha = alpha;
      circle(star.x, star.y, star.r, '#cfd4ff');
    }
    ctx.globalAlpha = 1;

    if (g.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
    }

    // Arena floor and edge.
    ctx.fillStyle = PALETTE.arena;
    ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
    ctx.strokeStyle = PALETTE.arenaEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
    // Faint floor runes.
    ctx.strokeStyle = 'rgba(90, 79, 208, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(640, 378, 150, 0, Math.PI * 2);
    ctx.arc(640, 378, 230, 0, Math.PI * 2);
    ctx.stroke();

    // The Last Lantern stands at the arena's heart.
    drawLantern(640, 378, 0.5 + 0.5 * Math.sin(g.time * 2));

    for (const enemy of g.enemies) drawEnemy(enemy, g.time);
    drawPickups(g);
    for (const orb of g.ebullets) {
      glowCircle(orb.x, orb.y, 22, 'rgba(160, 63, 160, 0.6)', 1);
      circle(orb.x, orb.y, orb.radius, '#c05ac0');
      circle(orb.x, orb.y, orb.radius * 0.45, '#3a0a3a');
    }
    for (const bullet of g.bullets) {
      glowCircle(bullet.x, bullet.y, 18, 'rgba(255, 216, 102, 0.7)', 1);
      circle(bullet.x, bullet.y, bullet.radius, '#ffe9a8');
    }
    if (screen !== SCREEN_TITLE) drawPlayer(g);
    drawParticles(g);
    if (screen === SCREEN_PLAY || screen === SCREEN_UPGRADE || screen === SCREEN_PAUSED) drawHud(g);
    drawBanner(g);

    // Hurt / sunburst flash over everything.
    if (g.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 80, ${Math.min(0.35, g.flash * 0.5)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }

    if (screen === SCREEN_TITLE) drawTitle(g);
    else if (screen === SCREEN_UPGRADE) drawUpgrade(g);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(g);
    else if (screen === SCREEN_VICTORY) drawVictory(g);

    // Crosshair follows the mouse while playing.
    if (screen === SCREEN_PLAY && mouse) {
      ctx.strokeStyle = 'rgba(255, 243, 196, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 11, 0, Math.PI * 2);
      ctx.moveTo(mouse.x - 16, mouse.y);
      ctx.lineTo(mouse.x - 6, mouse.y);
      ctx.moveTo(mouse.x + 6, mouse.y);
      ctx.lineTo(mouse.x + 16, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - 16);
      ctx.lineTo(mouse.x, mouse.y - 6);
      ctx.moveTo(mouse.x, mouse.y + 6);
      ctx.lineTo(mouse.x, mouse.y + 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  return { draw };
}
