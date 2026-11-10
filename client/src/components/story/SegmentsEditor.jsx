import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '../../lib/format.js';
import s from './SegmentsEditor.module.css';

/** Edit a list of transcript/translation segments. Keeps start/end times as they are. */
export default function SegmentsEditor({ legend, segments, onChange, lang, errors = {}, prefix }) {
  const { t } = useTranslation();
  const id = useId();
  const setText = (i, text) => onChange(segments.map((x, j) => (j === i ? { ...x, text } : x)));
  const remove = (i) => onChange(segments.filter((_, j) => j !== i));
  const add = () => onChange([...segments, { start: null, end: null, text: '' }]);
  return (
    <fieldset className={s.set}>
      <legend className={s.legend}>{legend}</legend>
      {segments.length === 0 && <p className="muted">{t('editor.noSegments')}</p>}
      <ol className={s.list}>
        {segments.map((seg, i) => {
          const err = errors[`${prefix}.${i}.text`];
          return (
            <li key={`${id}-${i}`} className={s.item}>
              <label htmlFor={`${id}-${i}`} className={s.label}>
                {t('editor.segment', { n: i + 1 })}
                {typeof seg.start === 'number' && (
                  <span className={s.time}> {formatDuration(seg.start)}–{formatDuration(seg.end)}</span>
                )}
              </label>
              <textarea
                id={`${id}-${i}`}
                className="field-input"
                rows={2}
                lang={lang}
                value={seg.text}
                aria-invalid={err ? 'true' : undefined}
                aria-describedby={err ? `${id}-${i}-err` : undefined}
                onChange={(e) => setText(i, e.target.value)}
              />
              <div className={s.below}>
                <p id={`${id}-${i}-err`} className={s.err} aria-live="polite">
                  {err || ''}
                </p>
                <button type="button" className={s.remove} onClick={() => remove(i)}>
                  {t('editor.removeSegment', { n: i + 1 })}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" className={s.add} onClick={add}>
        {t('editor.addSegment')}
      </button>
    </fieldset>
  );
}
