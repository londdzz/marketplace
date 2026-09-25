import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { blocksApi } from '../api/blocks';
import { listingsApi } from '../api/listings';
import type { Listing } from '../api/types';
import { creditsApi, sellApi } from '../api/sell';
import { useAuth } from '../auth/AuthProvider';
import { PromoteDialog } from '../components/PromoteDialog';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Select, Spinner } from '../components/ui';
import { formatEur, formatEurExact } from '../format';
import i18n, { SUPPORTED_LANGUAGES, setLanguage, type Language } from '../i18n';
import { toQuery } from '../search/query';

/** Whole days from now until a listing runs out, never below zero. */
function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();

  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** Everything behind an account needs one, and says so rather than failing. */
function NeedsAccount({ title }: { title: string }) {
  const { t } = useTranslation(['web', 'auth']);
  const navigate = useNavigate();

  return (
    <div className="page">
      <EmptyState
        heading
        title={title}
        description={t('web:sign_in_body')}
        actionLabel={t('auth:sign_in')}
        onAction={() => navigate('/sign-in')}
      />
    </div>
  );
}

/**
 * The seller's own cars.
 *
 * The same list the app's My listings is, off the same endpoint, so a car
 * published on a phone is here the moment the page loads. Renew and Mark sold
 * are here because they are one click and a seller at a keyboard should not
 * have to find their phone for them.
 */
