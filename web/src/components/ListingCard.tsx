import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { Listing } from '../api/types';
import { formatEur, formatKm, listingLocation, listingTitle } from '../format';

/**
 * One car in a results grid.
 *
 * The price is the largest element, as it is on the app's card and on every
 * marketplace worth the name — it is the first thing anyone compares.
 *
 * **Every card is exactly the same height.** It has four lines and always
 * four: title, specification, place, price. The variant used to be a line of
 * its own that only some cars had, so a row of cards came out ragged and the
 * eye had nothing level to run along. It rides on the title line now and is
 * truncated with it, which is also how it reads out loud — "BMW Series 3 320d
 * Touring" is the car's name, not two facts.
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

  const name = [listingTitle(listing), listing.variant].filter(Boolean).join(' ');

  const facts = [
    listing.year,
    listing.mileage_km !== null ? formatKm(listing.mileage_km) : null,
    listing.transmission ? t(`listing:transmission.${listing.transmission}`) : null,
    listing.fuel ? t(`listing:fuel.${listing.fuel}`) : null,
  ].filter(Boolean);

  return (
    <article className="listing-card">
      <Link to={`/listing/${listing.id}`} className="listing-card__link">
        <div className="listing-card__photo">
          {photo ? (
            <img src={photo.thumb_url ?? photo.url} alt="" loading="lazy" />
          ) : (
            <div className="listing-card__nophoto" aria-hidden="true">
              <svg width="44" height="18" viewBox="0 0 64 26" fill="none" aria-hidden="true">
                <path
                  d="M4 17.5c-.4-3.2.2-4.6 1.6-5l6.6-1.2 6.4-4.4c1.3-.9 2.6-1.3 4.2-1.3h11.4c1.7 0 3 .4 4.3 1.3l6.6 4.6 10.6.8c1.6.1 2.1 1.6 1.9 5.2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <circle cx="14" cy="17.6" r="3.4" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="48" cy="17.6" r="3.4" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </div>
          )}

          {/* A promotion is a paid placement, so it sits on the photograph
              where it cannot be mistaken for a fact about the car. */}
          {listing.is_featured ? <span className="listing-card__top">{t('search:top')}</span> : null}
        </div>

        <div className="listing-card__body">
          <h3 className="listing-card__title">{name}</h3>
          <p className="listing-card__facts">{facts.join(' · ')}</p>
          <p className="listing-card__place">{listingLocation(listing)}</p>
          <p className="listing-card__price">{formatEur(listing.price_eur)}</p>
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
