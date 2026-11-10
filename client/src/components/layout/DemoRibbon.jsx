import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { demo } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import s from './DemoRibbon.module.css';

/** Slim strip shown in demo mode (mock, or a server with DEMO_MODE=true). */
export default function DemoRibbon() {
  const { t } = useTranslation();
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let alive = true;
    const tryLoad = (attempt = 0) =>
      demo
        .status()
        .then((d) => alive && setEnabled(Boolean(d.enabled)))
        .catch(() => alive && attempt < 2 && setTimeout(() => tryLoad(attempt + 1), 800));
    tryLoad();
    return () => {
      alive = false;
    };
  }, []);

  if (!enabled) return null;
  const reset = async () => {
    setBusy(true);
    try {
      await demo.reset();
      toast.success(t('demo.resetDone'));
      setTimeout(() => window.location.assign('/'), 600);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };
  return (
    <div className={s.ribbon}>
      <div className={`page ${s.inner}`}>
        <p className={s.text}>
          <strong className={s.tag}>{t('demo.tag')}</strong> {t('demo.text')}
        </p>
        {confirming ? (
          <span className={s.actions}>
            <span>{t('demo.confirm')}</span>
            <button type="button" className={s.btn} onClick={reset} disabled={busy}>
              {busy ? t('demo.resetting') : t('demo.yesReset')}
            </button>
            <button type="button" className={s.btn} onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </button>
          </span>
        ) : (
          <button type="button" className={s.btn} onClick={() => setConfirming(true)}>
            {t('demo.reset')}
          </button>
        )}
      </div>
    </div>
  );
}
