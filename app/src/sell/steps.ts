import type { Listing } from '../api/types';

/**
 * The sell flow, in order.
 *
 * One decision per screen, but the seller is told how far along they are in
 * terms of the seven things a listing needs, not the twelve screens it takes to
 * collect them: "step 2 of 7" while answering year, kilometres, fuel, gearbox
 * and shape is honest, "step 5 of 12" just looks longer than it is.
 */
export type SellScreen =
  | 'make'
  | 'model'
  | 'year'
  | 'mileage'
  | 'fuel'
  | 'transmission'
  | 'shape'
  | 'photos'
  | 'price'
  | 'location'
  | 'description'
  | 'review';

export const SELL_SCREENS: SellScreen[] = [
  'make',
  'model',
  'year',
  'mileage',
  'fuel',
  'transmission',
  'shape',
  'photos',
  'price',
  'location',
  'description',
  'review',
];

/** Which of the seven steps a screen belongs to. */
const STEP_OF: Record<SellScreen, number> = {
  make: 1,
  model: 1,
  year: 2,
  mileage: 2,
  fuel: 2,
  transmission: 2,
  shape: 2,
  photos: 3,
  price: 4,
  location: 5,
  description: 6,
  review: 7,
};

export const TOTAL_STEPS = 7;

export function stepOf(screen: SellScreen): number {
  return STEP_OF[screen];
}

export function pathTo(screen: SellScreen): string {
  return `/sell/${screen}`;
}

export function nextScreen(screen: SellScreen): SellScreen | null {
  const index = SELL_SCREENS.indexOf(screen);

  return index >= 0 && index < SELL_SCREENS.length - 1 ? SELL_SCREENS[index + 1] : null;
}

/**
 * How far through the flow a screen is, as a fraction, for the bar across the
 * top. It counts screens rather than steps so the bar always moves when the
 * seller answers something, which steps alone would not do.
 */
export function progressOf(screen: SellScreen): number {
  return (SELL_SCREENS.indexOf(screen) + 1) / SELL_SCREENS.length;
}

/**
 * The field names the API returns in a 422 when a listing is not ready, mapped
 * to the screen that collects them, so the review step can send the seller
 * straight back to what is missing.
 */
const SCREEN_FOR_FIELD: Record<string, SellScreen> = {
  make_id: 'make',
  model_id: 'model',
  year: 'year',
  mileage_km: 'mileage',
  fuel: 'fuel',
  transmission: 'transmission',
  photos: 'photos',
  price_eur: 'price',
  country_code: 'location',
  city_id: 'location',
};

export function screenForField(field: string): SellScreen | null {
  return SCREEN_FOR_FIELD[field] ?? null;
}

/**
 * The same completeness check the API makes, so the review screen can show what
 * is still missing before the seller presses Publish rather than after.
 *
 * The API decides — this is only ever a preview of its answer.
 */
export function missingForPublish(listing: Listing | null, minPhotos: number): string[] {
  if (!listing) {
    return Object.keys(SCREEN_FOR_FIELD);
  }

  const missing: string[] = [];

  if (!listing.make) missing.push('make_id');
  if (!listing.model) missing.push('model_id');
  if (!listing.year) missing.push('year');
  if (listing.mileage_km === null) missing.push('mileage_km');
  if (!listing.fuel) missing.push('fuel');
  if (!listing.transmission) missing.push('transmission');
  if (!listing.price_eur) missing.push('price_eur');
  if (!listing.country_code) missing.push('country_code');
  if (!listing.city) missing.push('city_id');
  if ((listing.photo_count ?? listing.photos.length) < minPhotos) missing.push('photos');

  return missing;
}
