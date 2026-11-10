import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { impact } from '../../../api/index.js';
import { useAsync } from '../../../hooks/useAsync.js';
import { formatNumber } from '../../../lib/format.js';
import { Panel } from '../../../components/dash/DashShell.jsx';
import SdgStamp from '../../../components/ui/SdgStamp.jsx';
import { SampleStamp } from '../../../components/ui/Badges.jsx';
import { AsyncView, LoadingScene } from '../../../components/ui/Scenes.jsx';
import A from './Admin.module.css';

const MonthlyChart = lazy(() => import('./ImpactCharts.jsx').then((m) => ({ default: m.MonthlyChart })));
const BreakdownChart = lazy(() => import('./ImpactCharts.jsx').then((m) => ({ default: m.BreakdownChart })));

const GROUPS = [
  { goal: 8, key: 'sdg8', fields: ['artisans', 'works', 'enquiries', 'enquiriesAnswered'], series: ['enquiries', 'works'], breakdown: 'worksByCraft' },
  { goal: 11, key: 'sdg11', fields: ['storiesArchived', 'languages', 'minutesRecorded', 'plays'], series: ['submitted', 'approved'], breakdown: 'storiesByLanguage' },
  { goal: 4, key: 'sdg4', fields: ['openings', 'applications', 'learnersInTraining', 'certificates'], series: ['applications', 'certificates'], breakdown: 'applicationsByStatus' },
];

export default function ImpactTab() {
  const { t, i18n } = useTranslation();
  const state = useAsync(() => impact.dashboard(), []);
  const labelFor = (breakdown) => (key) =>
    breakdown === 'worksByCraft'
      ? t(`craft.${key}`)
      : breakdown === 'storiesByLanguage'
        ? t(`lang.name.${key}`)
        : t(`status.${key}`);
  return (
    <AsyncView state={state} isEmpty={() => false}>
      {(d) => (
        <>
          {d.isSample && (
            <p>
              <SampleStamp /> {t('impact.sampleNote')}
            </p>
          )}
          {GROUPS.map((g) => (
            <Panel key={g.key} id={`dash-${g.key}`}>
              <div className={A.sdgHead}>
                <SdgStamp goal={g.goal} size={64} rotate={-5} caption={false} />
                <h3 id={`dash-${g.key}`}>{t(`sdg.g${g.goal}.name`)}</h3>
              </div>
              <ul className={A.kpis}>
                {g.fields.map((f) => (
                  <li key={f} className={A.kpi}>
                    <span>{t(`impact.f.${f}`)}</span>
                    <strong>{formatNumber(d.totals[g.key][f], i18n.language)}</strong>
                  </li>
                ))}
              </ul>
              <Suspense fallback={<LoadingScene label={t('impact.loadingCharts')} />}>
                <div className={A.charts}>
                  <MonthlyChart title={t(`impact.chart.${g.key}`)} data={d.series[g.key]} keys={g.series} />
                  <BreakdownChart
                    title={t(`impact.breakdown.${g.breakdown}`)}
                    data={d.breakdowns[g.breakdown]}
                    labelFor={labelFor(g.breakdown)}
                  />
                </div>
              </Suspense>
            </Panel>
          ))}
        </>
      )}
    </AsyncView>
  );
}
