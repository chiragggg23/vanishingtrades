import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import s from './Filters.module.css';

/** Search box that commits on submit (Enter or the button). */
export function SearchBox({ value, onSearch, label, placeholder }) {
  const { t } = useTranslation();
  const id = useId();
  const [q, setQ] = useState(value);
  useEffect(() => setQ(value), [value]);
  return (
    <form
      role="search"
      className={s.search}
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(q.trim());
      }}
    >
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <div className={s.searchRow}>
        <input
          id={id}
          type="search"
          className="field-input"
          value={q}
          placeholder={placeholder}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className={s.go}>
          {t('common.search')}
        </button>
      </div>
    </form>
  );
}

/** Labelled select that applies on change. options: [{value, label}] */
export function SelectFilter({ label, value, onChange, options, allLabel }) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <select
        id={id}
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The type-case drawer: a collapsible panel on small screens, a side rail on wide ones. */
export function FilterDrawer({ title, children, onClear, activeCount = 0 }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <aside className={s.drawer} aria-labelledby={`${id}-h`}>
      <div className={s.drawerHead}>
        <h2 id={`${id}-h`} className={s.drawerTitle}>
          {title}
          {activeCount > 0 && (
            <span className={s.count}>{t('filters.active', { count: activeCount })}</span>
          )}
        </h2>
        <button
          type="button"
          className={s.toggle}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? t('filters.hide') : t('filters.show')}
        </button>
      </div>
      <div id={`${id}-body`} className={`${s.body} ${open ? s.open : ''}`}>
        {children}
        {onClear && activeCount > 0 && (
          <button type="button" className={s.clear} onClick={onClear}>
            {t('filters.clear')}
          </button>
        )}
      </div>
    </aside>
  );
}
