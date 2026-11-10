// Synthesises a soft, quiet "hum" as a 16-bit mono WAV. Works in Node and the browser.
// Used for seeded stories that have no real recording (audioIsSample: true).
function hashSeed(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function synthHumWav(seed = 'vt', durationSec = 20, sampleRate = 8000) {
  const n = Math.floor(durationSec * sampleRate);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  const h = hashSeed(seed);
  const base = 98 + (h % 40); // a low drone, different per story
  const fifth = base * 1.5;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.12 * t + (h % 7));
    const fade = Math.min(1, t / 1.5, (durationSec - t) / 1.5);
    const s =
      (Math.sin(2 * Math.PI * base * t) * 0.6 + Math.sin(2 * Math.PI * fifth * t) * 0.25) *
      swell *
      fade *
      0.18;
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true);
  }
  return new Uint8Array(buf);
}
