import { api } from './client';
import type { ApiResource, Listing, ListingPage, SearchFilters } from './types';

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

export const listingsApi = {
  search: (filters: SearchFilters, page = 1) =>
    api.get<ListingPage>(`/listings?${toQuery(filters, page)}`, { anonymous: true }),

  show: (id: string) =>
    api.get<ApiResource<Listing>>(`/listings/${id}`, { anonymous: true }).then((r) => r.data),

  favorites: () => api.get<ListingPage>('/favorites'),

  addFavorite: (listingId: string) => api.post<unknown>('/favorites', { listing_id: listingId }),

  removeFavorite: (listingId: string) => api.delete<unknown>(`/favorites/${listingId}`),

  report: (listingId: string, reason: string, note?: string) =>
    api.post<unknown>(`/listings/${listingId}/report`, { reason, note }),

  startConversation: (listingId: string, body?: string) =>
    api.post<unknown>(`/listings/${listingId}/conversations`, { body }),
};
