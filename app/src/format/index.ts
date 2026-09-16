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
 * A price that carries cents, written the way the region writes it: a comma
 * before the cents. Car prices are whole euro and use formatEur; credit packs
 * are 1.50 and 9.99, and rounding those would show the buyer a price that is
 * not what the store charges.
 */
export function formatEurExact(amount: string | number | null): string {
  if (amount === null) {
    return '';
  }

  const value = Number(amount);
  const whole = Math.trunc(value);
  const cents = Math.round((value - whole) * 100);

  return cents === 0 ? `${groups(whole)} €` : `${groups(whole)},${String(cents).padStart(2, '0')} €`;
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
