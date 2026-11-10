import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { applications, apprenticeships } from '../../../api/index.js';
import { useAsync } from '../../../hooks/useAsync.js';
import { useForm } from '../../../hooks/useForm.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { schemas } from '../../../../../shared/validation.js';
import { CRAFT_KEYS } from '../../../../../shared/constants.js';
import { formatDate } from '../../../lib/format.js';
import { Panel } from '../../../components/dash/DashShell.jsx';
import { FormErrors, FormField } from '../../../components/ui/Form.jsx';
import StampButton from '../../../components/ui/StampButton.jsx';
import { StatusBadge } from '../../../components/ui/Badges.jsx';
import { AsyncView, EmptyScene } from '../../../components/ui/Scenes.jsx';
import s from '../../../components/dash/Dash.module.css';

const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function OpeningForm({ craftType, onSaved, onCancel }) {
  const { t } = useTranslation();
  const toast = useToast();
  const form = useForm(
    {
      title: '',
      craftType,
      description: '',
      seats: '1',
      durationWeeks: '12',
      stipend: '',
      location: '',
      deadline: inDays(30),
    },
    { schema: schemas.apprenticeship },
  );
  const v = form.values;
  const e = form.errors;
  const onSubmit = async (ev) => {
    ev.preventDefault();
    const body = {
      ...v,
      seats: v.seats === '' ? undefined : Number(v.seats),
      durationWeeks: v.durationWeeks === '' ? undefined : Number(v.durationWeeks),
      stipend: v.stipend === '' ? null : Number(v.stipend),
      deadline: v.deadline ? new Date(`${v.deadline}T23:59:00`).toISOString() : undefined,
    };
    const r = await form.submit((b) => apprenticeships.create(b), body);
    if (r.ok) {
      toast.success(t('openings.posted'));
      onSaved(r.result);
    }
  };
  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrors message={form.message} />
      <div className={s.formGrid}>
        <FormField
          label={t('openings.titleField')}
          error={e.title}
          count={v.title.length}
          max={120}
          required
          className={s.full}
        >
          <input type="text" {...form.bind('title')} />
        </FormField>
        <FormField label={t('openings.craft')} error={e.craftType}>
          <select {...form.bind('craftType')}>
            {CRAFT_KEYS.map((k) => (
              <option key={k} value={k}>
                {t(`craft.${k}`)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label={t('openings.location')}
          error={e.location}
          count={v.location.length}
          max={120}
          required
        >
          <input type="text" {...form.bind('location')} />
        </FormField>
        <FormField
          label={t('openings.description')}
          error={e.description}
          count={v.description.length}
          max={2000}
          required
          className={s.full}
        >
          <textarea rows={4} {...form.bind('description')} />
        </FormField>
        <FormField label={t('openings.seats')} error={e.seats} required>
          <input type="number" min={1} max={20} {...form.bind('seats')} />
        </FormField>
        <FormField label={t('openings.weeks')} error={e.durationWeeks} required>
          <input type="number" min={1} max={104} {...form.bind('durationWeeks')} />
        </FormField>
        <FormField label={t('openings.stipend')} hint={t('openings.stipendHint')} error={e.stipend}>
          <input type="number" min={0} {...form.bind('stipend')} />
        </FormField>
        <FormField label={t('openings.deadline')} error={e.deadline} required>
          <input type="date" min={inDays(1)} {...form.bind('deadline')} />
        </FormField>
      </div>
      <div className={s.actions}>
        <StampButton type="submit" busy={form.submitting}>
          {t('openings.post')}
        </StampButton>
        <StampButton variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </StampButton>
      </div>
    </form>
  );
}

function Applicants({ opening }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const state = useAsync(() => apprenticeships.applications(opening.id), [opening.id]);
  const [busy, setBusy] = useState(null);
  const replace = (a) => state.setData((list) => list.map((x) => (x.id === a.id ? a : x)));
  const act = async (a, fn, done) => {
    setBusy(a.id);
    try {
      const result = await fn();
      replace(result.application || result);
      toast.success(done(result));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <AsyncView state={state} empty={<p className="muted">{t('openings.noApplicants')}</p>}>
      {(list) => (
        <ul className={s.list}>
          {list.map((a) => (
            <li key={a.id} className={s.row}>
              <div className={s.rowMain}>
                <p className={s.rowTitle}>{a.learner.name}</p>
                <p className={s.rowMeta}>
                  {t('openings.appliedOn', { date: formatDate(a.createdAt, i18n.language) })}
                </p>
                <p>{a.motivation}</p>
                {a.status === 'completed' && a.certificateCode && (
                  <p>
                    <Link to={`/verify/${a.certificateCode}`}>
                      {t('openings.viewCert', { code: a.certificateCode })}
                    </Link>
                  </p>
                )}
              </div>
              <StatusBadge status={a.status} />
              <div className={s.actions}>
                {a.status === 'applied' && (
                  <StampButton
                    size="sm"
                    variant="ghost"
                    busy={busy === a.id}
                    onClick={() =>
                      act(
                        a,
                        () => applications.setStatus(a.id, 'shortlisted'),
                        () => t('openings.shortlisted', { name: a.learner.name }),
                      )
                    }
                  >
                    {t('openings.shortlist')}
                  </StampButton>
                )}
                {['applied', 'shortlisted'].includes(a.status) && (
                  <>
                    <StampButton
                      size="sm"
                      variant="leaf"
                      busy={busy === a.id}
                      onClick={() =>
                        act(
                          a,
                          () => applications.setStatus(a.id, 'accepted'),
                          () => t('openings.accepted', { name: a.learner.name }),
                        )
                      }
                    >
                      {t('openings.accept')}
                    </StampButton>
                    <StampButton
                      size="sm"
                      variant="ghost"
                      busy={busy === a.id}
                      onClick={() =>
                        act(
                          a,
                          () => applications.setStatus(a.id, 'rejected'),
                          () => t('openings.rejected', { name: a.learner.name }),
                        )
                      }
                    >
                      {t('openings.reject')}
                    </StampButton>
                  </>
                )}
                {a.status === 'accepted' && (
                  <StampButton
                    size="sm"
                    busy={busy === a.id}
                    onClick={() =>
                      act(
                        a,
                        () => applications.complete(a.id),
                        (r) => t('openings.completed', { code: r.certificate.code }),
                      )
                    }
                  >
                    {t('openings.markComplete')}
                  </StampButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AsyncView>
  );
}

export default function OpeningsTab({ craftType }) {
  const { t, i18n } = useTranslation();
  const state = useAsync(() => apprenticeships.mine(), []);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  return (
    <Panel
      title={t('openings.title')}
      id="openings-title"
      actions={
        !creating && (
          <StampButton size="sm" onClick={() => setCreating(true)}>
            {t('openings.new')}
          </StampButton>
        )
      }
    >
      {creating && (
        <div style={{ marginBottom: 'var(--s6)' }}>
          <OpeningForm
            craftType={craftType || 'pottery'}
            onSaved={(p) => {
              state.setData((list) => [p, ...(list || [])]);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}
      <AsyncView state={state} empty={<EmptyScene art="spinning" title={t('openings.empty')} />}>
        {(list) => (
          <ul className={s.list}>
            {list.map((p) => (
              <li key={p.id} className={s.row} style={{ display: 'block' }}>
                <div className={s.row} style={{ border: 0 }}>
                  <div className={s.rowMain}>
                    <p className={s.rowTitle}>
                      <Link to={`/apprenticeships/${p.id}`}>{p.title}</Link>
                    </p>
                    <p className={s.rowMeta}>
                      {t('openings.meta', {
                        count: p.applicationsCount,
                        date: formatDate(p.deadline, i18n.language),
                      })}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                  <button
                    type="button"
                    className={s.linkBtn}
                    aria-expanded={openId === p.id}
                    onClick={() => setOpenId(openId === p.id ? null : p.id)}
                  >
                    {openId === p.id ? t('openings.hideApplicants') : t('openings.showApplicants')}
                  </button>
                </div>
                {openId === p.id && <Applicants opening={p} />}
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
    </Panel>
  );
}
