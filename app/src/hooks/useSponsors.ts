import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';

import { referenceApi } from '../api/reference';
import type { SponsorRow, Sponsors, VehicleType } from '../api/types';

const EMPTY: Sponsors = { home_top: [], home_feed: [], home_partners: [] };

/**
 * What is booked for the home screen.
 *
 * Reference data, so it is cached like reference data: a booking changes when
 * one is sold, not while somebody is scrolling. A failure answers with three
 * empty slots rather than an error state — a home screen that says "could not
 * load advertisements" would be telling a buyer about a problem that is not
 * theirs, and the screen is complete without any.
 */
export function useSponsors(type: VehicleType) {
  const query = useQuery({
    queryKey: ['sponsors', type],
    queryFn: () => referenceApi.sponsors(type),
    staleTime: 30 * 60 * 1000,
  });

  return query.data ?? EMPTY;
}

/**
 * Open a sponsor's link, if it has one.
 *
 * Outside the app deliberately. A sponsor's site is somebody else's, and
 * drawing it inside our chrome would suggest we stand behind what is on it.
 * A link that will not open is swallowed: there is nothing useful to say to a
 * buyer about an advertiser's broken URL.
 */
export async function openSponsor(sponsor: SponsorRow): Promise<void> {
  if (!sponsor.link_url) {
    return;
  }

  try {
    await Linking.openURL(sponsor.link_url);
  } catch {
    // Nothing to tell the person: it is not their problem and not their fault.
  }
}
