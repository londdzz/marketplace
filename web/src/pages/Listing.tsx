import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { listingsApi } from '../api/listings';
import { Gallery } from '../components/Gallery';
import { Badge, Button, Card, Chip, EmptyState, ErrorState, Spinner } from '../components/ui';
import { formatEur, formatKm, listingLocation, listingTitle } from '../format';
import { useFavorites } from '../hooks/useFavorites';

/**
 * One car.
 *
 * The photographs take the left and everything a buyer decides on takes the
 * right, where it stays in view as they scroll the pictures — the price, the
 * specifications, the seller. On a phone the same content is one column.
 *
 * Messaging lives in the app. The Call button shows the number to somebody
 * signed in, because the API does not send it to a guest, and says so
 * otherwise rather than failing when pressed.
 */
export function ListingPage() {
  const { t } = useTranslation(['listing', 'search', 'common', 'web']);
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const favorites = useFavorites();

  const query = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.show(id),
    enabled: Boolean(id),
  });

  if (query.isLoading) {
    return (
      <div className="page">
        <Spinner />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="page">
        <ErrorState
          title={t('listing:unavailable')}
          actionLabel={t('common:retry')}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const car = query.data;

  if (!car) {
    return (
      <div className="page">
        <EmptyState title={t('listing:unavailable')} description={t('listing:unavailable_body')} />
      </div>
    );
  }

  const specs: [string, string | null][] = [
    [t('listing:year'), car.year ? String(car.year) : null],
    [t('listing:mileage'), car.mileage_km !== null ? formatKm(car.mileage_km) : null],
    [t('listing:fuel_label'), car.fuel ? t(`listing:fuel.${car.fuel}`, car.fuel) : null],
    [t('listing:transmission_label'), car.transmission ? t(`listing:transmission.${car.transmission}`, car.transmission) : null],
    [t('listing:body'), car.body_type ? t(`listing:body_type.${car.body_type}`, car.body_type) : null],
    [t('listing:power'), car.power_hp ? `${car.power_hp} hp` : null],
    [t('listing:drivetrain'), car.drivetrain ? t(`listing:drivetrain_value.${car.drivetrain}`, car.drivetrain) : null],
    [t('listing:color'), car.color ? t(`listing:color_value.${car.color}`, car.color) : null],
    [t('listing:doors'), car.doors ? String(car.doors) : null],
    [t('listing:seats'), car.seats ? String(car.seats) : null],
  ];

  const known = specs.filter(([, value]) => value);
  const favorited = favorites.ids.has(car.id);

  return (
    <div className="page detail">
      <Link to="/search" className="detail__back muted">
        ‹ {t('listing:back_to_search')}
      </Link>

      <div className="detail__grid">
        <div className="detail__left">
          <Gallery photos={car.photos} />

          {car.description ? (
            <Card className="detail__block">
              <h2 className="detail__h2">{t('listing:description')}</h2>
              <p className="detail__text">{car.description}</p>
            </Card>
          ) : null}

          {car.features.length > 0 ? (
            <Card className="detail__block">
              <h2 className="detail__h2">{t('listing:features')}</h2>
              <div className="chips">
                {car.features.map((feature) => (
                  <Chip key={feature} label={t(`listing:feature.${feature}`, feature)} />
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="detail__right">
          <Card className="detail__summary">
            {car.is_featured ? <Badge label={t('search:top')} tone="top" /> : null}

            <h1 className="detail__title">{listingTitle(car)}</h1>
            {car.variant ? <p className="muted">{car.variant}</p> : null}

            <p className="detail__price">{formatEur(car.price_eur)}</p>
            {car.price_negotiable ? <p className="subtle">{t('listing:negotiable')}</p> : null}

            <p className="muted detail__place">{listingLocation(car)}</p>

            <div className="detail__actions">
              {car.seller?.phone ? (
                <Button size="lg" block onClick={() => (window.location.href = `tel:${car.seller?.phone}`)}>
                  {t('listing:call')} · {car.seller.phone}
                </Button>
              ) : (
                <Button size="lg" block variant="secondary" onClick={() => navigate('/sign-in')}>
                  {t('listing:sign_in_to_call')}
                </Button>
              )}

              <Button
                variant="secondary"
                block
                onClick={() => (favorites.signedIn ? favorites.toggle(car) : navigate('/sign-in'))}
              >
                {favorited ? '♥' : '♡'} {t('search:park')}
              </Button>
            </div>

            {/* Messaging is the app's, and the site says which rather than
                drawing a button that cannot do anything. */}
            <p className="subtle detail__appnote">
              {t('listing:message')} — {t('web:app_only')}
            </p>
          </Card>

          {known.length > 0 ? (
            <Card className="detail__block">
              <h2 className="detail__h2">{t('listing:specs')}</h2>
              <dl className="specs">
                {known.map(([label, value]) => (
                  <div key={label} className="specs__row">
                    <dt className="muted">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}

          {car.seller ? (
            <Card className="detail__block">
              <h2 className="detail__h2">{t('listing:seller')}</h2>
              <p>{car.seller.display_name ?? t('listing:private')}</p>
              <p className="subtle">
                {car.seller.seller_type === 'dealer' ? t('listing:dealer') : t('listing:private')}
              </p>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
