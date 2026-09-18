import { api } from './client';
import type { ApiResource, Listing, ListingPage, SavedSearch, SearchFilters } from './types';

/**
 * Turns the filter object the app holds into the query string the API expects,
 * dropping anything empty so the URL stays readable.
 */
export function toQuery(filters: SearchFilters, page = 1): string {
  const params = new URLSearchParams();

  const append = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(`${key}[]`, String(item)));

      return;
    }

    params.append(key, String(value));
  };

  append('q', filters.q);
  append('make_id', filters.makeId);
  append('model_id', filters.modelId);
  append('year_min', filters.yearMin);
  append('year_max', filters.yearMax);
  append('price_min', filters.priceMin);
  append('price_max', filters.priceMax);
  append('mileage_max', filters.mileageMax);
  append('fuel', filters.fuel);
  append('transmission', filters.transmission);
  append('body_type', filters.bodyType);
  append('countries', filters.countries);
  append('city_id', filters.cityId);
  append('sort', filters.sort);
  append('page', page);

  return params.toString();
}

/** The filter object as the API stores it, in its own snake_case spelling. */
type ApiFilters = {
  q?: string;
  make_id?: number;
  model_id?: number;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  mileage_max?: number;
  fuel?: string[];
  transmission?: string;
  body_type?: string;
  countries?: string[];
  city_id?: number;
  sort?: SearchFilters['sort'];
};

type SavedSearchRow = {
  id: string;
  name: string | null;
  filters: ApiFilters | null;
  notify: boolean;
  created_at: string | null;
};

/** The reverse of what `saveSearch` sends, so a kept search can be re-run. */
function fromApiFilters(filters: ApiFilters | null): SearchFilters {
  if (!filters) {
    return {};
  }

  const mapped: SearchFilters = {
    q: filters.q,
    makeId: filters.make_id,
    modelId: filters.model_id,
    yearMin: filters.year_min,
    yearMax: filters.year_max,
    priceMin: filters.price_min,
    priceMax: filters.price_max,
    mileageMax: filters.mileage_max,
    fuel: filters.fuel,
    transmission: filters.transmission,
    bodyType: filters.body_type,
    countries: filters.countries,
    cityId: filters.city_id,
    sort: filters.sort,
  };

  for (const [key, value] of Object.entries(mapped)) {
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      delete mapped[key as keyof SearchFilters];
    }
  }

  return mapped;
}

/** What GET /favorites actually returns: bookmarks, each carrying its listing. */
type FavoritePage = {
  data: Array<{ listing_id: string; listing?: Listing; created_at: string | null }>;
  meta: ListingPage['meta'];
};

export const listingsApi = {
  /**
   * Searching does not need a token — anyone can look — but it is sent when
   * there is one, because the API hides listings from accounts this one has
   * blocked, and it cannot do that without knowing who is asking.
   */
  search: (filters: SearchFilters, page = 1) =>
    api.get<ListingPage>(`/listings?${toQuery(filters, page)}`),

  show: (id: string) => api.get<ApiResource<Listing>>(`/listings/${id}`).then((r) => r.data),

  /**
   * The saved cars.
   *
   * The API answers with favourite rows — when it was saved, and the listing
   * inside — so the listings are lifted out here. Every screen that shows saved
   * cars wants the cars, not the bookmarks.
   */
  favorites: (): Promise<ListingPage> =>
    api.get<FavoritePage>('/favorites').then((page) => ({
      data: page.data.map((row) => row.listing).filter((listing): listing is Listing => Boolean(listing)),
      meta: page.meta,
    })),

  addFavorite: (listingId: string) => api.post<unknown>('/favorites', { listing_id: listingId }),

  removeFavorite: (listingId: string) => api.delete<unknown>(`/favorites/${listingId}`),

  report: (listingId: string, reason: string, note?: string) =>
    api.post<unknown>(`/listings/${listingId}/report`, { reason, note }),

  /** Keep this search, so the API can tell the buyer when a match appears. */
  saveSearch: (filters: SearchFilters, name?: string) =>
    api.post<unknown>('/saved-searches', {
      name,
      filters: {
        q: filters.q,
        make_id: filters.makeId,
        model_id: filters.modelId,
        year_min: filters.yearMin,
        year_max: filters.yearMax,
        price_min: filters.priceMin,
        price_max: filters.priceMax,
        mileage_max: filters.mileageMax,
        fuel: filters.fuel,
        transmission: filters.transmission,
        body_type: filters.bodyType,
        countries: filters.countries,
        city_id: filters.cityId,
        sort: filters.sort,
      },
    }),

  /** Every search this account kept, newest first. */
  savedSearches: (): Promise<SavedSearch[]> =>
    api.get<{ data: SavedSearchRow[] }>('/saved-searches').then((page) =>
      page.data.map((row) => ({
        id: row.id,
        name: row.name,
        filters: fromApiFilters(row.filters),
        notify: row.notify,
        createdAt: row.created_at,
      })),
    ),

  deleteSavedSearch: (id: string) => api.delete<unknown>(`/saved-searches/${id}`),

  startConversation: (listingId: string, body?: string) =>
    api.post<unknown>(`/listings/${listingId}/conversations`, { body }),
};
