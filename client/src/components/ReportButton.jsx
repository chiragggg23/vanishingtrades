import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { admin } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useForm } from '../hooks/useForm.js';
import { schemas } from '../../../shared/validation.js';
import { FormField, FormErrors } from './ui/Form.jsx';
import StampButton from './ui/StampButton.jsx';
import s from './ReportButton.module.css';

/** "Report this" for signed-in users: a small disclosure with a reason. */
export default function ReportButton({ targetType, targetId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const form = useForm({ targetType, targetId, reason: '' }, { schema: schemas.flag });
  if (!user) return null;
  const onSubmit = async (e) => {
    e.preventDefault();
    const r = await form.submit((v) => admin.report(v));
    if (r.ok) {
      toast.success(t('report.sent'));
      setOpen(false);
      form.set('reason', '');
    }
  };
  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={s.toggle}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {t('report.toggle')}
      </button>
      {open && (
        <form onSubmit={onSubmit} className={s.form} noValidate>
          <FormErrors message={form.message} />
          <FormField
            label={t('report.reason')}
            hint={t('report.hint')}
            error={form.errors.reason}
            count={form.values.reason.length}
            max={500}
            required
          >
            <textarea rows={3} {...form.bind('reason')} />
          </FormField>
          <StampButton type="submit" variant="madder" size="sm" busy={form.submitting}>
            {t('report.send')}
          </StampButton>
        </form>
      )}
    </div>
  );
}
