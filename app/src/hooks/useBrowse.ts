import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { BrowseCollection } from '../api/reference';
import { referenceApi } from '../api/reference';
import type { SearchFilters } from '../api/types';
import type { CollectionArt } from '../components/CollectionCard';
import { formatEur, formatKm } from '../format';

/** The key every screen reads the browse sections under. */
export const BROWSE_KEY = ['browse'] as const;

/** It moves only as fast as listings are published, and the API caches an hour. */
const STALE_MS = 15 * 60 * 1000;

export function useBrowse() {
  return useQuery({ queryKey: BROWSE_KEY, queryFn: referenceApi.browse, staleTime: STALE_MS });
}

/**
 * The icon each collection wears.
 *
 * Keyed on what the API sends, with a fallback, so a collection added to the
 * config ships without the app being rebuilt — it just arrives wearing the
 * default until someone chooses it one.
 */
const ICONS: Record<string, string> = {
  family: 'people-outline',
  first_car: 'school-outline',
  premium: 'diamond-outline',
  low_mileage: 'speedometer-outline',
  automatic: 'options-outline',
  electrified: 'flash-outline',
};

export function collectionIcon(key: string): string {
  return ICONS[key] ?? 'pricetag-outline';
}

/**
 * Art commissioned for a collection: the scene a car like this is used in,
 * and the car itself cut out to stand on the join.
 *
 * Only the collections that have been drawn appear here. The rest fall back to
 * a photograph of a car actually in them, which is what every collection had
 * before any of this was drawn and what a new one gets the day it is added.
 */
const ART: Record<string, CollectionArt> = {
  family: {
    background: require('../../assets/collections/family-bg.jpg'),
    car: require('../../assets/collections/family-car.png'),
    carRatio: 0.616,
  },
  first_car: {
    background: require('../../assets/collections/first-car-bg.jpg'),
    car: require('../../assets/collections/first-car.png'),
    carRatio: 0.503,
  },
};

export function collectionArt(key: string): CollectionArt | null {
  return ART[key] ?? null;
}

/** At most four, two to a row, as the card draws them. */
const MAX_CHIPS = 4;

/**
 * A collection's own filters, written out as a buyer would read them.
 *
 * Drawn from the filters the API sent rather than from a second list of words
 * kept beside them, so a collection can never say one thing and search for
 * another.
 */
export function useCollectionChips() {
  const { t } = useTranslation('home');

  return (collection: BrowseCollection): string[] => {
    const filters: SearchFilters = collection.filters ?? {};
    const chips: string[] = [];

    if (filters.yearMin) {
      chips.push(t('filter_from_year', { year: filters.yearMin }));
    }

    if (filters.yearMax) {
      chips.push(t('filter_to_year', { year: filters.yearMax }));
    }

    if (filters.priceMin) {
      chips.push(t('filter_from_price', { price: formatEur(filters.priceMin) }));
    }

    if (filters.priceMax) {
      chips.push(t('filter_to_price', { price: formatEur(filters.priceMax) }));
    }

    if (filters.mileageMax) {
      chips.push(t('filter_to_mileage', { mileage: formatKm(filters.mileageMax).replace(/\s*km$/i, '') }));
    }

    if (filters.transmission) {
      chips.push(t(`filter_${filters.transmission}`));
    }

    if (filters.bodyType) {
      chips.push(t(`listing:body_type.${filters.bodyType}`, { ns: 'listing' }));
    }

    if (filters.fuel?.length) {
      chips.push(...filters.fuel.map((fuel) => t(`listing:fuel.${fuel}`, { ns: 'listing' })));
    }

    return chips.slice(0, MAX_CHIPS);
  };
}
