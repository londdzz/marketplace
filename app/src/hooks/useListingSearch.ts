import { useInfiniteQuery } from '@tanstack/react-query';

import { listingsApi } from '../api/listings';
import type { SearchFilters } from '../api/types';

/**
 * Results, a page at a time, for a list that keeps loading as it is scrolled.
 */
export function useListingSearch(filters: SearchFilters) {
  return useInfiniteQuery({
    queryKey: ['listings', filters],
    queryFn: ({ pageParam }) => listingsApi.search(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
  });
}
