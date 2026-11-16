// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, upgrade draft, paused, game over and victory.
//
// ?seed=N fixes the run's random pattern. ?shot=title|play|upgrade|victory
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSound } from './audio.js';
import { createEffects } from './particles.js';
import {
  ACTION_CONFIRM,
  ACTION_DASH,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_PICK_1,
  ACTION_PICK_2,
  ACTION_PICK_3,
  ACTION_SUNBURST,
  createInput,
} from './input.js';
import { sunburst } from './entities.js';
import { applyUpgrade, startWave } from './waves.js';
import { createWorld, resetRun, stepWorld, toTitle } from './world.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_UPGRADE,
  SCREEN_VICTORY,
  createRenderer,
  upgradeCardRects,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const sfx = createSound();
const fx = createEffects();
const world = createWorld(seed, sfx, fx);
const renderer = createRenderer(canvas);
const input = createInput(canvas);

// The canvas keeps its 1280x720 backing store and is scaled by CSS to fit
// the window, so mouse coordinates map straight onto the logical field.
function fitCanvas() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  canvas.style.width = `${Math.floor(1280 * scale)}px`;
  canvas.style.height = `${Math.floor(720 * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

world.best = readBest();
toTitle(world);

// A handle for play-testing from the console or a probe script.
window.__emberkeep = { world, sfx };

function runShot(name) {
  const scene = stageShot(name, world);
  world.best = Math.max(world.best, scene.best);
  let painted = 0;
  function paint() {
    // No crosshair in a staged shot: the mouse never moved in this session.
    renderer.draw(world, scene.screen, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    sfx.unlock();
    resetRun(world, Math.floor(Math.random() * 4294967296));
    world.best = readBest();
    screen = SCREEN_PLAY;
    announce('Playing. Three hearts. Survive ten waves.');
  }

  function finishRun() {
    if (world.score > world.best) {
      world.best = world.score;
      saveBest(world.best);
    }
  }

  function pickUpgrade(index) {
    const choice = world.choices[index];
    if (!choice) return;
    applyUpgrade(world, choice.id);
    startWave(world, world.wave + 1);
    world.phase = 'play';
    screen = SCREEN_PLAY;
    announce(`Wave ${world.wave}. ${choice.name}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = sfx.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_SUNBURST && screen === SCREEN_PLAY) sunburst(world);

    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_UPGRADE) {
      if (actions & ACTION_PICK_1) pickUpgrade(0);
      else if (actions & ACTION_PICK_2) pickUpgrade(1);
      else if (actions & ACTION_PICK_3) pickUpgrade(2);
      else {
        const click = input.takeClick();
        if (click) {
          const rects = upgradeCardRects();
          const hit = rects.findIndex(
            (r) => click.x >= r.x && click.x <= r.x + r.width && click.y >= r.y && click.y <= r.y + r.height,
          );
          if (hit !== -1) pickUpgrade(hit);
        }
      }
    } else if (screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
      if (actions & ACTION_CONFIRM) {
        finishRun();
        startGame();
      }
    }

    // The world only simulates while playing; the other screens are drawn
    // over the world as it stands.
    if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
      while (accumulator >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_TITLE)) {
        stepWorld(world, {
          direction: input.direction(),
          aimX: input.mouse.x,
          aimY: input.mouse.y,
          firing: input.firing,
          dash: Boolean(actions & ACTION_DASH),
          sunburst: false,
        }, STEP);
        accumulator -= STEP;
        if (world.phase === 'upgrade') {
          screen = SCREEN_UPGRADE;
          // Drop any click left over from play (the shot that cleared the
          // wave): it must not pick a card by itself.
          input.takeClick();
          announce(`Wave ${world.wave} cleared. Choose one blessing.`);
        } else if (world.phase === 'over') {
          screen = SCREEN_OVER;
          finishRun();
          announce(`Game over. Score ${world.score}. Best ${world.best}.`);
        } else if (world.phase === 'victory') {
          screen = SCREEN_VICTORY;
          finishRun();
          announce(`Victory. Score ${world.score}. Best ${world.best}.`);
        }
      }
    } else {
      stepWorld(world, {
        direction: { x: 0, y: 0 },
        aimX: 640,
        aimY: 300,
        firing: false,
        dash: false,
        sunburst: false,
      }, Math.min(accumulator, STEP));
      accumulator = 0;
    }
    sfx.update(STEP);
    renderer.draw(world, screen, input.mouse);
  }

  // Leaving the tab pauses a running game rather than letting glooms close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // The first gesture anywhere unlocks sound.
  window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  window.addEventListener('keydown', () => sfx.unlock(), { once: true });

  announce('Emberkeep. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
