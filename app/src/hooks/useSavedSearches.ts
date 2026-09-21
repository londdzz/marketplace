import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listingsApi } from '../api/listings';
import type { SavedSearch, SearchFilters } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { guestSavedSearches } from '../guest/store';

/**
 * The searches this buyer kept, on the account or on the phone.
 *
 * The one real difference between the two is notification: a saved search on
 * an account is watched by the scheduled job and can send a push when a
 * matching car appears, and one on a phone cannot, because there is nobody to
 * send it to. The tab says so rather than letting a guest believe they will be
 * told.
 */
export function useSavedSearches() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['saved-searches'] as const;

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<SavedSearch[]> =>
      user ? listingsApi.savedSearches() : guestSavedSearches.read(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const save = useMutation({
    mutationFn: async ({ name, filters }: { name: string | null; filters: SearchFilters }) => {
      if (!user) {
        await guestSavedSearches.add(name, filters);

        return;
      }

      await listingsApi.saveSearch(filters, name ?? undefined);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        await guestSavedSearches.remove(id);

        return;
      }

      await listingsApi.deleteSavedSearch(id);
    },
    onSuccess: invalidate,
  });

  return {
    searches: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    save,
    remove,
    /** A guest's searches are kept, but nothing can notify them about one. */
    canNotify: Boolean(user),
  };
}
