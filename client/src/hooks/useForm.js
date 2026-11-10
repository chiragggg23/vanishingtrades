import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validate } from '../../../shared/validation.js';

/** Localised versions of the shared validator messages. */
export function useValidationMessages() {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      required: () => t('v.required'),
      min: (n) => t('v.min', { count: n }),
      max: (n) => t('v.max', { count: n }),
      type: () => t('v.type'),
      oneOf: () => t('v.oneOf'),
      int: (a, b) => t('v.int', { a, b }),
      num: (a, b) => t('v.num', { a, b }),
      email: () => t('v.email'),
      date: () => t('v.date'),
      future: () => t('v.future'),
      items: (n) => t('v.items', { count: n }),
      priceOrder: () => t('v.priceOrder'),
    }),
    [t],
  );
}

/**
 * Small form state helper.
 * - schema (optional): shared schema checked before submit, in the user's language
 * - submit(fn): runs fn(values); maps API 422 field errors back onto fields
 */
export function useForm(initial, { schema, partial = false } = {}) {
  const { t } = useTranslation();
  const messages = useValidationMessages();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
    setDone(false);
  }, []);

  const bind = useCallback(
    (name) => ({
      name,
      value: values[name] ?? '',
      onChange: (e) => set(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value),
    }),
    [values, set],
  );

  const submit = useCallback(
    async (fn, prepared) => {
      const data = prepared ?? values;
      setMessage('');
      setDone(false);
      if (schema) {
        const r = validate(schema, data, { partial, messages });
        if (!r.ok) {
          setErrors(r.errors);
          setMessage(t('form.fixFields'));
          return { ok: false };
        }
      }
      setSubmitting(true);
      try {
        const result = await fn(data);
        setErrors({});
        setDone(true);
        return { ok: true, result };
      } catch (err) {
        if (err?.errors) setErrors(err.errors);
        setMessage(err?.status === 422 ? t('form.fixFields') : err?.message || t('state.errorBody'));
        return { ok: false, error: err };
      } finally {
        setSubmitting(false);
      }
    },
    [values, schema, partial, messages, t],
  );

  return { values, setValues, set, bind, errors, setErrors, message, setMessage, submitting, done, submit };
}
