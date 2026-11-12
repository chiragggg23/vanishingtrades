import { useTranslation } from 'react-i18next';
import s from './Badges.module.css';

const TONE = {
  draft: 'plain',
  pending: 'turmeric',
  approved: 'leaf',
  rejected: 'madder',
  open: 'indigo',
  answered: 'leaf',
  closed: 'plain',
  applied: 'plain',
  shortlisted: 'turmeric',
  accepted: 'indigo',
  completed: 'leaf',
  resolved: 'plain',
  active: 'leaf',
  paused: 'madder',
};

/** Small rubber-stamp status label. */
export function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`${s.badge} ${s[TONE[status] || 'plain']}`}>{t(`status.${status}`)}</span>
  );
}

const VERIFY_TONE = { none: 'plain', pending: 'turmeric', verified: 'leaf', rejected: 'madder' };

/** Where an artisan's verification request stands (dashboard and admin only). */
export function VerifyStatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`${s.badge} ${s[VERIFY_TONE[status] || 'plain']}`}>
      {t(`trust.status.${status}`)}
    </span>
  );
}

/** The public mark: an admin has checked this artisan's proof of craft. */
export function VerifiedBadge({ compact = false, className = '' }) {
  const { t } = useTranslation();
  return (
    <span
      className={`${s.verified} ${compact ? s.verifiedCompact : ''} ${className}`}
      title={t('trust.badgeTitle')}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" focusable="false">
        <path
          d="M3 8.6l3.1 3.1L13 4.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {compact ? t('trust.badgeShort') : t('trust.badge')}
    </span>
  );
}

/** A clearly visible SAMPLE marker for illustrative numbers and placeholder data. */
export function SampleStamp({ className = '', title }) {
  const { t } = useTranslation();
  return (
    <span className={`${s.sample} ${className}`} title={title || t('sample.title')}>
      {t('sample.label')}
    </span>
  );
}

/** Craft type chip. */
export function CraftChip({ type }) {
  const { t } = useTranslation();
  return <span className={s.chip}>{t(`craft.${type}`)}</span>;
}
