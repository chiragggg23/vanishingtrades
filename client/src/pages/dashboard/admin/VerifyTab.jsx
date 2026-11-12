import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { admin } from '../../../api/index.js';
import { useAsync } from '../../../hooks/useAsync.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { formatDate } from '../../../lib/format.js';
import { Panel } from '../../../components/dash/DashShell.jsx';
import { SelectFilter } from '../../../components/Filters.jsx';
import Pagination from '../../../components/ui/Pagination.jsx';
import StampButton from '../../../components/ui/StampButton.jsx';
import { VerifyStatusBadge } from '../../../components/ui/Badges.jsx';
import { AsyncView, EmptyScene } from '../../../components/ui/Scenes.jsx';
import s from '../../../components/dash/Dash.module.css';

const REASON_MIN = 5;
const REASON_MAX = 300;

/** Inline "why" box shown before turning a request down or removing a mark. */
function ReasonBox({ busy, onSend, onCancel }) {
  const { t } = useTranslation();
  const id = useId();
  const [reason, setReason] = useState('');
  const ok = reason.trim().length >= REASON_MIN;
  return (
    <form
      className={s.actions}
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSend(reason.trim());
      }}
    >
      <label htmlFor={id} className="visually-hidden">
        {t('trust.reason')}
      </label>
      <input
        id={id}
        type="text"
        className="field-input"
        placeholder={t('trust.reason')}
        value={reason}
        maxLength={REASON_MAX}
        onChange={(e) => setReason(e.target.value)}
        // The box only appears after the admin pressed "Turn down", so moving focus here is expected.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
      <StampButton type="submit" size="sm" variant="danger" busy={busy} disabled={!ok}>
        {t('trust.confirmReject')}
      </StampButton>
      <button type="button" className={s.linkBtn} onClick={onCancel}>
        {t('trust.cancel')}
      </button>
    </form>
  );
}

export default function VerifyTab() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const state = useAsync(() => admin.verifications({ status, page }), [status, page]);
  const [busy, setBusy] = useState(null);
  const [asking, setAsking] = useState(null);
  const date = (d) => formatDate(d, i18n.language);

  const decide = async (item, action, reason) => {
    const id = item.artisan.id;
    setBusy(id + action);
    try {
      await admin.decideVerification(id, reason ? { action, reason } : { action });
      const key =
        action === 'approve'
          ? 'trust.approved'
          : item.status === 'verified'
            ? 'trust.revoked'
            : 'trust.rejected';
      toast.success(t(key, { name: item.artisan.name }));
      setAsking(null);
      state.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel
      title={t('trust.adminTitle')}
      id="verify-title"
      actions={
        <div style={{ minWidth: '12rem' }}>
          <SelectFilter
            label={t('admin.show')}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
              setAsking(null);
            }}
            options={['pending', 'verified', 'rejected', 'all'].map((v) => ({
              value: v,
              label: t(`trust.filter.${v}`),
            }))}
          />
        </div>
      }
    >
      <p className="muted">{t('trust.adminLede')}</p>
      <AsyncView state={state} empty={<EmptyScene art="loom" title={t('trust.empty')} />}>
        {(data) => (
          <>
            <ul className={s.list}>
              {data.items.map((item) => {
                const a = item.artisan;
                return (
                  <li key={a.id} className={s.row}>
                    <div className={s.rowMain}>
                      <p className={s.rowTitle}>
                        <Link to={`/artisans/${a.id}`}>{a.name}</Link>
                      </p>
                      <p className={s.rowMeta}>
                        {t(`craft.${a.craftType}`)}, {a.village}, {a.district} ·{' '}
                        {t('artisan.years', { count: a.yearsOfPractice })}
                      </p>
                      <p>
                        {t('trust.proof', {
                          type: t(`trust.idTypes.${item.idType}`),
                          number: item.idNumber,
                        })}
                      </p>
                      {item.note && <p>{item.note}</p>}
                      {item.reason && <p>{t('trust.rejectedBody', { reason: item.reason })}</p>}
                      <p className={s.rowMeta}>
                        {t('trust.askedOn', { date: date(item.submittedAt) })}
                        {item.decidedBy &&
                          ` · ${t('trust.decidedBy', {
                            name: item.decidedBy.name,
                            date: date(item.decidedAt),
                          })}`}
                      </p>
                    </div>
                    <VerifyStatusBadge status={item.status} />
                    {asking === a.id ? (
                      <ReasonBox
                        busy={busy === a.id + 'reject'}
                        onSend={(reason) => decide(item, 'reject', reason)}
                        onCancel={() => setAsking(null)}
                      />
                    ) : (
                      <div className={s.actions}>
                        {item.status === 'pending' && (
                          <StampButton
                            size="sm"
                            variant="leaf"
                            busy={busy === a.id + 'approve'}
                            onClick={() => decide(item, 'approve')}
                          >
                            {t('trust.approve')}
                            <span className="visually-hidden"> {a.name}</span>
                          </StampButton>
                        )}
                        {(item.status === 'pending' || item.status === 'verified') && (
                          <StampButton size="sm" variant="ghost" onClick={() => setAsking(a.id)}>
                            {item.status === 'verified' ? t('trust.revoke') : t('trust.reject')}
                            <span className="visually-hidden"> {a.name}</span>
                          </StampButton>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pagination pagination={data.pagination} onPage={setPage} />
          </>
        )}
      </AsyncView>
    </Panel>
  );
}
