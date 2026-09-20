import { api } from './client';
import { fromApiFilters, type ApiFilters } from './listings';
import type { ApiResource, City, Country, Make, SearchFilters, VehicleModel } from './types';

/** The closed vocabularies the API validates against. Keys, never wording. */
export type Vocabularies = {
  body_types: string[];
  drivetrains: string[];
  colors: string[];
  features: string[];
};

/**
 * The ways into the catalogue that are not a search box.
 *
 * A collection carries its own filters, so tapping it runs the same search the
 * search tab would, rather than the app keeping a second copy of what "a family
 * car" means. Every count is measured against live listings by the API.
 */
export type BrowseCollection = {
  key: string;
  filters: SearchFilters;
  count: number;
};

/** The same three fields, in the spelling the API sends them. */
type BrowseCollectionRow = {
  key: string;
  filters: ApiFilters | null;
  count: number;
};

export type BrowseBodyType = {
  key: string;
  count: number;
};

export type Browse = {
  collections: BrowseCollection[];
  body_types: BrowseBodyType[];
};

export type ExchangeRate = {
  currency: string;
  rate_per_eur: string;
  updated_at: string | null;
};

/**
 * Reference data. It changes rarely, so the API caches it and the app keeps it
 * for the length of a session.
 */
export const referenceApi = {
  countries: () =>
    api.get<ApiResource<Country[]>>('/countries', { anonymous: true }).then((r) => r.data),
  cities: (country?: string) =>
    api
      .get<ApiResource<City[]>>(`/cities${country ? `?country=${country}` : ''}`, { anonymous: true })
      .then((r) => r.data),
  makes: () => api.get<ApiResource<Make[]>>('/makes', { anonymous: true }).then((r) => r.data),
  models: (makeId: number) =>
    api
      .get<ApiResource<VehicleModel[]>>(`/makes/${makeId}/models`, { anonymous: true })
      .then((r) => r.data),
  vocabularies: () =>
    api.get<ApiResource<Vocabularies>>('/vocabularies', { anonymous: true }).then((r) => r.data),
  browse: () =>
    api
      .get<ApiResource<{ collections: BrowseCollectionRow[]; body_types: BrowseBodyType[] }>>(
        '/browse',
      )
      .then((response) => ({
        collections: response.data.collections.map((row) => ({
          key: row.key,
          filters: fromApiFilters(row.filters),
          count: row.count,
        })),
        body_types: response.data.body_types,
      })),
  exchangeRates: () =>
    api.get<ApiResource<ExchangeRate[]>>('/exchange-rates', { anonymous: true }).then((r) => r.data),
};
