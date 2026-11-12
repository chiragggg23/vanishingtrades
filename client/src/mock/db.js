// In-memory mock database, persisted to localStorage when it is available.
import { buildSeed } from '../../../shared/seed.js';

const KEY = 'vt-mock-db-v2';
let db = null;

const storage = () => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

function fresh() {
  const seed = buildSeed(new Date());
  seed.stories.forEach((s) => {
    if (s.hasSampleAudio) s.audioUrl = `sample:hum:${s.id}`;
  });
  return { ...seed, sessions: {} };
}

export function getDb() {
  if (db) return db;
  const ls = storage();
  if (ls) {
    try {
      const raw = ls.getItem(KEY);
      if (raw) db = JSON.parse(raw);
    } catch {
      db = null;
    }
  }
  if (!db) {
    db = fresh();
    save();
  }
  return db;
}

export function save() {
  const ls = storage();
  if (!ls || !db) return;
  try {
    ls.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

/** Re-seed. Keeps nothing, including sessions. */
export function resetDb() {
  db = fresh();
  save();
  return db;
}
