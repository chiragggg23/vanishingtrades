import { useTranslation } from 'react-i18next';
import { impact } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import PageHeader from '../components/PageHeader.jsx';
import SdgStamp from '../components/ui/SdgStamp.jsx';
import { SampleStamp } from '../components/ui/Badges.jsx';
import { AsyncView } from '../components/ui/Scenes.jsx';
import { formatNumber } from '../lib/format.js';
import s from './Impact.module.css';

const GROUPS = [
  { goal: 8, key: 'sdg8', fields: ['artisans', 'works', 'enquiries', 'enquiriesAnswered'] },
  { goal: 11, key: 'sdg11', fields: ['storiesArchived', 'languages', 'minutesRecorded', 'plays'] },
  { goal: 4, key: 'sdg4', fields: ['openings', 'applications', 'learnersInTraining', 'certificates'] },
];

export default function Impact() {
  const { t, i18n } = useTranslation();
  usePageTitle(t('impact.title'));
  const state = useAsync(() => impact.summary(), []);
  return (
    <div className="page">
      <PageHeader title={t('impact.title')} lede={t('impact.lede')} note={t('impact.note')} />
      <AsyncView state={state}>
        {(data) => (
          <>
            {data.isSample && (
              <p className={s.sampleNote}>
                <SampleStamp /> {t('impact.sampleNote')}
              </p>
            )}
            <div className={s.groups}>
              {GROUPS.map((g, i) => (
                <section
                  key={g.key}
                  className={`${s.group} ${s[`g${i}`]}`}
                  aria-labelledby={`${g.key}-title`}
                >
                  <div className={s.groupHead}>
                    <SdgStamp goal={g.goal} size={96} rotate={i % 2 ? 6 : -6} caption={false} />
                    <div>
                      <h2 id={`${g.key}-title`} className={s.groupTitle}>
                        {t(`sdg.g${g.goal}.name`)}
                      </h2>
                      <p className={s.why}>{t(`impact.why.${g.key}`)}</p>
                    </div>
                  </div>
                  <dl className={s.numbers}>
                    {g.fields.map((f) => (
                      <div key={f} className={s.num}>
                        <dt>{t(`impact.f.${f}`)}</dt>
                        <dd>{formatNumber(data[g.key][f], i18n.language)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </>
        )}
      </AsyncView>
    </div>
  );
}
