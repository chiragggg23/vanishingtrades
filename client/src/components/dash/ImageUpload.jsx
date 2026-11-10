import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mediaUrl, uploads } from '../../api/index.js';
import s from './Dash.module.css';

/**
 * Pick an image, show an instant local preview, upload it, and report the stored URL.
 * value: current URL (or null); onChange(url|null)
 */
export default function ImageUpload({ label, value, onChange, error }) {
  const { t } = useTranslation();
  const id = useId();
  const [local, setLocal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  useEffect(() => () => local && URL.revokeObjectURL(local), [local]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProblem(null);
    if (!file.type.startsWith('image/')) {
      setProblem(t('upload.notImage'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProblem(t('upload.tooBig'));
      return;
    }
    setLocal(URL.createObjectURL(file));
    setBusy(true);
    try {
      const { url } = await uploads.image(file);
      onChange(url);
    } catch (err) {
      setProblem(err.message);
      setLocal(null);
    } finally {
      setBusy(false);
    }
  };
  const shown = local || mediaUrl(value);
  return (
    <div style={{ marginBottom: 'var(--s4)' }}>
      <label htmlFor={id} style={{ fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
        {label}
      </label>
      {shown && <img src={shown} alt={t('upload.preview')} className={s.preview} />}
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={pick}
        disabled={busy}
        style={{ minHeight: 44 }}
      />
      <p aria-live="polite" style={{ margin: '0.3rem 0 0', fontSize: 'var(--fs-sm)' }}>
        {busy ? t('upload.uploading') : ''}
        {problem || error ? (
          <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{problem || error}</span>
        ) : null}
      </p>
      {value && !busy && (
        <button
          type="button"
          className={s.linkBtn}
          onClick={() => {
            setLocal(null);
            onChange(null);
          }}
        >
          {t('upload.remove')}
        </button>
      )}
    </div>
  );
}
