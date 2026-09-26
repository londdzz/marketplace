import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { listingsApi } from '../api/listings';
import { referenceApi } from '../api/reference';
import type { SearchFilters, VehicleType } from '../api/types';
import { BodyShape } from '../components/BodyShape';
import { CollectionCard } from '../components/CollectionCard';
import { ListingCard } from '../components/ListingCard';
import { SearchPanel } from '../components/SearchPanel';
import { PartnerStrip, SponsorBanner, SponsorCarousel } from '../components/Sponsors';
import { Button, EmptyState, ErrorState, Spinner } from '../components/ui';
import { useFavorites } from '../hooks/useFavorites';
import { toQuery } from '../search/query';

const NEWEST: SearchFilters = { sort: 'newest' };

/**
 * The shapes the app has a cut-out car for. Copied into public/ by
 * sync-locales; a shape that is not here keeps the line drawing, which is what
 * every shape had before any of them were photographed.
 */
const SHAPE_ART = new Set(['sedan', 'hatchback', 'estate', 'suv', 'coupe']);
const ON_HOME = 8;

/**
 * The front of the site.
 *
 * The search is the page, not a link to a page — a buyer who knows what they
 * want narrows it in the panel at the top and never scrolls. Below it, for
 * somebody with nothing to type: a way in by need, the newest cars, and a way
 * in by shape.
 *
 * Every count is measured against live listings by the API. A category that
 * says how many cars are behind it is one a buyer can judge before clicking,
 * and an estimate would be a wrong number.
 */
export function Home() {
  const { t } = useTranslation(['web', 'home', 'search', 'listing', 'sell', 'common']);
  const navigate = useNavigate();
  const favorites = useFavorites();

  // The tabs on the panel change the whole page, not just the panel: the
  // collections, the newest list and the shapes are all one catalogue or the
  // other, and a page where only the top half switched would be a page that
  // disagreed with itself.
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');

  const newest = useQuery({
    queryKey: ['listings', NEWEST, vehicleType, 1],
    queryFn: () => listingsApi.search({ ...NEWEST, vehicleType }, 1),
  });

  const browse = useQuery({
    queryKey: ['browse', vehicleType],
    queryFn: () => referenceApi.browse(vehicleType),
  });

  /**
   * Reference data, cached like reference data: a booking changes when one is
   * sold, not while somebody is scrolling. A failure draws nothing rather
   * than an error — a page that said "could not load advertisements" would be
   * telling a buyer about a problem that is not theirs.
   */
  const sponsors = useQuery({
    queryKey: ['sponsors', vehicleType],
    queryFn: () => referenceApi.sponsors(vehicleType),
    staleTime: 30 * 60 * 1000,
  });

  const top = sponsors.data?.home_top[0];

  const open = (filters: SearchFilters) =>
    navigate(`/search?${toQuery({ vehicleType, ...filters })}`);

  return (
    <>
      <section className="hero">
        <div className="page hero__inner">
          {/* The headline follows the tabs too. A page that says "Find your
              next car" over a motorcycle search is a page arguing with
              itself, and the headline is the first thing read. */}
          <h1 className="hero__title">{t(`web:hero_title_${vehicleType}`)}</h1>
          <p className="hero__sub">{t(`web:hero_sub_${vehicleType}`)}</p>

          {/* The search is here, not behind a button. A front page that only
              points at a search is a poster. */}
          <SearchPanel vehicleType={vehicleType} onVehicleTypeChange={setVehicleType} />
        </div>
      </section>

      <div className="page home">
        {/* The wide card, when a sponsor has it. Nothing is drawn in its
            place on the website: unlike the app, the site's own way into
            selling is the New listing button in the header, which is always
            there. */}
        {top ? (
          <section className="home__section">
            <SponsorBanner sponsor={top} />
          </section>
        ) : null}

        {(browse.data?.collections.length ?? 0) > 0 ? (
          <section className="home__section">
            <h2 className="home__heading">{t('home:browse_collections')}</h2>

            <div className="tile-row">
              {browse.data?.collections.map((collection) => (
                <CollectionCard
                  key={collection.key}
                  collection={collection}
                  onOpen={() => open(collection.filters)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="home__section">
          <div className="home__header">
            <h2 className="home__heading">{t(`home:newest_${vehicleType}`)}</h2>
            <Link to={`/search?sort=newest&vehicleType=${vehicleType}`} className="home__all">
              {t('home:show_all')} ›
            </Link>
          </div>

          {newest.isLoading ? (
            <Spinner />
          ) : newest.isError ? (
            <ErrorState
              title={t('common:error_loading')}
              actionLabel={t('common:retry')}
              onRetry={() => void newest.refetch()}
            />
          ) : (newest.data?.data ?? []).length === 0 ? (
            // A heading with a void under it reads as broken. It is the state
            // every new market starts in, so it has to say so and say what to
            // do next, like every other empty list on the site.
            <EmptyState
              title={t('home:newest_empty_title')}
              description={t(`home:newest_empty_${vehicleType}`)}
              actionLabel={t('sell:new_listing')}
              onAction={() => navigate('/sell')}
            />
          ) : (
            <div className="grid">
              {(newest.data?.data ?? []).slice(0, ON_HOME).map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  favorited={favorites.ids.has(listing.id)}
                  onToggleFavorite={
                    favorites.signedIn ? () => favorites.toggle(listing) : () => navigate('/sign-in')
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Under the cars rather than over them, the same as the app. */}
        <SponsorCarousel sponsors={sponsors.data?.home_feed ?? []} />

        {(browse.data?.body_types.length ?? 0) > 0 ? (
          <section className="home__section">
            <h2 className="home__heading">{t('home:browse_body_types')}</h2>

            {/* The app's cut-out cars where there is one, its line drawing
                where there is not — never a photograph of a car in a street,
                because each of these stands for every car of its shape. Both
                sit in a box of the same height, so a mixed row stays level. */}
            <div
              className="shape-row"
              style={{
                gridTemplateColumns: `repeat(${Math.min(browse.data?.body_types.length ?? 1, 6)}, minmax(0, 1fr))`,
              }}
            >
              {browse.data?.body_types.map((shape) => (
                <button
                  key={shape.key}
                  type="button"
                  className="shape-tile"
                  // Drawn but unavailable while nothing is of this shape: a
                  // real `disabled` rather than a class, so the keyboard skips
                  // it and a screen reader says so, and the count stays honest.
                  disabled={shape.count === 0}
                  onClick={() => open({ bodyType: [shape.key] })}
                >
                  <span className="shape-tile__art">
                    {vehicleType === 'car' && SHAPE_ART.has(shape.key) ? (
                      <img src={`/shapes/${shape.key}.png`} alt="" loading="lazy" />
                    ) : (
                      <BodyShape shape={shape.key} vehicleType={vehicleType} width={96} />
                    )}
                  </span>
                  <span className="shape-tile__name">{t(`listing:body_type.${shape.key}`)}</span>
                  <span className="shape-tile__count">{t('search:offers', { count: shape.count })}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* The quiet tier, at the foot: marks rather than a headline, and
            nothing at all when none is booked. */}
        <PartnerStrip partners={sponsors.data?.home_partners ?? []} />

        <section className="sellcta">
          <div>
            <h2 className="sellcta__title">{t(`web:sell_title_${vehicleType}`)}</h2>
            <p className="sellcta__body">{t('web:sell_body')}</p>
          </div>
          <Link to="/sell">
            <Button size="lg" variant="secondary">
              {t('sell:new_listing')}
            </Button>
          </Link>
        </section>
      </div>
    </>
  );
}
