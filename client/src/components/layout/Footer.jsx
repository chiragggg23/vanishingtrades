import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Press } from '../art/Illustrations.jsx';
import Divider from '../ui/Divider.jsx';
import s from './Footer.module.css';

const THEME_KEY = 'vt-theme';

function useLamp() {
  const [lamp, setLamp] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'lamp';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (lamp) root.setAttribute('data-theme', 'lamp');
    else root.removeAttribute('data-theme');
    try {
      localStorage.setItem(THEME_KEY, lamp ? 'lamp' : 'paper');
    } catch {
      /* ignore */
    }
  }, [lamp]);
  return [lamp, setLamp];
}

export default function Footer() {
  const { t } = useTranslation();
  const [lamp, setLamp] = useLamp();
  return (
    <footer className={s.footer}>
      <div className="page">
        <Divider variant="wave" />
        <div className={s.grid}>
          <Link to="/impact" className={`${s.colophon} press-host`}>
            <Press className={s.press} />
            <span>
              <span className={s.printed}>{t('footer.colophon')}</span>
              <span className={s.sub}>{t('footer.colophonSub')}</span>
            </span>
          </Link>
          <div className={s.goals}>
            <p className={s.head}>{t('footer.goalsHead')}</p>
            <ul>
              <li>{t('footer.goal8')}</li>
              <li>{t('footer.goal11')}</li>
              <li>{t('footer.goal4')}</li>
            </ul>
          </div>
          <div className={s.small}>
            <p>{t('footer.course')}</p>
            <p>{t('footer.fictional')}</p>
            <button
              type="button"
              className={s.lamp}
              aria-pressed={lamp}
              onClick={() => setLamp((v) => !v)}
            >
              {lamp ? t('footer.lampOff') : t('footer.lampOn')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
