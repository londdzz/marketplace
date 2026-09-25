import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { blocksApi } from '../api/blocks';
import { listingsApi } from '../api/listings';
import { messagingApi } from '../api/messaging';
import { useAuth } from '../auth/AuthProvider';
import { Gallery } from '../components/Gallery';
import { Badge, Button, Card, Chip, Dialog, EmptyState, ErrorState, Spinner } from '../components/ui';
import { formatEur, formatKm, listingLocation, listingTitle } from '../format';
import { useFavorites } from '../hooks/useFavorites';

/**
 * The reasons the API accepts, in the order a buyer is likely to want them:
 * the ones about the advert first, the ones about the seller after. The same
 * order the app puts them in.
 */
const REPORT_REASONS = ['sold', 'duplicate', 'wrong_category', 'scam_suspected', 'offensive', 'other'] as const;

/**
 * One car.
 *
 * The photographs take the left and everything a buyer decides on takes the
 * right, where it stays in view as they scroll the pictures — the price, the
 * specifications, the seller. On a phone the same content is one column.
 *
 * Message, Call, Report and Block all need an account, and each says so on
 * the button rather than being hidden or failing when pressed — the API does
 * not send a guest the seller's number, so "Sign in to call" is what pressing
 * that button will actually do.
 */
export function ListingPage() {
  const { t } = useTranslation(['listing', 'search', 'common', 'web', 'messages']);
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const favorites = useFavorites();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [asking, setAsking] = useState<'report' | 'block' | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reported, setReported] = useState(false);

  // Asking twice reopens the same thread rather than starting another, so the
  // button needs no state of its own.
  const message = useMutation({
    mutationFn: () => messagingApi.start(id),
    onSuccess: (conversation) => navigate(`/messages/${conversation.id}`),
  });

  const report = useMutation({
    mutationFn: () => listingsApi.report(id, reason as string, note.trim() || undefined),
    onSuccess: () => {
      setAsking(null);
      setReported(true);
    },
  });

  const block = useMutation({
    mutationFn: (userId: number) => blocksApi.block(userId),
    onSuccess: () => {
      setAsking(null);
      navigate('/search');
      // This listing is now one the API will not serve us, so it is dropped
      // rather than refetched — asking again would answer 403 and paint an
      // error over a page we have already left. Everything else is only
      // stale: their cars have to leave the lists they are still in.
      queryClient.removeQueries({ queryKey: ['listing', id] });
      void queryClient.invalidateQueries();
    },
  });

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
    [t('listing:fuel_label'), car.fuel ? t(`listing:fuel.${car.fuel}`) : null],
    [t('listing:transmission_label'), car.transmission ? t(`listing:transmission.${car.transmission}`) : null],
    [t('listing:body'), car.body_type ? t(`listing:body_type.${car.body_type}`) : null],
    [t('listing:power'), car.power_hp ? `${car.power_hp} hp` : null],
    [t('listing:drivetrain'), car.drivetrain ? t(`listing:drivetrain_value.${car.drivetrain}`) : null],
    [t('listing:color'), car.color ? t(`listing:color_value.${car.color}`) : null],
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
                  <Chip key={feature} label={t(`listing:feature.${feature}`)} />
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

            {/* Reaching the seller is what this page is for, so it is the one
                azure thing on it. Three identical buttons in a column made the
                shortlist look as important as the telephone number. */}
            <div className="detail__actions">
              {car.seller?.phone ? (
                <Button size="lg" block onClick={() => (window.location.href = `tel:${car.seller?.phone}`)}>
                  {t('listing:call')} · {car.seller.phone}
                </Button>
              ) : (
                <Button size="lg" block onClick={() => navigate('/sign-in')}>
                  {t('listing:sign_in_to_call')}
                </Button>
              )}

              <div className="detail__row">
                <Button
                  variant="secondary"
                  block
                  loading={message.isPending}
                  onClick={() => (user ? message.mutate() : navigate('/sign-in'))}
                >
                  {t('listing:message')}
                </Button>

                <Button
                  variant="secondary"
                  className={`detail__save ${favorited ? 'is-on' : ''}`}
                  aria-pressed={favorited}
                  aria-label={t('search:park')}
                  title={t('search:park')}
                  onClick={() => (favorites.signedIn ? favorites.toggle(car) : navigate('/sign-in'))}
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
                </Button>
              </div>
            </div>
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

              {/* A seller who gave no name falls back to what kind of seller
                  they are, which is the line below — printing both said
                  "Private seller" twice. */}
              {car.seller.dealer_name ?? car.seller.display_name ? (
                <p>{car.seller.dealer_name ?? car.seller.display_name}</p>
              ) : null}

              <p className="subtle">
                {car.seller.seller_type === 'dealer' ? t('listing:dealer') : t('listing:private')}
              </p>

              {/* Neither is an action anybody came for, and neither is
                  hidden. Reporting is not blocking: one asks us to look, the
                  other takes them out of the way now. */}
              <div className="detail__quiet">
                <button type="button" onClick={() => (user ? setAsking('report') : navigate('/sign-in'))}>
                  {reported ? t('listing:report_thanks') : t('listing:report')}
                </button>
                <button type="button" onClick={() => (user ? setAsking('block') : navigate('/sign-in'))}>
                  {t('listing:block_seller')}
                </button>
              </div>
            </Card>
          ) : null}
        </aside>
      </div>

      {asking === 'report' ? (
        <Dialog
          title={t('listing:report_title')}
          description={t('listing:report_body')}
          onClose={() => setAsking(null)}
        >
          <div className="reasons">
            {REPORT_REASONS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={reason === value}
                onClick={() => setReason(value)}
              >
                {t(`listing:report_reason_${value}`)}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field__label">{t('listing:report_note')}</span>
            <textarea
              className="input"
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <span className="field__hint">{t('listing:report_note_hint')}</span>
          </label>

          {report.isError ? <p className="field__error">{(report.error as Error).message}</p> : null}

          <div className="dialog__actions">
            <Button variant="ghost" onClick={() => setAsking(null)}>
              {t('common:cancel')}
            </Button>
            <Button disabled={!reason} loading={report.isPending} onClick={() => report.mutate()}>
              {t('listing:report_send')}
            </Button>
          </div>
        </Dialog>
      ) : null}

      {asking === 'block' ? (
        <Dialog
          title={t('listing:block_title')}
          description={t('listing:block_body')}
          onClose={() => setAsking(null)}
        >
          {block.isError ? <p className="field__error">{(block.error as Error).message}</p> : null}

          <div className="dialog__actions">
            <Button variant="ghost" onClick={() => setAsking(null)}>
              {t('common:cancel')}
            </Button>
            <Button
              variant="danger"
              loading={block.isPending}
              onClick={() => car.seller && block.mutate(car.seller.id)}
            >
              {t('listing:block_confirm')}
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
