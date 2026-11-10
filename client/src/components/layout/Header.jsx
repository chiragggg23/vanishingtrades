import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, homeFor } from '../../context/AuthContext.jsx';
import LangSwitch from '../ui/LangSwitch.jsx';
import s from './Header.module.css';

const PUBLIC_LINKS = [
  ['/gallery', 'nav.gallery'],
  ['/archive', 'nav.archive'],
  ['/apprenticeships', 'nav.apprenticeships'],
  ['/impact', 'nav.impact'],
];

export default function Header() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className={s.header}>
      <div className={`page ${s.bar}`}>
        <NavLink to="/" className={s.brand}>
          <span className={s.mark} aria-hidden="true">
            VT
          </span>
          <span className={s.word}>
            Vanishing<span className={s.trades}>Trades</span>
          </span>
        </NavLink>
        <button
          type="button"
          className={s.menuBtn}
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span className={s.burger} aria-hidden="true" />
          {open ? t('nav.close') : t('nav.menu')}
        </button>
        <nav id="site-nav" className={`${s.nav} ${open ? s.open : ''}`} aria-label={t('nav.main')}>
          <ul className={s.links}>
            {PUBLIC_LINKS.map(([to, key]) => (
              <li key={to}>
                <NavLink to={to} className={({ isActive }) => (isActive ? s.active : undefined)}>
                  {t(key)}
                </NavLink>
              </li>
            ))}
            {user && (
              <li>
                <NavLink
                  to={homeFor(user.role)}
                  className={({ isActive }) => `${s.dash} ${isActive ? s.active : ''}`}
                >
                  {user.role === 'admin' ? t('nav.admin') : t('nav.dashboard')}
                </NavLink>
              </li>
            )}
          </ul>
          <div className={s.tools}>
            <LangSwitch />
            {user ? (
              <div className={s.who}>
                <span className={s.name}>
                  {user.name}
                  <span className={s.role}>{t(`role.${user.role}`)}</span>
                </span>
                <button type="button" className={s.signout} onClick={signOut}>
                  {t('nav.signOut')}
                </button>
              </div>
            ) : (
              <div className={s.who}>
                <NavLink to="/login" className={s.signin}>
                  {t('nav.signIn')}
                </NavLink>
                <NavLink to="/register" className={s.join}>
                  {t('nav.join')}
                </NavLink>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
