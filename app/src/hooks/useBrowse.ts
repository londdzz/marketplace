import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { BrowseCollection } from '../api/reference';
import { referenceApi } from '../api/reference';
import type { SearchFilters, VehicleType } from '../api/types';
import type { CollectionArt } from '../components/CollectionCard';
import { formatEur, formatKm } from '../format';

/**
 * The key every screen reads the browse sections under.
 *
 * One cache entry per kind of vehicle: the collections are different lists and
 * every count is measured against listings of that kind alone.
 */
export const BROWSE_KEY = (type: VehicleType = 'car') => ['browse', type] as const;

/** It moves only as fast as listings are published, and the API caches an hour. */
const STALE_MS = 15 * 60 * 1000;

export function useBrowse(type: VehicleType = 'car') {
  return useQuery({
    queryKey: BROWSE_KEY(type),
    queryFn: () => referenceApi.browse(type),
    staleTime: STALE_MS,
  });
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
  city: 'business-outline',
  automatic: 'options-outline',
  electrified: 'flash-outline',
  first_bike: 'school-outline',
  two_wheel_commuter: 'subway-outline',
  adventure: 'trail-sign-outline',
  cruisers: 'flame-outline',
  track: 'speedometer-outline',
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
  premium: {
    background: require('../../assets/collections/premium-bg.jpg'),
    car: require('../../assets/collections/premium-car.png'),
    carRatio: 0.453,
  },
  city: {
    background: require('../../assets/collections/city-bg.jpg'),
    car: require('../../assets/collections/city-car.png'),
    carRatio: 0.59,
  },
};

export function collectionArt(key: string): CollectionArt | null {
  return ART[key] ?? null;
}

/**
 * A cut-out car for a body shape, for the shapes that have one.
 *
 * A shape with nothing here keeps its line drawing, so the row is never half
 * a rack of photographs and half a rack of sketches at different heights —
 * `BodyTypeTile` centres both in a box of the same size.
 */
const SHAPE_ART: Record<string, number> = {
  sedan: require('../../assets/shapes/sedan.png'),
  hatchback: require('../../assets/shapes/hatchback.png'),
  estate: require('../../assets/shapes/estate.png'),
  suv: require('../../assets/shapes/suv.png'),
  coupe: require('../../assets/shapes/coupe.png'),
};

export function bodyTypeArt(shape: string, type: VehicleType = 'car'): number | null {
  // Cut-outs are photographs of cars, so they answer for cars alone. A
  // motorcycle shape keeps its drawing, which is what it was drawn for.
  return type === 'car' ? (SHAPE_ART[shape] ?? null) : null;
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

    if (filters.bodyType?.length) {
      chips.push(
        ...filters.bodyType.map((shape) => t(`listing:body_type.${shape}`, { ns: 'listing' })),
      );
    }

    if (filters.fuel?.length) {
      chips.push(...filters.fuel.map((fuel) => t(`listing:fuel.${fuel}`, { ns: 'listing' })));
    }

    return chips.slice(0, MAX_CHIPS);
  };
}
