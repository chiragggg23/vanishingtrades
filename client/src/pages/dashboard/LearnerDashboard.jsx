import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { applications, mediaUrl } from '../../api/index.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useForm } from '../../hooks/useForm.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import { schemas } from '../../../../shared/validation.js';
import { formatDate } from '../../lib/format.js';
import DashShell, { Panel } from '../../components/dash/DashShell.jsx';
import ImageUpload from '../../components/dash/ImageUpload.jsx';
import { FormErrors, FormField } from '../../components/ui/Form.jsx';
import StampButton from '../../components/ui/StampButton.jsx';
import SdgStamp from '../../components/ui/SdgStamp.jsx';
import { StatusBadge } from '../../components/ui/Badges.jsx';
import { AsyncView, EmptyScene } from '../../components/ui/Scenes.jsx';
import s from '../../components/dash/Dash.module.css';
import L from './Learner.module.css';

function Roadmap({ app, onChange }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const editable = app.status === 'accepted';
  const toggle = async (step) => {
    setBusy(step.id);
    try {
      onChange(await applications.setStep(app.id, step.id, !step.done));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };
  const done = app.roadmap.filter((x) => x.done).length;
  return (
    <div>
      <h3 className={L.h3}>{t('learner.roadmap', { done, total: app.roadmap.length })}</h3>
      <ol className={L.roadmap}>
        {app.roadmap.map((step) => (
          <li key={step.id} data-done={step.done}>
            <label className={L.step}>
              <input
                type="checkbox"
                checked={step.done}
                disabled={!editable || busy === step.id}
                onChange={() => toggle(step)}
              />
              <span>
                <strong>{t(`roadmap.${step.key}`)}</strong>
                <span className={L.stepHint}>
                  {step.done
                    ? t('learner.doneOn', { date: formatDate(step.doneAt, i18n.language) })
                    : t(`roadmapHint.${step.key}`)}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Progress({ app }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const state = useAsync(() => applications.progress(app.id), [app.id]);
  const form = useForm({ note: '', photoUrl: null }, { schema: schemas.progress });
  const add = async (e) => {
    e.preventDefault();
    const r = await form.submit((v) => applications.addProgress(app.id, v));
    if (r.ok) {
      state.setData((list) => [...(list || []), r.result]);
      form.setValues({ note: '', photoUrl: null });
      toast.success(t('learner.logged'));
    }
  };
  return (
    <div>
      <h3 className={L.h3}>{t('learner.progress')}</h3>
      <AsyncView state={state} empty={<p className="muted">{t('learner.noProgress')}</p>}>
        {(list) => (
          <ol className={L.log}>
            {list.map((p) => (
              <li key={p.id}>
                <p className={L.logDate}>{formatDate(p.createdAt, i18n.language)}</p>
                <p>{p.note}</p>
                {p.photoUrl && (
                  <img
                    src={mediaUrl(p.photoUrl)}
                    alt={t('learner.photoAlt')}
                    className={s.preview}
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </AsyncView>
      {app.status === 'accepted' && (
        <form onSubmit={add} noValidate className={L.logForm}>
          <FormErrors message={form.message} />
          <FormField
            label={t('learner.note')}
            error={form.errors.note}
            count={form.values.note.length}
            max={1000}
            required
          >
            <textarea rows={3} {...form.bind('note')} />
          </FormField>
          <ImageUpload
            label={t('learner.photo')}
            value={form.values.photoUrl}
            onChange={(url) => form.set('photoUrl', url)}
            error={form.errors.photoUrl}
          />
          <StampButton type="submit" size="sm" busy={form.submitting}>
            {t('learner.addEntry')}
          </StampButton>
        </form>
      )}
    </div>
  );
}

export default function LearnerDashboard() {
  const { t, i18n } = useTranslation();
  usePageTitle(t('dash.learnerTitle'));
  const state = useAsync(() => applications.mine(), []);
  const replace = (a) => state.setData((list) => list.map((x) => (x.id === a.id ? a : x)));
  return (
    <DashShell
      title={t('dash.learnerTitle')}
      lede={t('dash.learnerLede')}
      aside={<SdgStamp goal={4} size={78} rotate={-6} caption={false} />}
    >
      <AsyncView
        state={state}
        empty={
          <EmptyScene
            art="spinning"
            title={t('learner.empty')}
            action={<StampButton to="/apprenticeships">{t('learner.browse')}</StampButton>}
          />
        }
      >
        {(list) =>
          list.map((app) => (
            <Panel
              key={app.id}
              id={`app-${app.id}`}
              title={app.apprenticeship?.title}
              actions={<StatusBadge status={app.status} />}
            >
              <p className="muted">
                {t('learner.with', { name: app.apprenticeship?.artisanName })} —{' '}
                {t('learner.appliedOn', { date: formatDate(app.createdAt, i18n.language) })}
              </p>
              {app.status === 'completed' && app.certificateCode && (
                <div className={L.badge}>
                  <SdgStamp goal={4} size={84} rotate={-10} caption={false} />
                  <div>
                    <p className={L.badgeTitle}>{t('learner.completed')}</p>
                    <Link to={`/verify/${app.certificateCode}`}>
                      {t('learner.viewCert', { code: app.certificateCode })}
                    </Link>
                  </div>
                </div>
              )}
              {['applied', 'shortlisted'].includes(app.status) && (
                <p>{t(`learner.status.${app.status}`)}</p>
              )}
              {app.status === 'rejected' && <p>{t('learner.status.rejected')}</p>}
              {['accepted', 'completed'].includes(app.status) && (
                <div className={L.split}>
                  <Roadmap app={app} onChange={replace} />
                  <Progress app={app} />
                </div>
              )}
            </Panel>
          ))
        }
      </AsyncView>
    </DashShell>
  );
}
