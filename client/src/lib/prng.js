/** FNV-1a string hash → 32-bit unsigned. */
export function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/** mulberry32 seeded PRNG: returns a function producing [0, 1). */
export function prng(seed) {
  let a = typeof seed === 'number' ? seed : hash(seed);
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rand, list) => list[Math.floor(rand() * list.length)];
export const between = (rand, a, b) => a + rand() * (b - a);

/** A stable small rotation (degrees) for a record, for stickers and tickets. */
export const tiltFor = (seed, max = 2.2) => {
  const r = prng(`tilt:${seed}`)();
  return Math.round((r * 2 - 1) * max * 10) / 10;
};
