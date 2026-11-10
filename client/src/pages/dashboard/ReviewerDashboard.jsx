import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { review } from '../../api/index.js';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { formatDate, formatDuration } from '../../lib/format.js';
import DashShell, { Panel } from '../../components/dash/DashShell.jsx';
import SdgStamp from '../../components/ui/SdgStamp.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { AsyncView, EmptyScene } from '../../components/ui/Scenes.jsx';
import s from '../../components/dash/Dash.module.css';

export default function ReviewerDashboard() {
  const { t, i18n } = useTranslation();
  usePageTitle(t('dash.reviewerTitle'));
  const [page, setPage] = useState(1);
  const state = useAsync(() => review.queue({ page }), [page]);
  return (
    <DashShell
      title={t('dash.reviewerTitle')}
      lede={t('dash.reviewerLede')}
      aside={<SdgStamp goal={11} size={78} rotate={5} caption={false} />}
    >
      <Panel title={t('reviewer.queue')} id="queue-title">
        <AsyncView
          state={state}
          empty={<EmptyScene art="loom" title={t('reviewer.empty')} />}
        >
          {(data) => (
            <>
              <ul className={s.list}>
                {data.items.map((st) => (
                  <li key={st.id} className={s.row}>
                    <div className={s.rowMain}>
                      <p className={s.rowTitle} lang={st.language}>
                        <Link to={`/dashboard/reviewer/${st.id}`}>{st.title}</Link>
                      </p>
                      <p className={s.rowMeta}>
                        {t('reviewer.meta', {
                          name: st.artisan?.name,
                          lang: t(`lang.name.${st.language}`),
                          date: formatDate(st.submittedAt, i18n.language),
                        })}
                        {st.durationSec ? ` — ${formatDuration(st.durationSec)}` : ''}
                      </p>
                    </div>
                    <Link to={`/dashboard/reviewer/${st.id}`} className={s.linkBtn} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {t('reviewer.open')}
                      <span className="visually-hidden"> {st.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination pagination={data.pagination} onPage={setPage} />
            </>
          )}
        </AsyncView>
      </Panel>
    </DashShell>
  );
}
