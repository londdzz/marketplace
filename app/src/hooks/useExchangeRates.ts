import { useQuery } from '@tanstack/react-query';

import { referenceApi } from '../api/reference';

/**
 * Rates per euro, keyed by currency, so a price can be shown in the local money
 * without the API ever storing one.
 */
export function useExchangeRates() {
  const query = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: referenceApi.exchangeRates,
    staleTime: 60 * 60 * 1000,
  });

  const byCurrency = Object.fromEntries(
    (query.data ?? []).map((rate) => [rate.currency, rate.rate_per_eur]),
  );

  return { ...query, byCurrency };
}
