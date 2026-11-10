const LOCALES = { en: 'en-IN', kn: 'kn-IN', hi: 'hi-IN' };

export function formatDate(iso, lng = 'en', opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(LOCALES[lng] || 'en-IN', opts).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 10);
  }
}

export function formatNumber(n, lng = 'en') {
  try {
    return new Intl.NumberFormat(LOCALES[lng] || 'en-IN').format(n);
  } catch {
    return String(n);
  }
}

const rupees = (n, lng) => `₹${formatNumber(n, lng)}`;

export function formatPrice(min, max, lng, t) {
  if (min == null && max == null) return t('gallery.priceOnRequest');
  if (min != null && max != null && min !== max) return `${rupees(min, lng)} – ${rupees(max, lng)}`;
  return rupees(min ?? max, lng);
}

export function formatDuration(sec) {
  if (sec == null || Number.isNaN(sec)) return '0:00';
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
