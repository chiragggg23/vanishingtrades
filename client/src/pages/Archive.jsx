import { useTranslation } from 'react-i18next';
import { archive } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useUrlFilters } from '../hooks/useUrlFilters.js';
import PageHeader from '../components/PageHeader.jsx';
import SdgStamp from '../components/ui/SdgStamp.jsx';
import { FilterDrawer, SearchBox, SelectFilter } from '../components/Filters.jsx';
import { AsyncView, EmptyScene } from '../components/ui/Scenes.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { StoryTicket } from '../components/Tickets.jsx';
import s from './Listing.module.css';

const KEYS = ['q', 'language', 'craftType', 'sort', 'page'];

export default function Archive() {
  const { t } = useTranslation();
  usePageTitle(t('archive.title'));
  const { values: f, update, clear } = useUrlFilters(KEYS);
  const facets = useAsync(() => archive.facets(), []);
  const state = useAsync(
    () => archive.list({ ...f }),
    [f.q, f.language, f.craftType, f.sort, f.page],
  );
  const active = ['q', 'language', 'craftType'].filter((k) => f[k]).length;
  const fc = facets.data || { languages: [], craftTypes: [] };

  return (
    <div className="page">
      <PageHeader
        title={t('archive.title')}
        lede={t('archive.lede')}
        note={t('archive.note')}
        art={<SdgStamp goal={11} size={170} rotate={6} />}
      />
      <div className={s.layout}>
        <FilterDrawer title={t('filters.title')} activeCount={active} onClear={clear}>
          <SearchBox
            value={f.q}
            onSearch={(q) => update({ q })}
            label={t('archive.searchLabel')}
            placeholder={t('archive.searchPlaceholder')}
          />
          <SelectFilter
            label={t('filters.language')}
            value={f.language}
            allLabel={t('filters.allLanguages')}
            onChange={(v) => update({ language: v })}
            options={fc.languages.map((l) => ({
              value: l.key,
              label: t('filters.withCount', { label: t(`lang.name.${l.key}`), count: l.count }),
            }))}
          />
          <SelectFilter
            label={t('filters.craft')}
            value={f.craftType}
            allLabel={t('filters.allCrafts')}
            onChange={(v) => update({ craftType: v })}
            options={fc.craftTypes.map((c) => ({
              value: c.key,
              label: t('filters.withCount', { label: t(`craft.${c.key}`), count: c.count }),
            }))}
          />
        </FilterDrawer>
        <section aria-labelledby="archive-results">
          <h2 id="archive-results" className="visually-hidden">
            {t('archive.results')}
          </h2>
          <div className={s.resultsHead}>
            <p className={s.count} aria-live="polite">
              {state.data ? t('archive.count', { count: state.data.pagination.total }) : ''}
            </p>
            <div style={{ minWidth: '14rem' }}>
              <SelectFilter
                label={t('filters.sort')}
                value={f.sort || 'newest'}
                onChange={(v) => update({ sort: v === 'newest' ? '' : v })}
                options={['newest', 'oldest', 'most-played'].map((v) => ({
                  value: v,
                  label: t(`archive.sort.${v}`),
                }))}
              />
            </div>
          </div>
          <AsyncView
            state={state}
            empty={
              <EmptyScene art="wheel" title={t('empty.stories')}>
                <p>{t('empty.storiesHint')}</p>
              </EmptyScene>
            }
          >
            {(page) => (
              <>
                <ul className={s.stack}>
                  {page.items.map((st) => (
                    <li key={st.id}>
                      <StoryTicket story={st} />
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
