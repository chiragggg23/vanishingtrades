import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LazyMotion, m } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import DemoRibbon from './DemoRibbon.jsx';
import { LoadingScene } from '../ui/Scenes.jsx';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { useAuth } from '../../context/AuthContext.jsx';
import s from './Layout.module.css';

// framer-motion features are loaded lazily, after first paint.
const loadFeatures = () => import('../../lib/motionFeatures.js').then((r) => r.default);

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const mainRef = useRef(null);
  const first = useRef(true);
  const reduced = usePrefersReducedMotion();
  const { notice } = useAuth();

  // Move focus to <main> on route change (not on first load), so screen readers start at content.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <LazyMotion features={loadFeatures} strict>
      <a href="#main" className="skip-link">
        {t('nav.skip')}
      </a>
      <DemoRibbon />
      <Header />
      {notice === 'paused' && (
        <p className={s.paused} role="alert">
          {t('auth.pausedNotice')}
        </p>
      )}
      {!reduced && <span key={location.pathname} className={s.wipe} aria-hidden="true" />}
      <main id="main" ref={mainRef} tabIndex={-1} className={s.main}>
        <m.div
          key={location.pathname}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<LoadingScene />}>
            <Outlet />
          </Suspense>
        </m.div>
      </main>
      <Footer />
    </LazyMotion>
  );
}
