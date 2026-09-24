import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listingsApi } from '../api/listings';
import type { Listing } from '../api/types';
import { useAuth } from '../auth/AuthProvider';

/**
 * A buyer's shortlist.
 *
 * Keeping one involves nobody else, so the app lets a guest do it on the
 * phone. On the website it needs an account: there is no equivalent of the
 * app's local store here worth building, and a shortlist that vanished when
 * the browser cleared its storage would be worse than one that asks to sign
 * in. The heart says so rather than failing.
 */
export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['favorites'],
    queryFn: () => listingsApi.favorites(),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const ids = new Set((query.data?.data ?? []).map((listing: Listing) => listing.id));

  const toggle = useMutation({
    mutationFn: async (listing: Listing) => {
      if (ids.has(listing.id)) {
        await listingsApi.removeFavorite(listing.id);
      } else {
        await listingsApi.addFavorite(listing.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  return {
    listings: query.data?.data ?? [],
    ids,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    signedIn: Boolean(user),
    toggle: (listing: Listing) => toggle.mutate(listing),
    pending: toggle.isPending,
  };
}
