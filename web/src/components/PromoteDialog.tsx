import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { sellApi } from '../api/sell';
import type { Listing } from '../api/types';
import { Button, Dialog, Spinner } from './ui';

/**
 * Buying a place at the top of the results.
 *
 * The seller sets a budget and everything follows from it: credits become
 * days at the rate the API decides, and time still running is added to rather
 * than overwritten — the same bargain renewing makes, so promoting early is
 * never a punishment.
 *
 * The comparison is measured, never estimated. The API returns the quartiles
 * of what other sellers actually spent, and returns nothing at all until
 * enough have. Where it returns nothing this shows no comparison, because a
 * made-up range would be advice about somebody's money.
 */
export function PromoteDialog({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { t } = useTranslation(['sell', 'common', 'web']);
  const queryClient = useQueryClient();
  const [credits, setCredits] = useState<number | null>(null);

  const options = useQuery({
    queryKey: ['promotion', listing.id],
    queryFn: () => sellApi.promotionOptions(listing.id),
  });

  // Open on what most sellers spend where that is known, and on the smallest
  // budget where it is not.
  useEffect(() => {
    if (options.data && credits === null) {
      setCredits(options.data.typical?.median ?? options.data.min_credits);
    }
  }, [options.data, credits]);

  const promote = useMutation({
    mutationFn: () => sellApi.promote(listing.id, credits as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
      onClose();
    },
  });

  const data = options.data;
  const chosen = credits ?? data?.min_credits ?? 1;
  const short = data ? Math.max(0, chosen - data.balance) : 0;

  /** Where this budget stands against what other sellers spent. */
  const standing = (() => {
    if (!data?.typical) {
      return null;
    }

    if (chosen < data.typical.low) {
      return t('sell:promote_standing_below');
    }

    return chosen > data.typical.high
      ? t('sell:promote_standing_above')
      : t('sell:promote_standing_typical');
  })();

  return (
    <Dialog title={t('sell:promote_title')} description={t('sell:promote_body')} onClose={onClose}>
      {options.isLoading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="promote">
            <Button
              variant="secondary"
              size="sm"
              aria-label={t('sell:promote_less')}
              disabled={chosen <= data.min_credits}
              onClick={() => setCredits(Math.max(data.min_credits, chosen - 1))}
            >
              −
            </Button>

            <div className="promote__figure">
              <p className="promote__credits">{t('sell:promote_credits', { count: chosen })}</p>
              <p className="subtle">{t('sell:promote_days', { count: chosen * data.days_per_credit })}</p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              aria-label={t('sell:promote_more')}
              disabled={chosen >= data.max_credits}
              onClick={() => setCredits(Math.min(data.max_credits, chosen + 1))}
            >
              +
            </Button>
          </div>

          {standing ? (
            <p className="promote__standing">
              {standing}
              {data.typical ? (
                <span className="subtle">
                  {' · '}
                  {t('sell:promote_standing_range', { low: data.typical.low, high: data.typical.high })}
                </span>
              ) : null}
            </p>
          ) : null}

          <p className="muted">{t('sell:promote_balance', { count: data.balance })}</p>

          {promote.isError ? <p className="field__error">{(promote.error as Error).message}</p> : null}

          <div className="dialog__actions">
            <Button variant="ghost" onClick={onClose}>
              {t('common:cancel')}
            </Button>
            {/* Nothing to press when the balance is short, and a disabled
                azure button would be the loudest thing in the dialogue while
                being the one thing that cannot be used. */}
            <Button
              variant={short > 0 ? 'secondary' : 'primary'}
              loading={promote.isPending}
              disabled={short > 0}
              onClick={() => promote.mutate()}
            >
              {short > 0
                ? t('sell:promote_short', { count: short })
                : t('sell:promote_confirm', { count: chosen })}
            </Button>
          </div>

          {/* Credits cannot be bought here, so a seller who is short is told
              where to go rather than shown a button that fails. */}
          {short > 0 ? <p className="subtle">{t('web:credits_app_only')}</p> : null}
        </>
      )}
    </Dialog>
  );
}
