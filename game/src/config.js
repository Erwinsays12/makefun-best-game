// Emberkeep — every tuning number, colour and wave table in one place.
// The arena is a fixed 1280x720 logical field; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };
export const ARENA = { x: 48, y: 84, width: 1184, height: 588 };

/** The simulation's fixed step, in seconds: 60 updates a second, whatever the display rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 300,
  maxHearts: 3,
  fireInterval: 0.22,
  bulletSpeed: 640,
  bulletDamage: 1,
  dashSpeed: 780,
  dashTime: 0.16,
  dashCooldown: 1.6,
  invulnerableAfterHit: 1.2,
  magnetRadius: 90,
  comboWindow: 3.0,
};

export const SUNBURST = { startCharges: 2, maxCharges: 4, damage: 6, radius: 520 };

/** Enemy kinds. hp and speed grow a little with the wave; see waves.js. */
export const ENEMIES = {
  mote: { radius: 14, hp: 1, speed: 118, score: 10, colour: '#8b7ff0', glow: '#5a4fd0' },
  spitter: { radius: 17, hp: 2, speed: 82, score: 25, colour: '#e07be0', glow: '#a03fa0', range: 340, shotInterval: 2.4 },
  splitter: { radius: 20, hp: 3, speed: 96, score: 30, colour: '#5fd0a0', glow: '#2f9068' },
  brute: { radius: 30, hp: 9, speed: 58, score: 60, colour: '#e07840', glow: '#a04a20' },
  boss: { radius: 56, hp: 220, speed: 52, score: 1000, colour: '#d84a6a', glow: '#8a1f3d' },
};

export const BULLET = { radius: 6, life: 1.4 };
export const ORB = { radius: 8, speed: 230, life: 5 };

/** How many of each kind a wave sends, and how fast they arrive. */
export const WAVES = [
  { motes: 8, spitters: 0, splitters: 0, brutes: 0, interval: 0.9 },
  { motes: 12, spitters: 2, splitters: 0, brutes: 0, interval: 0.8 },
  { motes: 14, spitters: 3, splitters: 3, brutes: 0, interval: 0.72 },
  { motes: 16, spitters: 4, splitters: 4, brutes: 1, interval: 0.66 },
  { motes: 18, spitters: 5, splitters: 5, brutes: 2, interval: 0.6 },
  { motes: 20, spitters: 6, splitters: 6, brutes: 2, interval: 0.55 },
  { motes: 22, spitters: 7, splitters: 7, brutes: 3, interval: 0.5 },
  { motes: 24, spitters: 8, splitters: 8, brutes: 3, interval: 0.46 },
  { motes: 26, spitters: 9, splitters: 9, brutes: 4, interval: 0.42 },
  { motes: 10, spitters: 4, splitters: 4, brutes: 2, boss: true, interval: 0.5 },
];

export const FINAL_WAVE = 10;

/**
 * Upgrades offered between waves. Each one names its own apply step in
 * waves.js; `max` caps how often it can be taken across a run.
 */
export const UPGRADES = [
  { id: 'damage', name: 'Bright Bolt', text: '+1 bolt damage', max: 5 },
  { id: 'rate', name: 'Quick Wick', text: 'Fire 14% faster', max: 5 },
  { id: 'multishot', name: 'Twin Flame', text: '+1 bolt per shot', max: 3 },
  { id: 'pierce', name: 'Piercing Light', text: 'Bolts pierce +1 foe', max: 3 },
  { id: 'speed', name: 'Swift Step', text: '+12% move speed', max: 4 },
  { id: 'dash', name: 'Ember Dash', text: 'Dash recharges 25% faster', max: 3 },
  { id: 'heart', name: 'Lantern Heart', text: '+1 max heart, heal 1', max: 2 },
  { id: 'magnet', name: 'Warm Glow', text: '+60% pickup pull', max: 3 },
  { id: 'orbiter', name: 'Orbit Ember', text: '+1 orbiting ember', max: 3 },
  { id: 'burst', name: 'Sunburst Cache', text: '+1 Sunburst charge', max: 2 },
  { id: 'combo', name: 'Long Fuse', text: 'Combo lasts +1.5 s', max: 3 },
  { id: 'velocity', name: 'Swift Bolt', text: '+18% bolt speed', max: 3 },
];

export const PALETTE = {
  backdrop: '#0a0a14',
  arena: '#12121f',
  arenaEdge: '#2a2a44',
  lantern: '#f7c948',
  lanternGlow: '#ffdf80',
  player: '#ffd866',
  playerCore: '#fff3c4',
  text: '#f2ead8',
  muted: '#9a94b8',
  panel: 'rgba(18, 18, 34, 0.92)',
  panelEdge: '#3d3a5c',
  heart: '#ff5a6e',
  heartEmpty: '#3a2a3a',
  danger: '#ff4d5e',
  shard: '#7be0ff',
  boss: '#d84a6a',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_DISPLAY = '"Georgia", "Times New Roman", serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberkeep.best';