export function MyListings() {
  const { t } = useTranslation(['sell', 'listing', 'common', 'web', 'search']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<Listing | null>(null);

  const listings = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => sellApi.myListings(),
    enabled: Boolean(user),
  });

  const act = useMutation({
    mutationFn: async ({ id, what }: { id: string; what: 'renew' | 'sold' }) => {
      setBusy(id);

      if (what === 'renew') {
        await sellApi.renew(id);
      } else {
        await sellApi.markSold(id);
      }
    },
    onSettled: () => {
      setBusy(null);
      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });

  if (!user) {
    return <NeedsAccount title={t('sell:my_listings')} />;
  }

  const rows = listings.data?.data ?? [];

  return (
    <div className="page saved">
      <div className="saved__head">
        <h1 className="saved__title">{t('sell:my_listings')}</h1>
        <Link to="/sell">
          <Button>{t('sell:new_listing')}</Button>
        </Link>
      </div>

      {listings.isLoading ? (
        <Spinner />
      ) : listings.isError ? (
        <ErrorState
          title={t('common:error_loading')}
          actionLabel={t('common:retry')}
          onRetry={() => void listings.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t('sell:no_listings')}
          description={t('sell:no_listings_body')}
          actionLabel={t('sell:new_listing')}
          to="/sell"
        />
      ) : (
        <div className="mine">
          {rows.map((listing) => (
            <Card key={listing.id} className="mine__row">
              <Link to={`/listing/${listing.id}`} className="mine__photo">
                {listing.photos[0] ? (
                  <img src={listing.photos[0].thumb_url ?? listing.photos[0].url} alt="" loading="lazy" />
                ) : (
                  <span className="mine__nophoto" />
                )}
              </Link>

              <div className="mine__body">
                <div className="row mine__titlerow">
                  <Link to={`/listing/${listing.id}`} className="mine__title">
                    {[listing.make?.name, listing.model?.name].filter(Boolean).join(' ')}
                  </Link>
                  <Badge
                    label={t(`sell:status_${listing.status}`)}
                    tone={listing.status === 'active' ? 'accent' : 'neutral'}
                  />
                </div>
                <p className="mine__price">{formatEur(listing.price_eur)}</p>
                {/* Days left, counted as the app counts them, rather than a
                    date the seller has to subtract from today. A draft has
                    neither, and an empty line is a gap nobody asked for. */}
                {listing.featured_until ? (
                  <p className="subtle mine__top">
                    {t('sell:promoted_until', {
                      date: new Date(listing.featured_until).toLocaleDateString(i18n.language, {
                        day: 'numeric',
                        month: 'short',
                      }),
                    })}
                  </p>
                ) : null}

                {listing.expires_at || listing.view_count ? (
                  <p className="subtle mine__meta">
                    {[
                      listing.expires_at ? t('sell:expires_in', { count: daysLeft(listing.expires_at) }) : null,
                      listing.view_count ? t('listing:views', { count: listing.view_count }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>

              <div className="mine__actions">
                {listing.status === 'draft' ? (
                  <Link to={`/sell?draft=${listing.id}`}>
                    <Button variant="secondary" size="sm">
                      {t('common:continue')}
                    </Button>
                  </Link>
                ) : null}

                {listing.status === 'active' || listing.status === 'expired' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={busy === listing.id && act.isPending}
                    onClick={() => act.mutate({ id: listing.id, what: 'renew' })}
                  >
                    {t('sell:renew')}
                  </Button>
                ) : null}

                {listing.status === 'active' ? (
                  <Button variant="secondary" size="sm" onClick={() => setPromoting(listing)}>
                    {t('sell:promote')}
                  </Button>
                ) : null}

                {listing.status === 'active' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => act.mutate({ id: listing.id, what: 'sold' })}
                  >
                    {t('sell:sold')}
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {promoting ? <PromoteDialog listing={promoting} onClose={() => setPromoting(null)} /> : null}
    </div>
  );
}

/**
 * The credit balance and the ledger behind it.
 *
 * Credits are spent here — publishing and renewing both do — but they cannot
 * be bought here. Both stores require digital goods used inside an app to be
 * sold through their own purchase, so the packs are listed with their prices
 * and the buying happens on the phone. Saying so is better than a button that
 * would get the app rejected.
 */
export function Credits() {
  const { t } = useTranslation(['profile', 'sell', 'common', 'web']);
  const { user } = useAuth();

  const credits = useQuery({
    queryKey: ['credits'],
    queryFn: () => creditsApi.read(),
    enabled: Boolean(user),
  });

  if (!user) {
    return <NeedsAccount title={t('web:credits')} />;
  }

  const data = credits.data;

  return (
    <div className="page saved">
      <h1 className="saved__title">{t('web:credits')}</h1>

      {credits.isLoading ? (
        <Spinner />
      ) : credits.isError ? (
        <ErrorState
          title={t('common:error_loading')}
          actionLabel={t('common:retry')}
          onRetry={() => void credits.refetch()}
        />
      ) : data ? (
        <>
          <Card className="balance">
            <p className="subtle">{t('web:balance')}</p>
            <p className="balance__n">{data.balance}</p>
            <p className="muted balance__note">{t('web:credits_app_only')}</p>
            <div className="balance__packs">
              {data.packs.map((pack) => (
                <div key={pack.product_id} className="balance__pack">
                  <span>{t('sell:credits_count', { count: pack.credits })}</span>
                  <span className="muted">{t('sell:credits_listings', { count: pack.credits })}</span>
                  <span className="subtle">{formatEurExact(pack.price_eur)}</span>
                </div>
              ))}
            </div>
          </Card>

          {data.history.data.length > 0 ? (
            <Card className="detail__block ledger">
              <h2 className="detail__h2">{t('web:credit_history')}</h2>
              <table className="ledger__table">
                <tbody>
                  {data.history.data.map((row) => (
                    <tr key={row.id}>
                      <td className="muted">{t(`sell:reason_${row.reason}`)}</td>
                      <td className="subtle">
                        {/* Named month, because bare numbers put the day
                            first in Macedonian and second in English and a
                            ledger must not be ambiguous about when. */}
                        {row.created_at
                          ? new Date(row.created_at).toLocaleDateString(i18n.language, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : ''}
                      </td>
                      <td className={row.delta > 0 ? 'ledger__up' : 'ledger__down'}>
                        {row.delta > 0 ? `+${row.delta}` : row.delta}
                      </td>
                      <td className="subtle">{row.balance_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** The searches a buyer kept, run again with one click. */
export function SavedSearches() {
  const { t } = useTranslation(['search', 'common', 'web', 'profile']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const searches = useQuery({
    queryKey: ['saved-searches'],
    queryFn: () => listingsApi.savedSearches(),
    enabled: Boolean(user),
  });

  const remove = useMutation({
    mutationFn: (id: string) => listingsApi.deleteSavedSearch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  if (!user) {
    return <NeedsAccount title={t('web:nav_searches')} />;
  }

  const rows = searches.data ?? [];

  return (
    <div className="page saved">
      <h1 className="saved__title">{t('web:nav_searches')}</h1>

      {searches.isLoading ? (
        <Spinner />
      ) : searches.isError ? (
        <ErrorState
          title={t('common:error_loading')}
          actionLabel={t('common:retry')}
          onRetry={() => void searches.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t('search:saved_empty_title')}
          description={t('search:saved_empty_body')}
          actionLabel={t('web:nav_search')}
          to="/search"
        />
      ) : (
        <div className="mine">
          {rows.map((row) => (
            <Card key={row.id} className="mine__row mine__row--plain">
              <div className="mine__body">
                <p className="mine__title">{row.name ?? t('search:saved_everything')}</p>
                <p className="subtle">
                  {row.notify ? t('search:saved_alerts_on') : t('search:guest_alerts_off')}
                </p>
              </div>
              <div className="mine__actions">
                {/* Runs exactly as it did the day it was saved. */}
                <Button size="sm" onClick={() => navigate(`/search?${toQuery(row.filters)}`)}>
                  {t('search:results')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={remove.isPending}
                  onClick={() => remove.mutate(row.id)}
                >
                  {t('search:saved_delete_title')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Name, kind of seller, language, and the way out. */
export function Profile() {
  const { t } = useTranslation(['profile', 'common', 'web', 'auth']);
  const { user, refresh, signOut } = useAuth();
  const [name, setName] = useState(user?.display_name ?? '');
  const [isDealer, setIsDealer] = useState(user?.seller_type === 'dealer');
  const [dealerName, setDealerName] = useState(user?.dealer_name ?? '');
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      authApi.updateMe({
        display_name: name.trim() === '' ? null : name.trim(),
        seller_type: isDealer ? 'dealer' : 'private',
        dealer_name: isDealer ? (dealerName.trim() === '' ? null : dealerName.trim()) : null,
      }),
    onSuccess: async () => {
      setSaved(true);
      await refresh();
    },
  });

  /**
   * The language belongs to the account, not to this browser: the app reads
   * preferred_language on every launch, so a switch here has to follow the
   * person onto their phone. It changes the page first and saves after,
   * because waiting on a request to redraw a menu would feel broken.
   */
  const chooseLanguage = (language: Language) => {
    setLanguage(language);

    if (user) {
      void authApi.updateMe({ preferred_language: language }).then(() => refresh());
    }
  };

  const fieldError = (field: string) =>
    save.error instanceof ApiError ? save.error.fieldError(field) : undefined;

  if (!user) {
    return <NeedsAccount title={t('profile:title')} />;
  }

  return (
    <div className="page legal">
      <h1>{t('profile:title')}</h1>

      <Card className="legal__card">
        <Field
          label={t('profile:display_name')}
          hint={t('profile:display_name_hint')}
          error={fieldError('display_name')}
        >
          <Input
            value={name}
            placeholder={t('profile:display_name_placeholder')}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
          />
        </Field>

        <label className="sell__check">
          <input
            type="checkbox"
            checked={isDealer}
            onChange={(event) => {
              setIsDealer(event.target.checked);
              setSaved(false);
            }}
          />
          {t('profile:dealer')}
        </label>

        {isDealer ? (
          <Field label={t('profile:dealer_name')} error={fieldError('dealer_name')}>
            <Input
              value={dealerName}
              placeholder={t('profile:dealer_name_placeholder')}
              onChange={(event) => {
                setDealerName(event.target.value);
                setSaved(false);
              }}
            />
          </Field>
        ) : null}

        <Field label={t('auth:phone_label')} hint={t('profile:phone_fixed')}>
          <Input value={user.phone ?? ''} disabled />
        </Field>

        <Field label={t('profile:language')}>
          <Select
            value={i18n.language}
            onChange={(event) => chooseLanguage(event.target.value as Language)}
          >
            {SUPPORTED_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {t(`profile:language_${code}`)}
              </option>
            ))}
          </Select>
        </Field>

        {save.isError && !fieldError('display_name') && !fieldError('dealer_name') ? (
          <p className="field__error">{(save.error as Error).message}</p>
        ) : null}

        <div className="legal__actions">
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            {saved ? `${t('common:save')} ✓` : t('common:save')}
          </Button>
          <Link to="/blocked">
            <Button variant="secondary">{t('profile:blocked')}</Button>
          </Link>
          <Button variant="secondary" onClick={() => void signOut()}>
            {t('profile:sign_out')}
          </Button>
          <Link to="/delete-account">
            <Button variant="ghost">{t('profile:delete_account')}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

/**
 * Everyone this account has blocked, and the way back.
 *
 * Blocking hides, it never deletes, so unblocking gives all of it back —
 * their cars return to the search and the thread is where it was. The list
 * exists so that is a decision somebody can change their mind about rather
 * than one they have to live with.
 */
export function Blocked() {
  const { t } = useTranslation(['profile', 'common', 'listing']);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const blocked = useQuery({
    queryKey: ['blocks'],
    queryFn: () => blocksApi.list(),
    enabled: Boolean(user),
  });

  const unblock = useMutation({
    mutationFn: (userId: number) => blocksApi.unblock(userId),
    // Their cars come back into every list the moment this lands.
    onSuccess: () => void queryClient.invalidateQueries(),
  });

  if (!user) {
    return <NeedsAccount title={t('profile:blocked')} />;
  }

  const rows = blocked.data?.data ?? [];

  return (
    <div className="page saved">
      <h1 className="saved__title">{t('profile:blocked')}</h1>
      <p className="muted">{t('profile:blocked_hint')}</p>

      {blocked.isLoading ? (
        <Spinner />
      ) : blocked.isError ? (
        <ErrorState
          title={t('common:error_loading')}
          actionLabel={t('common:retry')}
          onRetry={() => void blocked.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState title={t('profile:blocked_empty')} description={t('profile:blocked_empty_body')} />
      ) : (
        <div className="mine">
          {rows.map((row) => (
            <Card key={row.id} className="mine__row mine__row--plain">
              <div className="mine__body">
                <p className="mine__title">
                  {row.dealer_name ?? row.display_name ?? t('profile:blocked_someone')}
                </p>
                <p className="subtle">
                  {row.seller_type === 'dealer' ? t('listing:dealer') : t('listing:private')}
                </p>
              </div>

              <div className="mine__actions">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={unblock.isPending && unblock.variables === row.id}
                  onClick={() => unblock.mutate(row.id)}
                >
                  {t('profile:unblock')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
