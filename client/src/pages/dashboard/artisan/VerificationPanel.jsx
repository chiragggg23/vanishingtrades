import { useTranslation } from 'react-i18next';
import { artisans } from '../../../api/index.js';
import { useForm } from '../../../hooks/useForm.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { schemas } from '../../../../../shared/validation.js';
import { VERIFY_ID_TYPES } from '../../../../../shared/constants.js';
import { formatDate } from '../../../lib/format.js';
import { Panel } from '../../../components/dash/DashShell.jsx';
import { FormErrors, FormField } from '../../../components/ui/Form.jsx';
import StampButton from '../../../components/ui/StampButton.jsx';
import { VerifiedBadge, VerifyStatusBadge } from '../../../components/ui/Badges.jsx';
import s from '../../../components/dash/Dash.module.css';

function RequestForm({ again, onSent }) {
  const { t } = useTranslation();
  const toast = useToast();
  const form = useForm(
    { idType: 'pehchan', idNumber: '', note: '' },
    { schema: schemas.verificationRequest },
  );
  const v = form.values;
  const onSubmit = async (e) => {
    e.preventDefault();
    const body = { idType: v.idType, idNumber: v.idNumber, note: v.note.trim() || null };
    const r = await form.submit((b) => artisans.requestVerification(b), body);
    if (r.ok) {
      toast.success(t('trust.sent'));
      onSent(r.result);
    }
  };
  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrors message={form.message} />
      <div className={s.formGrid}>
        <FormField label={t('trust.idType')} error={form.errors.idType} required>
          <select {...form.bind('idType')}>
            {VERIFY_ID_TYPES.map((k) => (
              <option key={k} value={k}>
                {t(`trust.idTypes.${k}`)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label={t('trust.idNumber')}
          hint={t('trust.private')}
          error={form.errors.idNumber}
          count={v.idNumber.length}
          max={40}
          required
        >
          <input type="text" autoComplete="off" {...form.bind('idNumber')} />
        </FormField>
        <FormField
          label={t('trust.note')}
          error={form.errors.note}
          count={v.note.length}
          max={500}
          className={s.full}
        >
          <textarea rows={3} {...form.bind('note')} />
        </FormField>
      </div>
      <StampButton type="submit" busy={form.submitting}>
        {again ? t('trust.sendAgain') : t('trust.send')}
      </StampButton>
    </form>
  );
}

/** The artisan's side of verification: ask, wait, see the result. */
export default function VerificationPanel({ profile, onChange }) {
  const { t, i18n } = useTranslation();
  const v = profile.verification;
  const date = (d) => formatDate(d, i18n.language);
  return (
    <Panel
      title={t('trust.title')}
      id="trust-title"
      actions={
        v.status === 'verified' ? <VerifiedBadge /> : <VerifyStatusBadge status={v.status} />
      }
    >
      {v.status === 'verified' && <p>{t('trust.verifiedBody', { date: date(v.decidedAt) })}</p>}
      {v.status === 'pending' && (
        <>
          <p className={s.rowTitle}>{t('trust.pendingTitle')}</p>
          <p>
            {t('trust.pendingBody', {
              date: date(v.submittedAt),
              type: t(`trust.idTypes.${v.idType}`),
            })}
          </p>
        </>
      )}
      {v.status === 'rejected' && (
        <>
          <p className={s.rowTitle}>{t('trust.rejectedTitle')}</p>
          <p>{t('trust.rejectedBody', { reason: v.reason })}</p>
        </>
      )}
      {(v.status === 'none' || v.status === 'rejected') && (
        <>
          <p className="muted">{t('trust.lede')}</p>
          <RequestForm again={v.status === 'rejected'} onSent={onChange} />
        </>
      )}
    </Panel>
  );
}
