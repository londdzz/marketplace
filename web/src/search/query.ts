import type { SearchFilters } from '../api/types';

/**
 * Filters in the address bar.
 *
 * A desktop visitor expects a search to be a link: back and forward work, a
 * result can be sent to somebody, and a reload does not lose the page. So the
 * URL holds the filters rather than a provider, and there is no second copy of
 * the search state to keep in step with it.
 */
const LISTS = new Set(['fuel', 'bodyType', 'countries']);
const NUMBERS = new Set([
  'makeId',
  'modelId',
  'yearMin',
  'yearMax',
  'priceMin',
  'priceMax',
  'mileageMax',
  'cityId',
]);

export function toQuery(filters: SearchFilters, page?: number): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','));
      }

      continue;
    }

    params.set(key, String(value));
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  return params.toString();
}

export function fromQuery(search: URLSearchParams): { filters: SearchFilters; page: number } {
  const filters: Record<string, unknown> = {};

  for (const [key, value] of search.entries()) {
    if (key === 'page' || value === '') {
      continue;
    }

    if (LISTS.has(key)) {
      filters[key] = value.split(',').filter(Boolean);
    } else if (NUMBERS.has(key)) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        filters[key] = parsed;
      }
    } else {
      filters[key] = value;
    }
  }

  const page = Number(search.get('page') ?? '1');

  return { filters: filters as SearchFilters, page: Number.isFinite(page) && page > 0 ? page : 1 };
}

/** How many filters are set, for the count beside "Narrow it down". */
export function countFilters(filters: SearchFilters): number {
  // The category is not a filter: it is which catalogue is being read, and
  // counting it would leave the reset button showing on an untouched search.
  return Object.keys(filters).filter(
    (key) => key !== 'sort' && key !== 'q' && key !== 'vehicleType',
  ).length;
}
