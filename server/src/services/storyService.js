// Stories: draft -> pending -> approved | rejected, the AI step, the review desk and the public
// archive (SDG 11.4).
import { Artisan, Story } from '../models/index.js';
import { STORY_EDITABLE, normaliseSegments } from '../../../shared/rules.js';
import { cmp } from '../../../shared/search.js';
import { fail, MSG, plain, toId } from '../utils/http.js';
import {
  V,
  audit,
  byIds,
  ensureArtisanProfile,
  findPlain,
  myArtisan,
  pagedAggregate,
} from './common.js';
import { processStory } from './ai/index.js';
import { loadAudio, saveAudio } from './storage.js';

const out = async (s) => V.storyView(s, await findPlain(Artisan, s.artisanId));
const editable = (s) => {
  if (!STORY_EDITABLE.includes(s.status))
    fail(409, 'This story is with a reviewer or already in the archive, so it cannot change now.');
};
async function ownStory(user, id) {
  const s = await findPlain(Story, id);
  const a = await myArtisan(user);
  if (!s || !a || s.artisanId !== a.id) fail(404, MSG.notFound);
  return s;
}
const save = async (id, set) =>
  plain(await Story.findByIdAndUpdate(id, { $set: set }, { new: true }).lean());

export async function mine(user) {
  const a = await myArtisan(user);
  if (!a) return [];
  const list = plain(
    await Story.find({ artisanId: toId(a.id) })
      .sort({ updatedAt: -1, _id: -1 })
      .lean(),
  );
  return list.map((s) => V.storyView(s, a));
}

export async function create(user, body) {
  const a = await ensureArtisanProfile(user);
  const doc = await Story.create({
    artisanId: toId(a.id),
    title: body.title,
    language: body.language,
    craftType: body.craftType || a.craftType,
    text: body.text || '',
    status: 'draft',
  });
  return V.storyView(plain(doc.toObject()), a);
}

export async function getOne(user, id) {
  const s = await findPlain(Story, id);
  let ok = false;
  if (s && ['reviewer', 'admin'].includes(user.role)) ok = true;
  else if (s && user.role === 'artisan') ok = s.artisanId === (await myArtisan(user))?.id;
  if (!ok) fail(404, MSG.notFound);
  return out(s);
}

export async function update(user, id, body) {
  const s = await ownStory(user, id);
  editable(s);
  if (body.transcript) body.transcript = normaliseSegments(body.transcript);
  if (body.translation) body.translation = normaliseSegments(body.translation);
  return out(await save(id, body));
}

export async function uploadAudio(user, id, file, { durationSec }) {
  const s = await ownStory(user, id);
  editable(s);
  const audioUrl = await saveAudio(file.buffer, file.mimetype, `${id}-${Date.now()}`);
  return out(await save(id, { audioUrl, audioIsSample: false, durationSec }));
}

export async function submit(user, id) {
  const s = await ownStory(user, id);
  editable(s);
  if (!s.transcript.length && !String(s.text || '').trim())
    fail(422, MSG.invalid, {
      errors: { transcript: 'Add some text, or process the recording first.' },
    });
  return out(await save(id, { status: 'pending', submittedAt: new Date(), reviewNote: null }));
}

export async function remove(user, id) {
  let s;
  if (user.role === 'admin') {
    s = (await findPlain(Story, id)) || fail(404, MSG.notFound);
    await audit(user, 'story.remove', 'story', s.id, { title: s.title });
  } else {
    s = await ownStory(user, id);
    editable(s);
  }
  await Story.deleteOne({ _id: toId(id) });
  return { id: s.id };
}

export async function processWithAi(user, id) {
  const s = await ownStory(user, id);
  editable(s);
  if (!s.audioUrl && !String(s.text || '').trim())
    fail(422, MSG.invalid, { errors: { audio: 'Record or upload audio, or type the story.' } });
  const result = await processStory(s, { loadAudio });
  return out(
    await save(id, {
      ...result,
      ai: { ...result.ai, processedAt: new Date(result.ai.processedAt) },
    }),
  );
}

// ---- review --------------------------------------------------------------------------------------
export async function queue(query) {
  const page = await pagedAggregate(Story, {
    match: { status: 'pending' },
    lookupArtisan: true,
    sort: { submittedAt: 1 },
    query,
  });
  return {
    items: page.items.map((s) => V.storyView(s, s.artisanDoc)),
    pagination: page.pagination,
  };
}

async function reviewable(id) {
  const s = await findPlain(Story, id);
  if (!s || s.status === 'draft') fail(404, MSG.notFound);
  return s;
}
export const reviewGet = async (id) => out(await reviewable(id));

export async function approve(user, id, { edits = {}, note }) {
  const s = await reviewable(id);
  if (s.status !== 'pending') fail(409, 'Only stories waiting for review can be approved.');
  const set = { ...edits };
  if (set.transcript) set.transcript = normaliseSegments(set.transcript);
  if (set.translation) set.translation = normaliseSegments(set.translation);
  Object.assign(set, {
    status: 'approved',
    approvedAt: new Date(),
    reviewNote: note || null,
    reviewedBy: toId(user.id),
  });
  return out(await save(id, set));
}

export async function reject(user, id, { note }) {
  const s = await reviewable(id);
  if (s.status !== 'pending') fail(409, 'Only stories waiting for review can be sent back.');
  return out(await save(id, { status: 'rejected', reviewNote: note, reviewedBy: toId(user.id) }));
}

// ---- archive (public) ----------------------------------------------------------------------------
export async function archiveList(query) {
  const match = { status: 'approved' };
  if (query.language) match.language = query.language;
  if (query.craftType) match.craftType = query.craftType;
  const sorts = { oldest: { approvedAt: 1 }, 'most-played': { plays: -1 } };
  const page = await pagedAggregate(Story, {
    match,
    lookupArtisan: true,
    q: query.q,
    qFields: ['title', 'summary.en', 'artisanDoc.name', 'transcript.text', 'translation.text'],
    sort: sorts[query.sort] || { approvedAt: -1 },
    query,
  });
  return {
    items: page.items.map((s) => V.archiveItem(s, s.artisanDoc)),
    pagination: page.pagination,
  };
}

export async function facets() {
  const list = await Story.find({ status: 'approved' }, { language: 1, craftType: 1 }).lean();
  const facet = (key) => {
    const m = {};
    list.forEach((s) => (m[s[key]] = (m[s[key]] || 0) + 1));
    return Object.keys(m)
      .sort(cmp)
      .map((k) => ({ key: k, count: m[k] }));
  };
  return { languages: facet('language'), craftTypes: facet('craftType') };
}

export async function archiveGet(id) {
  const s = await findPlain(Story, id);
  if (!s || s.status !== 'approved') fail(404, MSG.notFound);
  return V.archiveDetail(s, await findPlain(Artisan, s.artisanId));
}

export async function play(id) {
  const s = await findPlain(Story, id);
  if (!s || s.status !== 'approved') fail(404, MSG.notFound);
  const doc = await Story.findByIdAndUpdate(
    id,
    { $inc: { plays: 1 } },
    { new: true, timestamps: false },
  ).lean();
  return { plays: doc.plays };
}

export { byIds };
