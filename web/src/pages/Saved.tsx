import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ListingCard } from '../components/ListingCard';
import { EmptyState, ErrorState, Spinner } from '../components/ui';
import { useFavorites } from '../hooks/useFavorites';

/** The buyer's shortlist. Signed in only, and the empty state says so. */
export function Saved() {
  const { t } = useTranslation(['profile', 'search', 'common', 'web', 'auth']);
  const navigate = useNavigate();
  const favorites = useFavorites();

  if (!favorites.signedIn) {
    return (
      <div className="page">
        <EmptyState
          heading
          title={t('profile:saved')}
          description={t('web:sign_in_body')}
          actionLabel={t('auth:sign_in')}
          onAction={() => navigate('/sign-in')}
        />
      </div>
    );
  }

  return (
    <div className="page saved">
      <h1 className="saved__title">{t('profile:saved')}</h1>

      {favorites.isLoading ? (
        <Spinner />
      ) : favorites.isError ? (
        <ErrorState
          title={t('common:error_loading')}
          actionLabel={t('common:retry')}
          onRetry={() => void favorites.refetch()}
        />
      ) : favorites.listings.length === 0 ? (
        <EmptyState
          title={t('search:saved_empty_title')}
          description={t('search:saved_empty_body')}
          actionLabel={t('web:nav_search')}
          to="/search"
        />
      ) : (
        <div className="grid">
          {favorites.listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              favorited
              onToggleFavorite={() => favorites.toggle(listing)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
