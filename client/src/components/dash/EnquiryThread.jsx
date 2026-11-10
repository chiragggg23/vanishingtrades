import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { enquiries } from '../../api/index.js';
import { useForm } from '../../hooks/useForm.js';
import { useToast } from '../../context/ToastContext.jsx';
import { schemas } from '../../../../shared/validation.js';
import { localize } from '../../i18n/index.js';
import { formatDate } from '../../lib/format.js';
import { StatusBadge } from '../ui/Badges.jsx';
import { FormErrors, FormField } from '../ui/Form.jsx';
import StampButton from '../ui/StampButton.jsx';
import s from './EnquiryThread.module.css';

/** One enquiry as a letter thread with reply and close/reopen. `me` is the signed-in user. */
export default function EnquiryThread({ enquiry, me, onChange }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const form = useForm({ message: '' }, { schema: schemas.reply });
  const counterpart = me.role === 'buyer' ? enquiry.artisan?.name : enquiry.buyer?.name;

  const reply = async (e) => {
    e.preventDefault();
    const r = await form.submit((v) => enquiries.reply(enquiry.id, v.message));
    if (r.ok) {
      form.set('message', '');
      toast.success(t('enquiry.replySent'));
      onChange(r.result);
    }
  };
  const setStatus = async (status) => {
    try {
      onChange(await enquiries.setStatus(enquiry.id, status));
      toast.success(status === 'closed' ? t('enquiry.closedToast') : t('enquiry.reopenedToast'));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <li className={s.item}>
      <div className={s.summary}>
        <div className={s.main}>
          <p className={s.subject}>{enquiry.subject}</p>
          <p className={s.meta}>
            {me.role === 'buyer'
              ? t('enquiry.toName', { name: counterpart })
              : t('enquiry.fromName', { name: counterpart })}
            {enquiry.craft ? ` — ${localize(enquiry.craft.title, i18n.language)}` : ''}
            {' — '}
            {formatDate(enquiry.updatedAt, i18n.language)}
          </p>
        </div>
        <StatusBadge status={enquiry.status} />
        <button
          type="button"
          className={s.toggle}
          aria-expanded={open}
          aria-controls={`thread-${enquiry.id}`}
          onClick={() => setOpen((o) => !o)}
        >
          {open
            ? t('enquiry.hideThread')
            : t('enquiry.showThread', { count: enquiry.replies.length })}
        </button>
      </div>
      {open && (
        <div id={`thread-${enquiry.id}`} className={s.thread}>
          <ol className={s.letters}>
            <li className={s.letter} data-mine={enquiry.buyer?.id === me.id}>
              <p className={s.from}>
                {enquiry.buyer?.name} — {formatDate(enquiry.createdAt, i18n.language)}
              </p>
              <p>{enquiry.message}</p>
            </li>
            {enquiry.replies.map((r) => (
              <li key={r.id} className={s.letter} data-mine={r.author?.id === me.id}>
                <p className={s.from}>
                  {r.author?.name} ({t(`role.${r.authorRole}`)}) —{' '}
                  {formatDate(r.createdAt, i18n.language)}
                </p>
                <p>{r.message}</p>
              </li>
            ))}
          </ol>
          {enquiry.status !== 'closed' && me.role !== 'admin' && (
            <form onSubmit={reply} noValidate className={s.reply}>
              <FormErrors message={form.message} />
              <FormField
                label={t('enquiry.yourReply')}
                error={form.errors.message}
                count={form.values.message.length}
                max={1000}
                required
              >
                <textarea rows={3} {...form.bind('message')} />
              </FormField>
              <StampButton type="submit" size="sm" busy={form.submitting}>
                {t('enquiry.sendReply')}
              </StampButton>
            </form>
          )}
          {me.role !== 'admin' && (
            <div className={s.statusRow}>
              {enquiry.status === 'closed' ? (
                <StampButton variant="ghost" size="sm" onClick={() => setStatus('open')}>
                  {t('enquiry.reopen')}
                </StampButton>
              ) : (
                <StampButton variant="ghost" size="sm" onClick={() => setStatus('closed')}>
                  {t('enquiry.close')}
                </StampButton>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
