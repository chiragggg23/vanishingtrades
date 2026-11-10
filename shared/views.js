// Serializers from plain stored records (ids as strings, dates as ISO strings) to API shapes.
// Both the mock and the server call these, so response shapes cannot drift apart.
const iso = (d) => (d == null ? null : d instanceof Date ? d.toISOString() : String(d));
const seg = (s) => ({ id: s.id, start: s.start ?? null, end: s.end ?? null, text: s.text });
const loc = (l) => {
  const out = { en: l?.en ?? '' };
  if (l?.kn) out.kn = l.kn;
  if (l?.hi) out.hi = l.hi;
  return out;
};

export const userView = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  active: u.active !== false,
  preferredLang: u.preferredLang || 'en',
  createdAt: iso(u.createdAt),
});

export const publicUser = (u) => (u ? { id: u.id, name: u.name } : { id: null, name: 'Former member' });

export const artisanRef = (a) =>
  a
    ? { id: a.id, name: a.name, village: a.village, district: a.district, craftType: a.craftType }
    : null;

export const artisanView = (a, counts = {}) => ({
  id: a.id,
  userId: a.userId,
  name: a.name,
  craftType: a.craftType,
  village: a.village,
  district: a.district,
  bio: loc(a.bio),
  yearsOfPractice: a.yearsOfPractice ?? 0,
  languages: a.languages || [],
  avatarUrl: a.avatarUrl ?? null,
  seed: a.seed,
  featured: Boolean(a.featured),
  worksCount: counts.worksCount ?? 0,
  storiesCount: counts.storiesCount ?? 0,
  createdAt: iso(a.createdAt),
  updatedAt: iso(a.updatedAt),
});

export const craftView = (c, artisan) => ({
  id: c.id,
  artisanId: c.artisanId,
  artisan: artisanRef(artisan),
  title: loc(c.title),
  craftType: c.craftType,
  description: loc(c.description),
  materials: c.materials || [],
  priceMin: c.priceMin ?? null,
  priceMax: c.priceMax ?? null,
  imageUrl: c.imageUrl ?? null,
  seed: c.seed,
  createdAt: iso(c.createdAt),
  updatedAt: iso(c.updatedAt),
});

export const storyView = (s, artisan) => ({
  id: s.id,
  artisanId: s.artisanId,
  artisan: artisanRef(artisan),
  title: s.title,
  language: s.language,
  craftType: s.craftType,
  text: s.text || '',
  audioUrl: s.audioUrl ?? null,
  audioIsSample: Boolean(s.audioIsSample),
  durationSec: s.durationSec ?? null,
  transcript: (s.transcript || []).map(seg),
  translation: (s.translation || []).map(seg),
  summary: { en: s.summary?.en || '' },
  tags: s.tags || [],
  ai: s.ai
    ? { provider: s.ai.provider, isSample: Boolean(s.ai.isSample), processedAt: iso(s.ai.processedAt) }
    : null,
  status: s.status,
  reviewNote: s.reviewNote ?? null,
  submittedAt: iso(s.submittedAt),
  approvedAt: iso(s.approvedAt),
  plays: s.plays || 0,
  createdAt: iso(s.createdAt),
  updatedAt: iso(s.updatedAt),
});

export const archiveDetail = (s, artisan) => {
  const v = storyView(s, artisan);
  delete v.reviewNote;
  return v;
};

export const archiveItem = (s, artisan) => {
  const v = archiveDetail(s, artisan);
  delete v.text;
  delete v.transcript;
  delete v.translation;
  return v;
};

export const enquiryView = (e, { buyer, artisan, craft, usersById }) => ({
  id: e.id,
  buyer: publicUser(buyer),
  artisan: artisanRef(artisan),
  craft: craft ? { id: craft.id, title: loc(craft.title) } : null,
  subject: e.subject,
  message: e.message,
  status: e.status,
  replies: (e.replies || []).map((r) => {
    const author = usersById[r.authorId];
    return {
      id: r.id,
      author: publicUser(author),
      authorRole: r.authorId === buyer?.id ? 'buyer' : r.authorId === artisan?.userId ? 'artisan' : author?.role || 'admin',
      message: r.message,
      createdAt: iso(r.createdAt),
    };
  }),
  createdAt: iso(e.createdAt),
  updatedAt: iso(e.updatedAt),
});

export const apprenticeshipView = (p, artisan, applicationsCount = 0) => ({
  id: p.id,
  artisanId: p.artisanId,
  artisan: artisanRef(artisan),
  title: p.title,
  craftType: p.craftType,
  description: p.description,
  seats: p.seats,
  durationWeeks: p.durationWeeks,
  stipend: p.stipend ?? null,
  location: p.location,
  deadline: iso(p.deadline),
  status: p.status,
  applicationsCount,
  createdAt: iso(p.createdAt),
  updatedAt: iso(p.updatedAt),
});

export const applicationView = (a, { apprenticeship, artisan, learner }) => ({
  id: a.id,
  apprenticeshipId: a.apprenticeshipId,
  apprenticeship: apprenticeship
    ? {
        id: apprenticeship.id,
        title: apprenticeship.title,
        craftType: apprenticeship.craftType,
        artisanName: artisan?.name || '',
        durationWeeks: apprenticeship.durationWeeks,
      }
    : null,
  learner: publicUser(learner),
  motivation: a.motivation,
  status: a.status,
  roadmap: (a.roadmap || []).map((s) => ({
    id: s.id,
    key: s.key,
    done: Boolean(s.done),
    doneAt: iso(s.doneAt),
  })),
  certificateCode: a.certificateCode ?? null,
  createdAt: iso(a.createdAt),
  updatedAt: iso(a.updatedAt),
});

export const progressView = (p) => ({
  id: p.id,
  applicationId: p.applicationId,
  note: p.note,
  photoUrl: p.photoUrl ?? null,
  createdAt: iso(p.createdAt),
});

export const certificateView = (c) => ({
  code: c.code,
  learnerName: c.learnerName,
  artisanName: c.artisanName,
  craftType: c.craftType,
  apprenticeshipTitle: c.apprenticeshipTitle,
  durationWeeks: c.durationWeeks,
  issuedAt: iso(c.issuedAt),
});

export const flagView = (f, { reporter, targetLabel }) => ({
  id: f.id,
  targetType: f.targetType,
  targetId: f.targetId,
  targetLabel: targetLabel ?? null,
  reason: f.reason,
  reporter: publicUser(reporter),
  status: f.status,
  resolution: f.resolution ?? null,
  resolvedAt: iso(f.resolvedAt),
  createdAt: iso(f.createdAt),
});

export const auditView = (a, actor) => ({
  id: a.id,
  actor: publicUser(actor),
  action: a.action,
  targetType: a.targetType,
  targetId: a.targetId,
  details: a.details || {},
  createdAt: iso(a.createdAt),
});
