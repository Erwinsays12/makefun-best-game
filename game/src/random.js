// A small seeded random number generator (mulberry32). The same seed gives the
// same sequence, which is what makes the screenshot scenes repeatable and the
// game fair to re-run. Nothing in the simulation uses Math.random.
export function createRandom(seed) {
  let state = seed | 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number in [min, max). */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** Pick one element of an array. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** Fisher-Yates shuffle, in place, driven by the seeded generator. */
export function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const held = list[i];
    list[i] = list[j];
    list[j] = held;
  }
  return list;
}
