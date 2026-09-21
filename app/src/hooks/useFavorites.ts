import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listingsApi } from '../api/listings';
import type { Listing } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { guestFavorites } from '../guest/store';

/**
 * The cars this buyer kept, wherever they happen to be kept.
 *
 * A signed-in account reads and writes the API. A guest reads and writes this
 * phone. Every screen that saves a car uses this and none of them knows which
 * of the two it is talking to, so the heart behaves identically before and
 * after somebody signs in — which is the point of letting them in without an
 * account at all.
 */
export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // One key for both, because AuthProvider empties the cache whenever the
  // account changes — so this can never answer with the previous person's
  // shortlist, and no screen has to know whose list it is asking for.
  const queryKey = ['favorites'] as const;

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Listing[]> =>
      user ? (await listingsApi.favorites()).data : guestFavorites.read(),
  });

  const listings = query.data ?? [];
  const ids = new Set(listings.map((listing) => listing.id));

  const toggle = useMutation({
    mutationFn: async (listing: Listing) => {
      if (!user) {
        await guestFavorites.toggle(listing);

        return;
      }

      await (ids.has(listing.id)
        ? listingsApi.removeFavorite(listing.id)
        : listingsApi.addFavorite(listing.id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    listings,
    ids,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    toggle: (listing: Listing) => toggle.mutate(listing),
  };
}
