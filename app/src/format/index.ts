import type { Listing } from '../api/types';

/**
 * Prices, distances and dates as the region writes them: a full stop for
 * thousands and the currency after the number.
 */
const groups = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function formatEur(amount: string | number | null): string {
  if (amount === null) {
    return '';
  }

  return `${groups(Number(amount))} €`;
}

/**
 * The same price in the local currency, converted at display time. Prices are
 * only ever stored in euro.
 */
export function formatLocal(
  amountEur: string | number | null,
  currency: string,
  ratePerEur: string | number | undefined,
): string | undefined {
  if (amountEur === null || ratePerEur === undefined || currency === 'EUR') {
    return undefined;
  }

  return `${groups(Number(amountEur) * Number(ratePerEur))} ${currency}`;
}

export function formatKm(km: number | null): string {
  return km === null ? '' : `${groups(km)} km`;
}

/** Make, model and variant as one line. */
export function listingTitle(listing: Listing): string {
  return [listing.make?.name, listing.model?.name].filter(Boolean).join(' ');
}

export function listingSubtitle(listing: Listing): string | null {
  return listing.variant;
}

export function listingLocation(listing: Listing): string {
  return [listing.city?.name, listing.country_code].filter(Boolean).join(', ');
}
