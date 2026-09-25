import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { listingsApi } from '../api/listings';
import { referenceApi } from '../api/reference';
import type { SearchFilters } from '../api/types';
import { BodyShape } from '../components/BodyShape';
import { ListingCard } from '../components/ListingCard';
import { SearchPanel } from '../components/SearchPanel';
import { Button, ErrorState, Spinner } from '../components/ui';
import { useFavorites } from '../hooks/useFavorites';
import { toQuery } from '../search/query';

const NEWEST: SearchFilters = { sort: 'newest' };
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

  const newest = useQuery({
    queryKey: ['listings', NEWEST, 1],
    queryFn: () => listingsApi.search(NEWEST, 1),
  });

  const browse = useQuery({ queryKey: ['browse'], queryFn: referenceApi.browse });

  const open = (filters: SearchFilters) => navigate(`/search?${toQuery(filters)}`);

  return (
    <>
      <section className="hero">
        <div className="page hero__inner">
          <h1 className="hero__title">{t('web:hero_title')}</h1>
          <p className="hero__sub">{t('web:hero_sub')}</p>

          {/* The search is here, not behind a button. A front page that only
              points at a search is a poster. */}
          <SearchPanel />
        </div>
      </section>

      <div className="page home">
        {(browse.data?.collections.length ?? 0) > 0 ? (
          <section className="home__section">
            <h2 className="home__heading">{t('home:browse_collections')}</h2>

            {/* The name sits on the photograph rather than under it: a picture
                in a box with a caption below reads as a file, and these are
                doors into a search. */}
            <div className="tile-row">
              {browse.data?.collections.map((collection) => (
                <button
                  key={collection.key}
                  type="button"
                  className="tile"
                  onClick={() => open(collection.filters)}
                >
                  {collection.photoUrl ? (
                    <img className="tile__photo" src={collection.photoUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="tile__photo tile__photo--none">
                      <BodyShape shape="sedan" width={120} />
                    </span>
                  )}
                  <span className="tile__text">
                    <span className="tile__name">{t(`home:collection_${collection.key}`)}</span>
                    <span className="tile__count">{t('search:offers', { count: collection.count })}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="home__section">
          <div className="home__header">
            <h2 className="home__heading">{t('home:newest')}</h2>
            <Link to="/search?sort=newest" className="home__all">
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

        {(browse.data?.body_types.length ?? 0) > 0 ? (
          <section className="home__section">
            <h2 className="home__heading">{t('home:browse_body_types')}</h2>

            {/* Drawings, not photographs. Each of these stands for every car
                of its shape, and a photograph means one particular car — the
                row used to be four unrelated cars in four car parks. */}
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
                  onClick={() => open({ bodyType: [shape.key] })}
                >
                  <BodyShape shape={shape.key} width={64} />
                  <span className="shape-tile__name">{t(`listing:body_type.${shape.key}`)}</span>
                  <span className="shape-tile__count">{t('search:offers', { count: shape.count })}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="sellcta">
          <div>
            <h2 className="sellcta__title">{t('web:sell_title')}</h2>
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
