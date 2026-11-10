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
