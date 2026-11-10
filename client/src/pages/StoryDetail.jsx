import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { archive } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import StoryPlayer from '../components/story/StoryPlayer.jsx';
import SdgStamp from '../components/ui/SdgStamp.jsx';
import { SampleStamp } from '../components/ui/Badges.jsx';
import { AsyncView } from '../components/ui/Scenes.jsx';
import ReportButton from '../components/ReportButton.jsx';
import { formatDate } from '../lib/format.js';
import s from './StoryDetail.module.css';

export default function StoryDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const state = useAsync(() => archive.getOne(id), [id]);
  usePageTitle(state.data?.title || t('archive.title'));
  const countPlay = () => archive.play(id).catch(() => {});

  return (
    <div className="page">
      <p className={s.back}>
        <Link to="/archive">{t('story.back')}</Link>
      </p>
      <AsyncView state={state}>
        {(story) => (
          <article>
            <header className={s.head}>
              <div>
                <p className="caption">
                  {t(`craft.${story.craftType}`)}, {t(`lang.name.${story.language}`)}
                </p>
                <h1 className={`${s.title} ink`} lang={story.language}>
                  {story.title}
                </h1>
                <p className={s.by}>
                  {t('story.toldBy')}{' '}
                  <Link to={`/artisans/${story.artisanId}`}>{story.artisan?.name}</Link>
                  {story.artisan?.village ? `, ${story.artisan.village}` : ''}
                </p>
                <p className="muted">
                  {t('story.archivedOn', { date: formatDate(story.approvedAt, i18n.language) })}{' '}
                  {t('archive.plays', { count: story.plays })}
                </p>
              </div>
              <SdgStamp goal={11} size={110} rotate={-7} />
            </header>
            {story.summary?.en && (
              <aside className={s.summary} aria-label={t('story.summary')}>
                <p className={s.summaryLabel}>
                  {t('story.summary')} {story.ai?.isSample && <SampleStamp />}
                </p>
                <p lang="en">{story.summary.en}</p>
              </aside>
            )}
            <StoryPlayer story={story} onFirstPlay={countPlay} />
            {story.tags.length > 0 && (
              <ul className={s.tags} aria-label={t('story.tags')}>
                {story.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            )}
            <ReportButton targetType="story" targetId={story.id} />
          </article>
        )}
      </AsyncView>
    </div>
  );
}
