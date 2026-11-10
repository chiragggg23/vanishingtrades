import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { stories } from '../../../api/index.js';
import { useAsync } from '../../../hooks/useAsync.js';
import { formatDate } from '../../../lib/format.js';
import { Panel } from '../../../components/dash/DashShell.jsx';
import StampButton from '../../../components/ui/StampButton.jsx';
import { StatusBadge } from '../../../components/ui/Badges.jsx';
import { AsyncView, EmptyScene } from '../../../components/ui/Scenes.jsx';
import s from '../../../components/dash/Dash.module.css';

export default function StoriesTab() {
  const { t, i18n } = useTranslation();
  const state = useAsync(() => stories.mine(), []);
  return (
    <Panel
      title={t('myStories.title')}
      id="stories-title"
      actions={
        <StampButton size="sm" to="/dashboard/artisan/stories/new">
          {t('myStories.new')}
        </StampButton>
      }
    >
      <AsyncView
        state={state}
        empty={
          <EmptyScene art="wheel" title={t('myStories.empty')}>
            <p>{t('myStories.emptyHint')}</p>
          </EmptyScene>
        }
      >
        {(list) => (
          <ul className={s.list}>
            {list.map((st) => (
              <li key={st.id} className={s.row}>
                <div className={s.rowMain}>
                  <p className={s.rowTitle} lang={st.language}>
                    <Link to={`/dashboard/artisan/stories/${st.id}`}>{st.title}</Link>
                  </p>
                  <p className={s.rowMeta}>
                    {t(`lang.name.${st.language}`)} — {t('myStories.updated', { date: formatDate(st.updatedAt, i18n.language) })}
                  </p>
                  {st.status === 'rejected' && st.reviewNote && (
                    <p className={s.note}>
                      <strong>{t('myStories.reviewerSaid')}</strong> {st.reviewNote}
                    </p>
                  )}
                </div>
                <StatusBadge status={st.status} />
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
    </Panel>
  );
}
