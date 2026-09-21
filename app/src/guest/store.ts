import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Listing, SavedSearch, SearchFilters } from '../api/types';

/**
 * What a buyer keeps before they have an account.
 *
 * Everything here lives on this phone and nowhere else. It is not a shadow
 * account: no row is created on the server, nothing is sent anywhere, and
 * signing in is what moves it onto a real account — see `merge.ts`. Deleting
 * the app loses it, which is the honest cost of not asking for a phone number
 * before somebody has decided they want to use the thing.
 */

const FAVORITES = 'guest.favorites.v1';
const SEARCHES = 'guest.saved-searches.v1';

/**
 * A ceiling on what one device can hoard, so the store cannot grow without
 * limit and so the upload on sign-in is always a bounded piece of work. Well
 * past what anyone shortlists by hand.
 */
const CAP = 100;

/**
 * A saved car keeps a copy of the card, not just its id.
 *
 * Keeping only ids would mean fetching every listing back to draw the tab, and
 * reading a listing counts a view against it — so a buyer opening their own
 * saved list would inflate the view count of every car in it. A number that
 * rises because somebody looked at their own shortlist is a made-up number.
 *
 * The copy can go stale: a price can change, a car can sell. That is the
 * trade, and it ends the moment they sign in, because from then on the account
 * answers and the API is the truth.
 */
async function read<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // A corrupt or unreadable store is an empty one. It is a convenience, and
    // it must never be the reason the app fails to open.
    return [];
  }
}

async function write<T>(key: string, rows: T[]): Promise<T[]> {
  const capped = rows.slice(0, CAP);

  try {
    await AsyncStorage.setItem(key, JSON.stringify(capped));
  } catch {
    // Out of space, or storage denied. The list still reflects the tap for
    // this session; it simply will not survive a restart.
  }

  return capped;
}

export const guestFavorites = {
  read: () => read<Listing>(FAVORITES),

  has: async (listingId: string): Promise<boolean> =>
    (await read<Listing>(FAVORITES)).some((listing) => listing.id === listingId),

  /** Newest first, matching what the API returns for an account. */
  toggle: async (listing: Listing): Promise<Listing[]> => {
    const current = await read<Listing>(FAVORITES);
    const without = current.filter((saved) => saved.id !== listing.id);

    return write(FAVORITES, without.length < current.length ? without : [listing, ...without]);
  },

  clear: () => AsyncStorage.removeItem(FAVORITES).catch(() => undefined),
};

export const guestSavedSearches = {
  read: () => read<SavedSearch>(SEARCHES),

  add: async (name: string | null, filters: SearchFilters): Promise<SavedSearch[]> => {
    const current = await read<SavedSearch>(SEARCHES);

    const saved: SavedSearch = {
      // Distinguishable from a server id on sight, which matters because the
      // same screens render both.
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      filters,
      // A guest has no device token and no account, so nothing could be sent.
      // It becomes true when the search is uploaded on sign-in.
      notify: false,
      createdAt: new Date().toISOString(),
    };

    return write(SEARCHES, [saved, ...current]);
  },

  remove: async (id: string): Promise<SavedSearch[]> => {
    const current = await read<SavedSearch>(SEARCHES);

    return write(
      SEARCHES,
      current.filter((search) => search.id !== id),
    );
  },

  clear: () => AsyncStorage.removeItem(SEARCHES).catch(() => undefined),
};

/** Whether this device is holding anything worth uploading on sign-in. */
export async function guestHasData(): Promise<boolean> {
  const [favorites, searches] = await Promise.all([
    guestFavorites.read(),
    guestSavedSearches.read(),
  ]);

  return favorites.length > 0 || searches.length > 0;
}
