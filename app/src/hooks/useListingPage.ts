import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { listingsApi } from '../api/listings';
import type { SearchFilters } from '../api/types';

/** The query key a page of results is cached under, so a warm-up can fill it. */
export function listingPageKey(filters: SearchFilters, page: number) {
  return ['listings', filters, page] as const;
}

/**
 * One page of results.
 *
 * Paged rather than endless: a buyer comparing cars needs to know where they
 * are and be able to get back to it, and an endless list gives them neither.
 * `keepPreviousData` holds the page they are looking at on screen while the
 * next one is fetched, so turning a page never empties the list first.
 */
export function useListingPage(filters: SearchFilters, page: number) {
  return useQuery({
    queryKey: listingPageKey(filters, page),
    queryFn: () => listingsApi.search(filters, page),
    placeholderData: keepPreviousData,
  });
}
