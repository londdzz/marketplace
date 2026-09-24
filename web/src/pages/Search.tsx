import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { listingsApi } from '../api/listings';
import { referenceApi } from '../api/reference';
import type { SearchFilters, SortOption } from '../api/types';
import { ListingCard } from '../components/ListingCard';
import { Button, Card, Chip, EmptyState, ErrorState, Field, Input, Select, Spinner } from '../components/ui';
import { useFavorites } from '../hooks/useFavorites';
import { countFilters, fromQuery, toQuery } from '../search/query';

const FUELS = ['diesel', 'petrol', 'hybrid', 'electric', 'lpg'];
const GEARBOXES = ['manual', 'automatic'];
const SORTS: SortOption[] = ['relevance', 'price_asc', 'price_desc', 'newest', 'mileage_asc'];

/**
 * Results, with the filters beside them.
 *
 * On a phone the filters are a sheet, because there is no room for both. A
 * desktop has the room, so they sit in a column on the left and the results
 * reflow as they change — which is the whole reason somebody opens a
 * marketplace on a computer rather than a phone.
 *
 * Every change rewrites the address, so the back button steps through the
 * searches and a result can be sent to somebody.
 */
export function Search() {
  const { t } = useTranslation(['search', 'listing', 'common', 'web', 'home']);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const favorites = useFavorites();

  const { filters, page } = fromQuery(params);

  const makes = useQuery({ queryKey: ['makes'], queryFn: referenceApi.makes, staleTime: 3_600_000 });
  const models = useQuery({
    queryKey: ['models', filters.makeId],
    queryFn: () => referenceApi.models(filters.makeId as number),
    enabled: filters.makeId !== undefined,
    staleTime: 3_600_000,
  });

  const results = useQuery({
    queryKey: ['listings', filters, page],
    queryFn: () => listingsApi.search(filters, page),
    // The current page stays on screen while the next is fetched, so the list
    // never empties under the reader.
    placeholderData: (previous) => previous,
  });

  /** Any change resets to page one: page four of a different search is not a
      place the buyer asked to be. */
  const set = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch } as Record<string, unknown>;

    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        delete next[key];
      }
    }

    navigate(`/search?${toQuery(next as SearchFilters)}`);
  };

  const toggleIn = (key: 'fuel' | 'bodyType', value: string) => {
    const list = (filters[key] ?? []) as string[];

    set({ [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] } as Partial<SearchFilters>);
  };

  const goto = (next: number) => {
    navigate(`/search?${toQuery(filters, next)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const total = results.data?.meta.total ?? 0;
  const lastPage = results.data?.meta.last_page ?? 1;
  const active = countFilters(filters);

  return (
    <div className="page results">
      <aside className="filters">
        <div className="filters__head">
          <h2 className="filters__title">{t('web:filters_title')}</h2>
          {active > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => navigate('/search')}>
              {t('search:reset')}
            </Button>
          ) : null}
        </div>

        <Card className="filters__card">
          <Field label={t('search:anything')}>
            <Input
              type="search"
              defaultValue={filters.q ?? ''}
              placeholder={t('search:anything')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  set({ q: (event.target as HTMLInputElement).value });
                }
              }}
            />
          </Field>

          <Field label={t('search:make_model')}>
            <Select
              value={filters.makeId ?? ''}
              onChange={(event) =>
                set({
                  makeId: event.target.value ? Number(event.target.value) : undefined,
                  // A model belongs to one make, so it goes with it.
                  modelId: undefined,
                })
              }
            >
              <option value="">{t('search:all_makes')}</option>
              {(makes.data ?? []).map((make) => (
                <option key={make.id} value={make.id}>
                  {make.name}
                </option>
              ))}
            </Select>
          </Field>

          {filters.makeId !== undefined ? (
            <Field label={t('search:model')}>
              <Select
                value={filters.modelId ?? ''}
                onChange={(event) => set({ modelId: event.target.value ? Number(event.target.value) : undefined })}
              >
                <option value="">{t('search:any_model')}</option>
                {(models.data ?? []).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <div className="filters__pair">
            <Field label={t('search:price')}>
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t('search:min')}
                defaultValue={filters.priceMin ?? ''}
                onBlur={(event) => set({ priceMin: event.target.value ? Number(event.target.value) : undefined })}
              />
            </Field>
            <Field label="&nbsp;">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t('search:max')}
                defaultValue={filters.priceMax ?? ''}
                onBlur={(event) => set({ priceMax: event.target.value ? Number(event.target.value) : undefined })}
              />
            </Field>
          </div>

          <div className="filters__pair">
            <Field label={t('search:year')}>
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t('search:min')}
                defaultValue={filters.yearMin ?? ''}
                onBlur={(event) => set({ yearMin: event.target.value ? Number(event.target.value) : undefined })}
              />
            </Field>
            <Field label="&nbsp;">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t('search:max')}
                defaultValue={filters.yearMax ?? ''}
                onBlur={(event) => set({ yearMax: event.target.value ? Number(event.target.value) : undefined })}
              />
            </Field>
          </div>

          <Field label={t('search:mileage')}>
            <Input
              type="number"
              inputMode="numeric"
              placeholder={t('search:max')}
              defaultValue={filters.mileageMax ?? ''}
              onBlur={(event) => set({ mileageMax: event.target.value ? Number(event.target.value) : undefined })}
            />
          </Field>

          <Field label={t('search:fuel')}>
            <div className="chips">
              {FUELS.map((fuel) => (
                <Chip
                  key={fuel}
                  label={t(`listing:fuel.${fuel}`, fuel)}
                  selected={(filters.fuel ?? []).includes(fuel)}
                  onClick={() => toggleIn('fuel', fuel)}
                />
              ))}
            </div>
          </Field>

          <Field label={t('search:transmission')}>
            <div className="chips">
              {GEARBOXES.map((box) => (
                <Chip
                  key={box}
                  label={t(`listing:transmission.${box}`, box)}
                  selected={filters.transmission === box}
                  onClick={() => set({ transmission: filters.transmission === box ? undefined : box })}
                />
              ))}
            </div>
          </Field>
        </Card>
      </aside>

      <section className="results__main">
        <div className="results__bar">
          <p className="results__count">
            {results.isLoading ? ' ' : t('search:offers', { count: total })}
          </p>

          <Select
            className="results__sort"
            value={filters.sort ?? 'relevance'}
            aria-label={t('search:sort')}
            onChange={(event) => set({ sort: event.target.value as SortOption })}
          >
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {t(`search:sort_${sort}`)}
              </option>
            ))}
          </Select>
        </div>

        {results.isLoading ? (
          <Spinner />
        ) : results.isError ? (
          <ErrorState
            title={t('common:error_loading')}
            actionLabel={t('common:retry')}
            onRetry={() => void results.refetch()}
          />
        ) : total === 0 ? (
          <EmptyState
            title={t('search:no_results_title')}
            description={t('search:no_results_body')}
            actionLabel={active > 0 ? t('search:reset') : undefined}
            onAction={active > 0 ? () => navigate('/search') : undefined}
          />
        ) : (
          <>
            <div className="grid">
              {(results.data?.data ?? []).map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  favorited={favorites.ids.has(listing.id)}
                  onToggleFavorite={
                    favorites.signedIn ? () => favorites.toggle(listing) : () => navigate('/sign-in')
                  }
                />
              ))}
            </div>

            {lastPage > 1 ? (
              <nav className="pager">
                <Button variant="secondary" disabled={page <= 1} onClick={() => goto(page - 1)}>
                  ‹ {t('search:previous')}
                </Button>
                <span className="muted">{t('search:page_of', { page, total: lastPage })}</span>
                <Button variant="secondary" disabled={page >= lastPage} onClick={() => goto(page + 1)}>
                  {t('search:next')} ›
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
