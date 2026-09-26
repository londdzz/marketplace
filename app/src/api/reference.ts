import { api } from './client';
import { fromApiFilters, type ApiFilters } from './listings';
import type {
  ApiResource,
  City,
  Country,
  Make,
  SearchFilters,
  Sponsors,
  VehicleModel,
  VehicleType,
} from './types';

/** The closed vocabularies the API validates against. Keys, never wording. */
export type Vocabularies = {
  vehicle_types: VehicleType[];
  body_types: string[];
  /** A motorcycle's shapes, which share the column and nothing else. */
  motorcycle_types: string[];
  drivetrains: string[];
  colors: string[];
  features: string[];
};

/** The shapes the given kind of vehicle comes in. */
export function shapesFor(vocabularies: Vocabularies | undefined, type: VehicleType): string[] {
  if (!vocabularies) {
    return [];
  }

  return type === 'motorcycle' ? vocabularies.motorcycle_types : vocabularies.body_types;
}

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
  /** A car actually in the collection, photographed by whoever is selling it. */
  photoUrl: string | null;
};

/** The same three fields, in the spelling the API sends them. */
type BrowseCollectionRow = {
  key: string;
  filters: ApiFilters | null;
  count: number;
  photo_url: string | null;
};

type BrowseBodyTypeRow = {
  key: string;
  count: number;
  photo_url: string | null;
};

export type BrowseBodyType = {
  key: string;
  count: number;
  photoUrl: string | null;
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
  // A make that sells both keeps its cars and its bikes in separate lists, and
  // which makes lead the picker is a different answer per kind, so both of
  // these carry the kind rather than filtering afterwards.
  makes: (type: VehicleType = 'car') =>
    api.get<ApiResource<Make[]>>(`/makes?type=${type}`, { anonymous: true }).then((r) => r.data),
  models: (makeId: number, type: VehicleType = 'car') =>
    api
      .get<ApiResource<VehicleModel[]>>(`/makes/${makeId}/models?type=${type}`, { anonymous: true })
      .then((r) => r.data),
  vocabularies: () =>
    api.get<ApiResource<Vocabularies>>('/vocabularies', { anonymous: true }).then((r) => r.data),
  browse: (type: VehicleType = 'car') =>
    api
      .get<ApiResource<{ collections: BrowseCollectionRow[]; body_types: BrowseBodyTypeRow[] }>>(
        `/browse?type=${type}`,
      )
      .then((response) => ({
        collections: response.data.collections.map((row) => ({
          key: row.key,
          filters: fromApiFilters(row.filters),
          count: row.count,
          photoUrl: row.photo_url,
        })),
        body_types: response.data.body_types.map((row) => ({
          key: row.key,
          count: row.count,
          photoUrl: row.photo_url,
        })),
      })),
  exchangeRates: () =>
    api.get<ApiResource<ExchangeRate[]>>('/exchange-rates', { anonymous: true }).then((r) => r.data),
  /**
   * The booked advertisements, all three slots in one answer.
   *
   * Anonymous like the rest of the reference data: a buyer with no account
   * sees the same sponsors as one with, and asking for a token here would
   * make a signed-out home screen fetch differently for no reason.
   */
  sponsors: (type: VehicleType = 'car') =>
    api.get<ApiResource<Sponsors>>(`/sponsors?type=${type}`, { anonymous: true }).then((r) => r.data),
};
