import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { artisans, enquiries, mediaUrl } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useForm } from '../hooks/useForm.js';
import { useAuth } from '../context/AuthContext.jsx';
import { schemas } from '../../../shared/validation.js';
import { localize } from '../i18n/index.js';
import CraftArt from '../components/art/CraftArt.jsx';
import SdgStamp from '../components/ui/SdgStamp.jsx';
import StampButton from '../components/ui/StampButton.jsx';
import Divider from '../components/ui/Divider.jsx';
import { FormField, FormErrors } from '../components/ui/Form.jsx';
import { AsyncView, EmptyScene } from '../components/ui/Scenes.jsx';
import { ApprenticeshipTicket, CraftTicket, StoryTicket } from '../components/Tickets.jsx';
import ReportButton from '../components/ReportButton.jsx';
import s from './ArtisanProfile.module.css';
import L from './Listing.module.css';

function EnquiryForm({ artisan }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const preselect = artisan.crafts.some((c) => c.id === params.get('craft'))
    ? params.get('craft')
    : '';
  const form = useForm(
    { artisanId: artisan.id, craftId: preselect, subject: '', message: '' },
    { schema: schemas.enquiry },
  );

  if (!user)
    return (
      <p>
        {t('enquiry.signInFirst')}{' '}
        <Link to={`/login?next=${encodeURIComponent(`/artisans/${artisan.id}`)}`}>
          {t('nav.signIn')}
        </Link>
      </p>
    );
  if (user.role !== 'buyer') return <p className="muted">{t('enquiry.buyersOnly')}</p>;
  if (form.done)
    return (
      <div className={s.sent} role="status">
        <p className={s.sentTitle}>{t('enquiry.sentTitle', { name: artisan.name })}</p>
        <p>{t('enquiry.sentBody')}</p>
        <StampButton to="/dashboard/buyer" variant="ghost" size="sm">
          {t('enquiry.seeMine')}
        </StampButton>
      </div>
    );
  const onSubmit = (e) => {
    e.preventDefault();
    form.submit((v) => enquiries.create({ ...v, craftId: v.craftId || null }), {
      ...form.values,
      craftId: form.values.craftId || null,
    });
  };
  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrors message={form.message} />
      <FormField label={t('enquiry.piece')} error={form.errors.craftId}>
        <select {...form.bind('craftId')}>
          <option value="">{t('enquiry.anyPiece')}</option>
          {artisan.crafts.map((c) => (
            <option key={c.id} value={c.id}>
              {localize(c.title, i18n.language)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        label={t('enquiry.subject')}
        error={form.errors.subject}
        count={form.values.subject.length}
        max={120}
        required
      >
        <input type="text" {...form.bind('subject')} />
      </FormField>
      <FormField
        label={t('enquiry.message')}
        hint={t('enquiry.messageHint')}
        error={form.errors.message}
        count={form.values.message.length}
        max={1000}
        required
      >
        <textarea rows={5} {...form.bind('message')} />
      </FormField>
      <StampButton type="submit" busy={form.submitting}>
        {t('enquiry.send')}
      </StampButton>
    </form>
  );
}

export default function ArtisanProfile() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const state = useAsync(() => artisans.getOne(id), [id]);
  usePageTitle(state.data?.name || t('artisan.title'));

  return (
    <div className="page">
      <AsyncView state={state}>
        {(a) => (
          <>
            <header className={s.head}>
              <div className={s.portrait}>
                {a.avatarUrl ? (
                  <img src={mediaUrl(a.avatarUrl)} alt={t('artisan.photoOf', { name: a.name })} />
                ) : (
                  <CraftArt craftType={a.craftType} seed={a.seed} />
                )}
              </div>
              <div className={s.intro}>
                <p className="caption">{t(`craft.${a.craftType}`)}</p>
                <h1 className={`${s.name} ink`}>{a.name}</h1>
                <p className={s.place}>
                  {a.village}, {a.district}
                </p>
                <p className={s.bio}>{localize(a.bio, i18n.language)}</p>
                <dl className={s.facts}>
                  <div>
                    <dt>{t('artisan.practice')}</dt>
                    <dd>{t('artisan.years', { count: a.yearsOfPractice })}</dd>
                  </div>
                  <div>
                    <dt>{t('artisan.speaks')}</dt>
                    <dd>{a.languages.map((l) => t(`lang.name.${l}`)).join(', ') || '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('artisan.archived')}</dt>
                    <dd>{t('artisan.stories', { count: a.storiesCount })}</dd>
                  </div>
                </dl>
              </div>
              <div className={s.stamp}>
                <SdgStamp goal={8} size={104} rotate={8} />
              </div>
            </header>

            <div className={s.columns}>
              <section aria-labelledby="works-title">
                <h2 id="works-title" className="ink">
                  {t('artisan.worksTitle')}
                </h2>
                {a.crafts.length ? (
                  <ul className={L.grid}>
                    {a.crafts.map((c) => (
                      <li key={c.id} id={`craft-${c.id}`}>
                        <CraftTicket craft={c} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyScene art="chisel" title={t('empty.works')} />
                )}
              </section>
              <section className={s.enquiry} aria-labelledby="enquiry-title">
                <h2 id="enquiry-title">{t('enquiry.title', { name: a.name })}</h2>
                <p className="muted">{t('enquiry.lede')}</p>
                <EnquiryForm artisan={a} />
              </section>
            </div>

            <Divider />
            <section aria-labelledby="voice-title">
              <h2 id="voice-title" className="ink">
                {t('artisan.voiceTitle', { name: a.name })}
              </h2>
              {a.stories.length ? (
                <ul className={L.stack}>
                  {a.stories.map((st) => (
                    <li key={st.id}>
                      <StoryTicket story={st} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyScene art="wheel" title={t('empty.stories')} />
              )}
            </section>

            {a.apprenticeships.length > 0 && (
              <section aria-labelledby="teach-title" className={s.teach}>
                <h2 id="teach-title" className="ink">
                  {t('artisan.teachTitle')}
                </h2>
                <ul className={L.grid}>
                  {a.apprenticeships.map((p) => (
                    <li key={p.id}>
                      <ApprenticeshipTicket item={p} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <ReportButton targetType="artisan" targetId={a.id} />
          </>
        )}
      </AsyncView>
    </div>
  );
}
