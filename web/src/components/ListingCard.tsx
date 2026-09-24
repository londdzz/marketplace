import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { Listing } from '../api/types';
import { formatEur, formatKm, listingLocation, listingTitle } from '../format';
import { Badge } from './ui';

/**
 * One car in a results grid.
 *
 * The price is the largest element, as it is on the app's card and on every
 * marketplace worth the name — it is the first thing anyone compares. One
 * quiet metadata line rather than chips that wrap and make every card a
 * different height.
 */
export function ListingCard({
  listing,
  favorited,
  onToggleFavorite,
}: {
  listing: Listing;
  favorited?: boolean;
  onToggleFavorite?: () => void;
}) {
  const { t } = useTranslation(['listing', 'search', 'common']);
  const photo = listing.photos[0];

  const facts = [
    listing.year,
    listing.mileage_km !== null ? formatKm(listing.mileage_km) : null,
    listing.transmission ? t(`listing:transmission.${listing.transmission}`, listing.transmission) : null,
    listing.fuel ? t(`listing:fuel.${listing.fuel}`, listing.fuel) : null,
  ].filter(Boolean);

  return (
    <article className="listing-card">
      <Link to={`/listing/${listing.id}`} className="listing-card__link">
        <div className="listing-card__photo">
          {photo ? (
            <img src={photo.thumb_url ?? photo.url} alt="" loading="lazy" />
          ) : (
            <div className="listing-card__nophoto" aria-hidden="true" />
          )}
          {listing.is_featured ? (
            <span className="listing-card__ribbon">
              <Badge label={t('search:top')} tone="top" />
            </span>
          ) : null}
        </div>

        <div className="listing-card__body">
          <p className="listing-card__price">{formatEur(listing.price_eur)}</p>
          <h3 className="listing-card__title">{listingTitle(listing)}</h3>
          {listing.variant ? <p className="listing-card__variant muted">{listing.variant}</p> : null}
          <p className="listing-card__facts muted">{facts.join(' · ')}</p>
          <p className="listing-card__place subtle">{listingLocation(listing)}</p>
        </div>
      </Link>

      {onToggleFavorite ? (
        <button
          type="button"
          className={`listing-card__heart ${favorited ? 'is-on' : ''}`}
          aria-pressed={favorited}
          aria-label={t('listing:favorite')}
          onClick={onToggleFavorite}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 21s-7.5-4.7-9.5-9A5.2 5.2 0 0 1 12 6.5 5.2 5.2 0 0 1 21.5 12c-2 4.3-9.5 9-9.5 9Z"
              fill={favorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </article>
  );
}
