import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, loadLanguage } from '../../i18n/index.js';
import s from './LangSwitch.module.css';

/** Stamp-style segmented control. Each option is a toggle button with aria-pressed. */
export default function LangSwitch({ className = '' }) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(null);
  const current = i18n.resolvedLanguage || i18n.language;
  const choose = async (code) => {
    if (code === current) return;
    setBusy(code);
    try {
      await loadLanguage(code);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className={`${s.group} ${className}`} role="group" aria-label={t('lang.label')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          className={s.opt}
          aria-pressed={current === l.code}
          aria-busy={busy === l.code || undefined}
          onClick={() => choose(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
