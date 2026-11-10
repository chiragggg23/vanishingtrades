// Ticket cards for artisans, crafts, stories and apprenticeships.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TicketCard from './ui/TicketCard.jsx';
import CraftArt from './art/CraftArt.jsx';
import { CraftChip } from './ui/Badges.jsx';
import { mediaUrl } from '../api/index.js';
import { localize } from '../i18n/index.js';
import { formatDate, formatPrice, formatDuration } from '../lib/format.js';
import s from './Tickets.module.css';

export function CraftTicket({ craft }) {
  const { t, i18n } = useTranslation();
  const title = localize(craft.title, i18n.language);
  return (
    <TicketCard seed={craft.id} className={s.card}>
      <div className={s.art}>
        {craft.imageUrl ? (
          <img src={mediaUrl(craft.imageUrl)} alt={title} loading="lazy" className={s.photo} />
        ) : (
          <CraftArt craftType={craft.craftType} seed={craft.seed} />
        )}
      </div>
      <p className="caption">{t(`craft.${craft.craftType}`)}</p>
      <h3 className={s.title}>
        <Link to={`/artisans/${craft.artisanId}?craft=${craft.id}`} className={s.stretch}>
          {title}
        </Link>
      </h3>
      <p className={s.meta}>
        {t('gallery.by', { name: craft.artisan?.name })}
        {craft.artisan?.district ? `, ${craft.artisan.district}` : ''}
      </p>
      <p className={s.price}>{formatPrice(craft.priceMin, craft.priceMax, i18n.language, t)}</p>
    </TicketCard>
  );
}

export function ArtisanTicket({ artisan }) {
  const { t, i18n } = useTranslation();
  return (
    <TicketCard seed={artisan.id} tone="kraft" className={s.card}>
      <div className={s.artisanTop}>
        <div className={s.avatar}>
          {artisan.avatarUrl ? (
            <img src={mediaUrl(artisan.avatarUrl)} alt="" className={s.photo} />
          ) : (
            <CraftArt craftType={artisan.craftType} seed={artisan.seed} />
          )}
        </div>
        <div>
          <p className="caption">{t(`craft.${artisan.craftType}`)}</p>
          <h3 className={s.title}>
            <Link to={`/artisans/${artisan.id}`} className={s.stretch}>
              {artisan.name}
            </Link>
          </h3>
          <p className={s.meta}>
            {artisan.village}, {artisan.district}
          </p>
        </div>
      </div>
      <p className={s.bio}>{localize(artisan.bio, i18n.language)}</p>
      <p className={s.foot}>
        {t('artisan.years', { count: artisan.yearsOfPractice })}
        <span aria-hidden="true"> / </span>
        {t('artisan.works', { count: artisan.worksCount })}
      </p>
    </TicketCard>
  );
}

/** Stories look like cassette labels. */
export function StoryTicket({ story }) {
  const { t, i18n } = useTranslation();
  return (
    <article className={s.cassette}>
      <div className={s.reels} aria-hidden="true">
        <span />
        <span />
      </div>
      <div className={s.label}>
        <p className="caption">
          {t(`craft.${story.craftType}`)} · {t(`lang.name.${story.language}`)}
        </p>
        <h3 className={s.title} lang={story.language}>
          <Link to={`/archive/${story.id}`} className={s.stretch}>
            {story.title}
          </Link>
        </h3>
        <p className={s.meta}>
          {t('archive.toldBy', { name: story.artisan?.name })}
          {story.durationSec ? ` · ${formatDuration(story.durationSec)}` : ''}
        </p>
        {story.summary?.en && <p className={s.summary}>{story.summary.en}</p>}
        <p className={s.foot}>
          {t('archive.plays', { count: story.plays })} ·{' '}
          {formatDate(story.approvedAt, i18n.language)}
        </p>
      </div>
    </article>
  );
}

export function ApprenticeshipTicket({ item }) {
  const { t, i18n } = useTranslation();
  return (
    <TicketCard seed={item.id} className={s.card}>
      <p className="caption">
        <CraftChip type={item.craftType} />
      </p>
      <h3 className={s.title}>
        <Link to={`/apprenticeships/${item.id}`} className={s.stretch}>
          {item.title}
        </Link>
      </h3>
      <p className={s.meta}>
        {t('appr.with', { name: item.artisan?.name })}, {item.location}
      </p>
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
          <dt>{t('appr.deadline')}</dt>
          <dd>{formatDate(item.deadline, i18n.language)}</dd>
        </div>
      </dl>
    </TicketCard>
  );
}
