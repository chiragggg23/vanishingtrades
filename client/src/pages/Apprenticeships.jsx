import { useTranslation } from 'react-i18next';
import { CRAFT_KEYS } from '../../../shared/constants.js';
import { apprenticeships } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useUrlFilters } from '../hooks/useUrlFilters.js';
import PageHeader from '../components/PageHeader.jsx';
import SdgStamp from '../components/ui/SdgStamp.jsx';
import { FilterDrawer, SearchBox, SelectFilter } from '../components/Filters.jsx';
import { AsyncView, EmptyScene } from '../components/ui/Scenes.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { ApprenticeshipTicket } from '../components/Tickets.jsx';
import s from './Listing.module.css';

const KEYS = ['q', 'craftType', 'status', 'sort', 'page'];

export default function Apprenticeships() {
  const { t } = useTranslation();
  usePageTitle(t('appr.title'));
  const { values: f, update, clear } = useUrlFilters(KEYS);
  const state = useAsync(
    () => apprenticeships.list({ ...f }),
    [f.q, f.craftType, f.status, f.sort, f.page],
  );
  const active = ['q', 'craftType', 'status'].filter((k) => f[k]).length;
  return (
    <div className="page">
      <PageHeader
        title={t('appr.title')}
        lede={t('appr.lede')}
        note={t('appr.note')}
        art={<SdgStamp goal={4} size={170} rotate={-5} />}
      />
      <div className={s.layout}>
        <FilterDrawer title={t('filters.title')} activeCount={active} onClear={clear}>
          <SearchBox
            value={f.q}
            onSearch={(q) => update({ q })}
            label={t('appr.searchLabel')}
            placeholder={t('appr.searchPlaceholder')}
          />
          <SelectFilter
            label={t('filters.craft')}
            value={f.craftType}
            allLabel={t('filters.allCrafts')}
            onChange={(v) => update({ craftType: v })}
            options={CRAFT_KEYS.map((k) => ({ value: k, label: t(`craft.${k}`) }))}
          />
          <SelectFilter
            label={t('appr.statusLabel')}
            value={f.status || 'open'}
            onChange={(v) => update({ status: v === 'open' ? '' : v })}
            options={['open', 'closed', 'all'].map((v) => ({
              value: v,
              label: t(`appr.show.${v}`),
            }))}
          />
        </FilterDrawer>
        <section aria-labelledby="appr-results">
          <h2 id="appr-results" className="visually-hidden">
            {t('appr.results')}
          </h2>
          <div className={s.resultsHead}>
            <p className={s.count} aria-live="polite">
              {state.data ? t('appr.count', { count: state.data.pagination.total }) : ''}
            </p>
            <div style={{ minWidth: '14rem' }}>
              <SelectFilter
                label={t('filters.sort')}
                value={f.sort || 'deadline'}
                onChange={(v) => update({ sort: v === 'deadline' ? '' : v })}
                options={['deadline', 'newest'].map((v) => ({
                  value: v,
                  label: t(`appr.sort.${v}`),
                }))}
              />
            </div>
          </div>
          <AsyncView state={state} empty={<EmptyScene art="spinning" title={t('empty.appr')} />}>
            {(page) => (
              <>
                <ul className={s.grid}>
                  {page.items.map((p) => (
                    <li key={p.id}>
                      <ApprenticeshipTicket item={p} />
                    </li>
                  ))}
                </ul>
                <Pagination pagination={page.pagination} onPage={(p) => update({ page: p })} />
              </>
            )}
          </AsyncView>
        </section>
      </div>
    </div>
  );
}
