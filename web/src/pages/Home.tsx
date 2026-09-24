import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { listingsApi } from '../api/listings';
import { referenceApi } from '../api/reference';
import type { SearchFilters } from '../api/types';
import { ListingCard } from '../components/ListingCard';
import { Button, Card, ErrorState, Spinner } from '../components/ui';
import { useFavorites } from '../hooks/useFavorites';
import { toQuery } from '../search/query';

const NEWEST: SearchFilters = { sort: 'newest' };
const ON_HOME = 12;

/**
 * The front of the site.
 *
 * The same three ways in the app's home screen offers, in the order it offers
 * them: something to browse for a buyer with nothing to type, then the cars
 * themselves because they are what people came for, then shapes. Every count
 * is measured against live listings by the API — a category that says how many
 * cars are behind it is one a buyer can judge before clicking.
 */
export function Home() {
  const { t } = useTranslation(['web', 'home', 'search', 'listing']);
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
          <p className="hero__sub muted">{t('web:hero_sub')}</p>
          <Button size="lg" onClick={() => navigate('/search')}>
            {t('web:browse_cars')}
          </Button>
        </div>
      </section>

      <div className="page home">
        {(browse.data?.collections.length ?? 0) > 0 ? (
          <section className="home__section">
            <h2 className="home__heading">{t('home:browse_collections')}</h2>
            <div className="tile-row">
              {browse.data?.collections.map((collection) => (
                <button
                  key={collection.key}
                  type="button"
                  className="tile"
                  onClick={() => open(collection.filters)}
                >
                  {collection.photoUrl ? <img src={collection.photoUrl} alt="" loading="lazy" /> : null}
                  <span className="tile__name">
                    {t(`home:collection_${collection.key}`, collection.key)}
                  </span>
                  <span className="tile__count subtle">
                    {t('search:offers', { count: collection.count })}
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
            <div className="tile-row tile-row--small">
              {browse.data?.body_types.map((shape) => (
                <button
                  key={shape.key}
                  type="button"
                  className="tile tile--small"
                  onClick={() => open({ bodyType: [shape.key] })}
                >
                  <span className="tile__name">{t(`listing:body_type.${shape.key}`, shape.key)}</span>
                  <span className="tile__count subtle">{t('search:offers', { count: shape.count })}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* Selling is the app's job, and the site says so rather than drawing
            a button that cannot work: photographs come off a phone. */}
        <Card className="home__sell">
          <div>
            <h2 className="home__heading">{t('web:sell_title')}</h2>
            <p className="muted home__sellbody">{t('web:sell_body')}</p>
          </div>
        </Card>
      </div>
    </>
  );
}
