import { useTranslation } from 'react-i18next';
import s from './Pagination.module.css';

/** Page controls. onPage(n) is called with the new page number. */
export default function Pagination({ pagination, onPage, label }) {
  const { t } = useTranslation();
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return (
    <nav className={s.nav} aria-label={label || t('pagination.label')}>
      <button
        type="button"
        className={s.btn}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {t('pagination.prev')}
      </button>
      <ol className={s.list}>
        {pages.map((p, i) =>
          p === '…' ? (
            <li key={`gap${i}`} className={s.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={`${s.btn} ${s.num}`}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPage(p)}
              >
                <span className="visually-hidden">{t('pagination.page')} </span>
                {p}
              </button>
            </li>
          ),
        )}
      </ol>
      <button
        type="button"
        className={s.btn}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {t('pagination.next')}
      </button>
    </nav>
  );
}
