import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import s from './Toast.module.css';

const ToastContext = createContext(null);

/** Toasts live in a polite aria-live region; errors use an assertive one. */
export function ToastProvider({ children }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);
  const dismiss = useCallback((id) => setToasts((l) => l.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (message, tone = 'info') => {
      const id = ++seq.current;
      setToasts((l) => [...l.slice(-3), { id, message, tone }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );
  const api = useMemo(
    () => ({
      info: (m) => push(m, 'info'),
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
    }),
    [push],
  );
  const render = (tone) =>
    toasts
      .filter((x) => (tone === 'error' ? x.tone === 'error' : x.tone !== 'error'))
      .map((x) => (
        <div key={x.id} className={`${s.toast} ${s[x.tone]}`}>
          <span>{x.message}</span>
          <button type="button" className={s.close} onClick={() => dismiss(x.id)}>
            <span aria-hidden="true">×</span>
            <span className="visually-hidden">{t('common.dismiss')}</span>
          </button>
        </div>
      ));
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={s.region}>
        <div aria-live="polite" role="status">
          {render('polite')}
        </div>
        <div aria-live="assertive" role="alert">
          {render('error')}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
