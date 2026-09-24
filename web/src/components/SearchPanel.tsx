import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { listingsApi } from '../api/listings';
import { referenceApi } from '../api/reference';
import type { SearchFilters } from '../api/types';
import { toQuery } from '../search/query';
import { Button, Chip, Field, Input, Select } from './ui';

/**
 * The search itself, on the front page.
 *
 * A home screen that only points at a search is a poster. This is the search:
 * a buyer arrives, narrows it here, and the button along the bottom says how
 * many cars that would return before they commit to looking. Nobody has to run
 * a search to learn whether it is worth running.
 *
 * The count is the API's, measured against live listings on every change —
 * the same rule the app's builder follows. A number invented on the client
 * would be a wrong number, and this one is the whole point of the panel.
 */
const YEARS = Array.from({ length: 30 }, (_, at) => new Date().getFullYear() - at);
const MILEAGES = [25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000];
const PRICES = [1_000, 2_000, 3_000, 5_000, 7_500, 10_000, 15_000, 20_000, 30_000, 50_000];

export function SearchPanel() {
  const { t } = useTranslation(['search', 'web', 'common']);
  const navigate = useNavigate();

  const [filters, setFilters] = useState<SearchFilters>({});
  // The count trails the controls by a moment, so holding a key down or
  // stepping through a list does not fire a request per keystroke.
  const [settled, setSettled] = useState<SearchFilters>({});

  useEffect(() => {
    const timer = setTimeout(() => setSettled(filters), 300);

    return () => clearTimeout(timer);
  }, [filters]);

  const makes = useQuery({ queryKey: ['makes'], queryFn: referenceApi.makes, staleTime: 3_600_000 });
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries, staleTime: 3_600_000 });
  const cities = useQuery({
    queryKey: ['cities'],
    queryFn: () => referenceApi.cities(),
    staleTime: 3_600_000,
  });
  const models = useQuery({
    queryKey: ['models', filters.makeId],
    queryFn: () => referenceApi.models(filters.makeId as number),
    enabled: filters.makeId !== undefined,
    staleTime: 3_600_000,
  });

  // One cheap request that asks only how many, so the button never disagrees
  // with the results it opens.
  const preview = useQuery({
    queryKey: ['listing-count', settled],
    queryFn: () => listingsApi.search(settled, 1),
    placeholderData: (previous) => previous,
  });

  const set = (patch: Partial<SearchFilters>) =>
    setFilters((current) => {
      const next = { ...current, ...patch } as Record<string, unknown>;

      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          delete next[key];
        }
      }

      return next as SearchFilters;
    });

  const run = () => navigate(`/search?${toQuery(filters)}`);
  const total = preview.data?.meta.total;
  const narrowed = Object.keys(filters).length > 0;

  return (
    <div className="panel">
      <form
        className="panel__query"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <Input
          type="search"
          className="panel__q"
          placeholder={t('search:anything')}
          value={filters.q ?? ''}
          onChange={(event) => set({ q: event.target.value })}
          aria-label={t('search:anything')}
        />
        <Button type="submit" size="lg" aria-label={t('search:search_now')}>
          →
        </Button>
      </form>

      <div className="panel__grid">
        <Field label={t('search:make')}>
          <Select
            value={filters.makeId ?? ''}
            onChange={(event) =>
              // A model belongs to one make, so it goes with it.
              set({
                makeId: event.target.value ? Number(event.target.value) : undefined,
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

        <Field label={t('search:model')}>
          <Select
            value={filters.modelId ?? ''}
            disabled={filters.makeId === undefined}
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

        <Field label={`${t('search:year')} · ${t('search:min')}`}>
          <Select
            value={filters.yearMin ?? ''}
            onChange={(event) => set({ yearMin: event.target.value ? Number(event.target.value) : undefined })}
          >
            <option value="">{t('search:any')}</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={`${t('search:mileage')} · ${t('search:max')}`}>
          <Select
            value={filters.mileageMax ?? ''}
            onChange={(event) => set({ mileageMax: event.target.value ? Number(event.target.value) : undefined })}
          >
            <option value="">{t('search:any')}</option>
            {MILEAGES.map((km) => (
              <option key={km} value={km}>
                {km.toLocaleString('de-DE')} km
              </option>
            ))}
          </Select>
        </Field>

        <Field label={`${t('search:price')} · ${t('search:max')}`}>
          <Select
            value={filters.priceMax ?? ''}
            onChange={(event) => set({ priceMax: event.target.value ? Number(event.target.value) : undefined })}
          >
            <option value="">{t('search:any')}</option>
            {PRICES.map((price) => (
              <option key={price} value={price}>
                {price.toLocaleString('de-DE')} €
              </option>
            ))}
          </Select>
        </Field>

        {/* Countries only where there is a choice to make. One open market
            means every car is in it, and a chooser with one option is a
            control that cannot do anything; flipping a second market on in the
            API brings this back without a change here. */}
        {(countries.data ?? []).length > 1 ? (
          <Field label={t('search:countries')}>
            <div className="chips">
              {(countries.data ?? []).map((row) => {
                const on = (filters.countries ?? []).includes(row.code);

                return (
                  <Chip
                    key={row.code}
                    label={t(`search:country.${row.code}`)}
                    selected={on}
                    onClick={() =>
                      set({
                        countries: on
                          ? (filters.countries ?? []).filter((code) => code !== row.code)
                          : [...(filters.countries ?? []), row.code],
                      })
                    }
                  />
                );
              })}
            </div>
          </Field>
        ) : null}

        <Field label={t('search:city')}>
          <Select
            value={filters.cityId ?? ''}
            onChange={(event) => set({ cityId: event.target.value ? Number(event.target.value) : undefined })}
          >
            <option value="">{t('search:location_any')}</option>
            {(cities.data ?? []).map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="panel__foot">
        <div className="panel__links">
          {narrowed ? (
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
              ↺ {t('search:reset')}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={run}>
            {t('search:more_filters')}
          </Button>
        </div>

        {/* The one azure thing on the panel, and it says what it will show. */}
        <Button size="lg" onClick={run} className="panel__go">
          {total === undefined ? t('search:search_now') : t('search:offers', { count: total })}
        </Button>
      </div>
    </div>
  );
}
