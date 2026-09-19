import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';

import { listingsApi } from '../api/listings';
import { referenceApi } from '../api/reference';
import type { ListingPage } from '../api/types';

/** How long the launch waits before showing the app half-filled anyway. */
const PATIENCE_MS = 6000;

/** Reference data every screen leans on, and it barely ever changes. */
const REFERENCE_STALE_MS = 60 * 60 * 1000;

/** How many of the home screen's cars are on screen before a scroll. */
const CARS_ABOVE_THE_FOLD = 6;

/**
 * Fetches what the first screens need before they are shown.
 *
 * Without this the app opens on empty frames and fills in one panel at a time:
 * the makes arrive, then the cars, then the prices once the rates land. Asking
 * for all of it while the launch screen is still up costs the same requests and
 * shows a finished screen instead.
 *
 * It is a warm-up, not a gate. Anything that fails is left to the screen that
 * needs it, which has its own failure state and its own retry, and after
 * `PATIENCE_MS` the app opens regardless — a slow connection should mean a
 * screen that is still loading, never a launch that never finishes.
 *
 * @param waitFor pass false while something earlier is still resolving, such
 *                as the stored token being read
 * @param signedIn fetches the signed-in screens' data too
 */
export function useWarmUp(waitFor: boolean, signedIn: boolean): boolean {
  const queryClient = useQueryClient();
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    if (!waitFor || warm) {
      return;
    }

    let live = true;

    const reference = [
      queryClient.prefetchQuery({
        queryKey: ['countries'],
        queryFn: referenceApi.countries,
        staleTime: REFERENCE_STALE_MS,
      }),
      queryClient.prefetchQuery({
        queryKey: ['makes'],
        queryFn: referenceApi.makes,
        staleTime: REFERENCE_STALE_MS,
      }),
      queryClient.prefetchQuery({
        queryKey: ['vocabularies'],
        queryFn: referenceApi.vocabularies,
        staleTime: REFERENCE_STALE_MS,
      }),
      queryClient.prefetchQuery({
        queryKey: ['exchange-rates'],
        queryFn: referenceApi.exchangeRates,
        staleTime: REFERENCE_STALE_MS,
      }),
    ];

    // The home screen's own two requests, so it opens with cars on it.
    const mine = signedIn
      ? [
          queryClient.prefetchInfiniteQuery({
            queryKey: ['listings', { sort: 'newest' }],
            queryFn: () => listingsApi.search({ sort: 'newest' }, 1),
            initialPageParam: 1,
          }),
          queryClient.prefetchQuery({
            queryKey: ['favorites'],
            queryFn: listingsApi.favorites,
          }),
        ]
      : [];

    // The card's text arrives with the listing, but its photograph is a
    // separate request that would otherwise only start once the card drew —
    // so the home screen would come up complete except for six grey boxes
    // filling in. Only what is on screen before a scroll is worth waiting for.
    const photos = Promise.all(mine).then(async () => {
      if (!signedIn) {
        return;
      }

      const cached = queryClient.getQueryData<{ pages: ListingPage[] }>([
        'listings',
        { sort: 'newest' },
      ]);

      const urls = (cached?.pages[0]?.data ?? [])
        .slice(0, CARS_ABOVE_THE_FOLD)
        .map((listing) => listing.photos?.[0]?.thumb_url)
        .filter((url): url is string => Boolean(url));

      if (urls.length === 0) {
        return;
      }

      try {
        await Image.prefetch(urls);
      } catch {
        // A photograph that will not preload still loads when it is drawn.
      }
    });

    const done = Promise.allSettled([...reference, ...mine, photos]);
    const patience = new Promise((resolve) => setTimeout(resolve, PATIENCE_MS));

    void Promise.race([done, patience]).then(() => {
      if (live) {
        setWarm(true);
      }
    });

    return () => {
      live = false;
    };
  }, [queryClient, waitFor, warm, signedIn]);

  return warm;
}
