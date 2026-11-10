import { cloneElement, isValidElement, useId } from 'react';
import { useTranslation } from 'react-i18next';
import s from './Form.module.css';

/**
 * Label + control + hint + inline error (aria-live) + optional character counter.
 * Pass the control as the only child; it receives id, aria-invalid and aria-describedby.
 */
export function FormField({ label, hint, error, count, max, children, className = '', required }) {
  const { t } = useTranslation();
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const countId = `${id}-count`;
  const describedBy = [hint && hintId, max && countId, error && errId].filter(Boolean).join(' ');
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy || undefined,
        required,
        className: `field-input ${children.props.className || ''}`,
      })
    : children;
  const over = max && count > max;
  return (
    <div className={`${s.field} ${className}`}>
      <label htmlFor={id} className={s.label}>
        {label}
        {required && <span className={s.req}> {t('form.required')}</span>}
      </label>
      {hint && (
        <p id={hintId} className={s.hint}>
          {hint}
        </p>
      )}
      {control}
      <div className={s.below}>
        <p id={errId} className={s.error} aria-live="polite">
          {error || ''}
        </p>
        {max ? (
          <p id={countId} className={`${s.count} ${over ? s.over : ''}`}>
            {t('form.counter', { count: count || 0, max })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Summary of errors for a form, announced assertively. */
export function FormErrors({ message }) {
  return (
    <div role="alert" aria-live="assertive" className={message ? s.summary : undefined}>
      {message || null}
    </div>
  );
}

/** Map an ApiError's field errors onto form state. Returns { fieldErrors, message }. */
export function apiErrors(err, t) {
  if (err?.status === 422 && err.errors)
    return { fieldErrors: err.errors, message: t ? t('form.fixFields') : err.message };
  if (err?.errors && Object.keys(err.errors).length)
    return { fieldErrors: err.errors, message: err.message };
  return { fieldErrors: {}, message: err?.message || 'Something went wrong.' };
}
