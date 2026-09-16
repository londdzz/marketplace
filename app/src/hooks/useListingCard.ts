import { useTranslation } from 'react-i18next';

import type { Listing } from '../api/types';
import type { ListingCardData } from '../components';
import { formatEur, formatKm, formatLocal, listingLocation, listingTitle } from '../format';
import { SHOW_LOCAL_CURRENCY } from '../market';

/**
 * Turns a listing from the API into what a card needs to draw, in the reader's
 * language and with the price converted for their market.
 */
export function useListingCardMapper(
  rates: Record<string, string>,
  currencyFor: (countryCode: string | null) => string,
  favorites: Set<string> = new Set(),
) {
  const { t } = useTranslation(['home', 'listing']);

  return (listing: Listing): ListingCardData => {
    const currency = currencyFor(listing.country_code);

    return {
      id: listing.id,
      title: listingTitle(listing),
      priceEur: formatEur(listing.price_eur),
      priceNote: SHOW_LOCAL_CURRENCY
        ? formatLocal(listing.price_eur, currency, rates[currency])
        : undefined,
      specs: [
        listing.year ? String(listing.year) : null,
        listing.fuel ? t(`listing:fuel.${listing.fuel}`, listing.fuel) : null,
        listing.mileage_km !== null ? formatKm(listing.mileage_km) : null,
        listing.transmission ? t(`listing:transmission.${listing.transmission}`, listing.transmission) : null,
      ].filter((value): value is string => value !== null),
      photoUrl: listing.photos?.[0]?.thumb_url,
      location: listingLocation(listing),
      featured: listing.is_featured,
      featuredLabel: listing.is_featured ? t('home:special_offer') : undefined,
      crossBorder: false,
      favorited: favorites.has(listing.id),
    };
  };
}
