// Impact numbers grouped by SDG, computed from plain records. Used by the mock and the server.
const countBy = (items, key) => {
  const m = new Map();
  items.forEach((i) => m.set(i[key], (m.get(i[key]) || 0) + 1));
  return [...m.entries()]
    .filter(([k, c]) => k != null && c > 0)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, count]) => ({ key, count }));
};

/**
 * data: { users, artisans, crafts, stories, enquiries, apprenticeships, applications, certificates }
 * Each record needs only the fields used below.
 */
export function impactTotals(data) {
  const approved = data.stories.filter((s) => s.status === 'approved');
  const artisanUserIds = new Map(data.artisans.map((a) => [a.id, a.userId]));
  const seconds = approved.reduce((sum, s) => sum + (s.durationSec || 0), 0);
  return {
    sdg8: {
      artisans: data.artisans.length,
      works: data.crafts.length,
      enquiries: data.enquiries.length,
      enquiriesAnswered: data.enquiries.filter((e) =>
        (e.replies || []).some((r) => r.authorId === artisanUserIds.get(e.artisanId)),
      ).length,
    },
    sdg11: {
      storiesArchived: approved.length,
      languages: new Set(approved.map((s) => s.language)).size,
      minutesRecorded: Math.round((seconds / 60) * 10) / 10,
      plays: approved.reduce((sum, s) => sum + (s.plays || 0), 0),
    },
    sdg4: {
      openings: data.apprenticeships.filter((p) => p.status === 'open').length,
      applications: data.applications.length,
      learnersInTraining: new Set(
        data.applications.filter((a) => a.status === 'accepted').map((a) => a.learnerId),
      ).size,
      certificates: data.certificates.length,
    },
  };
}

export const isSampleWorld = (users) => users.every((u) => u.demo === true);

export function lastSixMonths(now = new Date()) {
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}
const monthOf = (iso) => (iso ? String(iso instanceof Date ? iso.toISOString() : iso).slice(0, 7) : null);
const perMonth = (months, items, field) =>
  months.map((m) => items.filter((i) => monthOf(i[field]) === m).length);

export function impactDashboard(data, now = new Date()) {
  const months = lastSixMonths(now);
  const enq = perMonth(months, data.enquiries, 'createdAt');
  const works = perMonth(months, data.crafts, 'createdAt');
  const sub = perMonth(months, data.stories, 'submittedAt');
  const appr = perMonth(months, data.stories, 'approvedAt');
  const apps = perMonth(months, data.applications, 'createdAt');
  const certs = perMonth(months, data.certificates, 'issuedAt');
  return {
    isSample: isSampleWorld(data.users),
    totals: impactTotals(data),
    series: {
      sdg8: months.map((month, i) => ({ month, enquiries: enq[i], works: works[i] })),
      sdg11: months.map((month, i) => ({ month, submitted: sub[i], approved: appr[i] })),
      sdg4: months.map((month, i) => ({ month, applications: apps[i], certificates: certs[i] })),
    },
    breakdowns: {
      worksByCraft: countBy(data.crafts, 'craftType'),
      storiesByLanguage: countBy(
        data.stories.filter((s) => s.status === 'approved'),
        'language',
      ),
      applicationsByStatus: countBy(data.applications, 'status'),
    },
  };
}
