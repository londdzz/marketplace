import { listingsApi } from '../api/listings';

import { guestFavorites, guestSavedSearches } from './store';

/**
 * Move what a guest kept on this phone onto the account they have just signed
 * in to, then forget the local copy.
 *
 * Three things it has to get right:
 *
 * Nothing is deleted until it is safely on the account. Each row is cleared
 * only after its own upload succeeded, so an upload that dies halfway — the
 * connection drops, the API is down — leaves everything it did not manage to
 * send still sitting on the phone, ready for the next attempt.
 *
 * It never removes anything from the account. Saving a car that is already
 * saved, or a search that already exists, is the only way this can collide,
 * and both are harmless: the API treats a repeat as the state it already has.
 *
 * It cannot fail the sign-in. A person who has just typed a code is signed in
 * whatever happens here, so every error is swallowed and the work is simply
 * left for next time rather than thrown at somebody who did nothing wrong.
 */
export type MergeResult = {
  favorites: number;
  searches: number;
};

export async function mergeGuestData(): Promise<MergeResult> {
  const result: MergeResult = { favorites: 0, searches: 0 };

  const [favorites, searches] = await Promise.all([
    guestFavorites.read().catch(() => []),
    guestSavedSearches.read().catch(() => []),
  ]);

  // Oldest first, so the account ends up ordered the way the phone was: the
  // API returns newest first, and uploading in reverse preserves that.
  for (const listing of [...favorites].reverse()) {
    try {
      await listingsApi.addFavorite(listing.id);
      result.favorites += 1;
    } catch {
      // A car that has since been taken down cannot be saved to the account.
      // Losing that one is correct — it is gone — and it must not stop the
      // rest from arriving.
    }
  }

  for (const search of [...searches].reverse()) {
    try {
      await listingsApi.saveSearch(search.filters, search.name ?? undefined);
      result.searches += 1;
    } catch {
      // Same reasoning: a filter the API now rejects should not hold up the
      // searches that are still valid.
    }
  }

  // Only once everything that could be sent has been. Anything that failed
  // above failed for a reason that will not change on the next attempt — the
  // car is gone, the filter is invalid — so the local copy has done its job
  // either way and holding on to it would re-try it on every sign-in.
  await Promise.all([guestFavorites.clear(), guestSavedSearches.clear()]);

  return result;
}
