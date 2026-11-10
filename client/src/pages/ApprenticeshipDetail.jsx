import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { applications, apprenticeships } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useForm } from '../hooks/useForm.js';
import { useAuth } from '../context/AuthContext.jsx';
import { schemas } from '../../../shared/validation.js';
import { ROADMAP_STEPS } from '../../../shared/constants.js';
import SdgStamp from '../components/ui/SdgStamp.jsx';
import StampButton from '../components/ui/StampButton.jsx';
import { StatusBadge } from '../components/ui/Badges.jsx';
import { FormErrors, FormField } from '../components/ui/Form.jsx';
import { AsyncView } from '../components/ui/Scenes.jsx';
import { SpinningWheel } from '../components/art/Illustrations.jsx';
import { formatDate, formatNumber } from '../lib/format.js';
import s from './ApprenticeshipDetail.module.css';

function ApplyForm({ item }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const form = useForm(
    { apprenticeshipId: item.id, motivation: '' },
    { schema: schemas.application },
  );
  const closed = item.status !== 'open' || new Date(item.deadline) <= new Date();
  if (closed) return <p className={s.closed}>{t('appr.closedNote')}</p>;
  if (!user)
    return (
      <p>
        {t('appr.signInToApply')}{' '}
        <Link to={`/login?next=${encodeURIComponent(`/apprenticeships/${item.id}`)}`}>
          {t('nav.signIn')}
        </Link>
      </p>
    );
  if (user.role !== 'learner') return <p className="muted">{t('appr.learnersOnly')}</p>;
  if (form.done)
    return (
      <div role="status" className={s.done}>
        <p className={s.doneTitle}>{t('appr.appliedTitle')}</p>
        <p>{t('appr.appliedBody')}</p>
        <StampButton to="/dashboard/learner" variant="ghost" size="sm">
          {t('appr.seeApplications')}
        </StampButton>
      </div>
    );
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.submit((v) => applications.apply(v.apprenticeshipId, v.motivation));
      }}
    >
      <FormErrors message={form.message} />
      <FormField
        label={t('appr.motivation')}
        hint={t('appr.motivationHint')}
        error={form.errors.motivation}
        count={form.values.motivation.length}
        max={1000}
        required
      >
        <textarea rows={6} {...form.bind('motivation')} />
      </FormField>
      <StampButton type="submit" busy={form.submitting}>
        {t('appr.apply')}
      </StampButton>
    </form>
  );
}

export default function ApprenticeshipDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const state = useAsync(() => apprenticeships.getOne(id), [id]);
  usePageTitle(state.data?.title || t('appr.title'));
  return (
    <div className="page">
      <p className={s.back}>
        <Link to="/apprenticeships">{t('appr.back')}</Link>
      </p>
      <AsyncView state={state}>
        {(item) => (
          <div className={s.layout}>
            <article className={s.notice}>
              <div className={s.stamp}>
                <SdgStamp goal={4} size={104} rotate={9} />
              </div>
              <p className="caption">{t(`craft.${item.craftType}`)}</p>
              <h1 className={`${s.title} ink`}>{item.title}</h1>
              <p className={s.with}>
                {t('appr.withLabel')}{' '}
                <Link to={`/artisans/${item.artisanId}`}>{item.artisan?.name}</Link>,{' '}
                {item.location}
              </p>
              <StatusBadge status={item.status} />
              <p className={s.desc}>{item.description}</p>
              <dl className={s.facts}>
                <div>
                  <dt>{t('appr.duration')}</dt>
                  <dd>{t('appr.weeks', { count: item.durationWeeks })}</dd>
                </div>
                <div>
                  <dt>{t('appr.seats')}</dt>
                  <dd>{item.seats}</dd>
                </div>
                <div>
                  <dt>{t('appr.stipend')}</dt>
                  <dd>
                    {item.stipend != null
                      ? t('appr.perMonth', { amount: formatNumber(item.stipend, i18n.language) })
                      : t('appr.noStipend')}
                  </dd>
                </div>
                <div>
                  <dt>{t('appr.deadline')}</dt>
                  <dd>{formatDate(item.deadline, i18n.language)}</dd>
                </div>
              </dl>
              <h2 className={s.h2}>{t('appr.roadmapTitle')}</h2>
              <ol className={s.roadmap}>
                {ROADMAP_STEPS.map((st) => (
                  <li key={st.id}>{t(`roadmap.${st.key}`)}</li>
                ))}
              </ol>
            </article>
            <section className={s.apply} aria-labelledby="apply-title">
              <h2 id="apply-title">{t('appr.applyTitle')}</h2>
              <ApplyForm item={item} />
              <div className={s.art} aria-hidden="true">
                <SpinningWheel still />
              </div>
            </section>
          </div>
        )}
      </AsyncView>
    </div>
  );
}
