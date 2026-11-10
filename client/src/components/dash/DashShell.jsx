import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import s from './Dash.module.css';

/** Quiet dashboard frame: title, optional tab strip, content. Work happens here, so no tilt. */
export default function DashShell({ title, lede, tabs, children, aside }) {
  const { t } = useTranslation();
  return (
    <div className={`page ${s.shell}`}>
      <header className={s.head}>
        <div>
          <h1 className={s.title}>{title}</h1>
          {lede && <p className={s.lede}>{lede}</p>}
        </div>
        {aside}
      </header>
      {tabs && (
        <nav className={s.tabs} aria-label={t('dash.sections')}>
          <ul>
            {tabs.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) => (isActive ? s.on : undefined)}
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className={s.body}>{children}</div>
    </div>
  );
}

/** A flat panel for dashboard content. */
export function Panel({ title, id, children, actions, className = '' }) {
  return (
    <section className={`${s.panel} ${className}`} aria-labelledby={id}>
      {(title || actions) && (
        <div className={s.panelHead}>
          {title && (
            <h2 id={id} className={s.panelTitle}>
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
