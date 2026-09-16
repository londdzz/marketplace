import { api } from './client';
import type { ApiResource, City, Country, Make, VehicleModel } from './types';

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
  exchangeRates: () =>
    api.get<ApiResource<ExchangeRate[]>>('/exchange-rates', { anonymous: true }).then((r) => r.data),
};
