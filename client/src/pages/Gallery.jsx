import { useTranslation } from 'react-i18next';
import { CRAFT_KEYS, DISTRICTS } from '../../../shared/constants.js';
import { crafts } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useUrlFilters } from '../hooks/useUrlFilters.js';
import PageHeader from '../components/PageHeader.jsx';
import { FilterDrawer, SearchBox, SelectFilter } from '../components/Filters.jsx';
import { AsyncView, EmptyScene } from '../components/ui/Scenes.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { CraftTicket } from '../components/Tickets.jsx';
import CraftArt from '../components/art/CraftArt.jsx';
import s from './Listing.module.css';

const KEYS = ['q', 'craftType', 'district', 'minPrice', 'maxPrice', 'sort', 'page'];

export default function Gallery() {
  const { t } = useTranslation();
  usePageTitle(t('gallery.title'));
  const { values: f, update, clear } = useUrlFilters(KEYS);
  const state = useAsync(
    () =>
      crafts.list({
        q: f.q,
        craftType: f.craftType,
        district: f.district,
        minPrice: f.minPrice,
        maxPrice: f.maxPrice,
        sort: f.sort,
        page: f.page,
      }),
    [f.q, f.craftType, f.district, f.minPrice, f.maxPrice, f.sort, f.page],
  );
  const active = ['q', 'craftType', 'district', 'minPrice', 'maxPrice'].filter((k) => f[k]).length;
  const sortOptions = ['newest', 'oldest', 'price-asc', 'price-desc', 'title'].map((v) => ({
    value: v,
    label: t(`gallery.sort.${v}`),
  }));

  return (
    <div className="page">
      <PageHeader
        title={t('gallery.title')}
        lede={t('gallery.lede')}
        note={t('gallery.note')}
        art={<CraftArt craftType={f.craftType || 'bidriware'} seed="gallery-head" />}
      />
      <div className={s.layout}>
        <FilterDrawer title={t('filters.title')} activeCount={active} onClear={clear}>
          <SearchBox
            value={f.q}
            onSearch={(q) => update({ q })}
            label={t('gallery.searchLabel')}
            placeholder={t('gallery.searchPlaceholder')}
          />
          <SelectFilter
            label={t('filters.craft')}
            value={f.craftType}
            allLabel={t('filters.allCrafts')}
            onChange={(v) => update({ craftType: v })}
            options={CRAFT_KEYS.map((k) => ({ value: k, label: t(`craft.${k}`) }))}
          />
          <SelectFilter
            label={t('filters.district')}
            value={f.district}
            allLabel={t('filters.allDistricts')}
            onChange={(v) => update({ district: v })}
            options={DISTRICTS.map((d) => ({ value: d, label: d }))}
          />
          <fieldset className={s.priceRow} style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="visually-hidden">{t('filters.price')}</legend>
            <SelectFilter
              label={t('filters.minPrice')}
              value={f.minPrice}
              allLabel={t('filters.any')}
              onChange={(v) => update({ minPrice: v })}
              options={[500, 1000, 3000, 5000, 10000].map((v) => ({
                value: String(v),
                label: `₹${v}`,
              }))}
            />
            <SelectFilter
              label={t('filters.maxPrice')}
              value={f.maxPrice}
              allLabel={t('filters.any')}
              onChange={(v) => update({ maxPrice: v })}
              options={[500, 1000, 3000, 5000, 10000, 25000].map((v) => ({
                value: String(v),
                label: `₹${v}`,
              }))}
            />
          </fieldset>
        </FilterDrawer>

        <section aria-labelledby="results-title">
          <div className={s.resultsHead}>
            <h2 id="results-title" className="visually-hidden">
              {t('gallery.results')}
            </h2>
            <p className={s.count} aria-live="polite">
              {state.data ? t('gallery.count', { count: state.data.pagination.total }) : ''}
            </p>
            <div style={{ minWidth: '14rem' }}>
              <SelectFilter
                label={t('filters.sort')}
                value={f.sort || 'newest'}
                onChange={(v) => update({ sort: v === 'newest' ? '' : v })}
                options={sortOptions}
              />
            </div>
          </div>
          <AsyncView
            state={state}
            empty={
              <EmptyScene art="emptyLoom" title={t('empty.gallery')}>
                <p>{t('empty.galleryHint')}</p>
              </EmptyScene>
            }
          >
            {(page) => (
              <>
                <ul className={s.grid}>
                  {page.items.map((c) => (
                    <li key={c.id}>
                      <CraftTicket craft={c} />
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
