# Emberkeep — Last Light of the Hollow

A complete, original top-down arena survival game for the make.fun
best-game-01 bounty. You are Pip, keeper of the Last Lantern: hold the
lantern, banish the glooms, survive all 10 waves, and defeat the Hollow King.

## How to play

- **Move** — WASD / arrow keys
- **Aim** — mouse
- **Fire light bolts** — hold click
- **Dash** (brief invulnerability) — Shift
- **Sunburst** (nova that clears orbs and wounds every gloom) — Q / E
- **Pause** — P, **Mute** — M

Between waves, pick one of three upgrade cards with the mouse (or keys
1–3): brighter bolts, twin flame, piercing light, orbiting embers, extra
hearts, faster dash, and more. Kills build a combo multiplier; the boss
wave ends the game — win or lose.

## What is here

- `game/` — the playable game as static files: `index.html` plus ES modules
  under `src/` (config, seeded random, synthesised WebAudio sound, input,
  particles, entities, waves, world, render, screenshot scenes). No library,
  no network request; open `game/index.html` from any static server.
- `screenshots/` — four real renders of the game's own code: title, play,
  upgrade draft, victory.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `serve.ts` — a tiny static server for local play (`node serve.ts`).

## Run it

```sh
node serve.ts            # play at http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # build the hand-in
```

Screenshots are staged deterministically: `game/index.html?shot=title|play|upgrade|victory&seed=N`.

## License

MIT — see LICENSE.
