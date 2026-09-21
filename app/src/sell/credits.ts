import { useQuery, useQueryClient } from '@tanstack/react-query';

import { creditsApi, type CreditBalance } from '../api/sell';
import { useAuth } from '../auth/AuthProvider';

export const CREDITS_KEY = ['credits'];

/**
 * The balance, the packs on sale and the ledger behind them.
 *
 * The balance is always read from the API. The app never adds to it locally,
 * not even straight after a successful purchase: only the store webhook grants
 * credits, and this is how the app finds out that it did.
 */
export function useCredits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: CREDITS_KEY,
    queryFn: creditsApi.read,
    staleTime: 15_000,
    // A guest has no balance to read, and asking would only earn a 401.
    enabled: Boolean(user),
  });
}

export function useCreditsRefresh() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
}

/**
 * Wait for the webhook to land.
 *
 * A purchase completes on the device before RevenueCat has told our API about
 * it, so the balance is refetched until it rises or until waiting stops being
 * reasonable. Giving up is not an error: the credits still arrive, the sheet
 * just stops watching for them.
 *
 * @returns the new balance, or null if it had not changed in time
 */
export async function awaitGrantedCredits(
  before: number,
  refetch: () => Promise<{ data?: CreditBalance }>,
  { attempts = 10, intervalMs = 2000 }: { attempts?: number; intervalMs?: number } = {},
): Promise<number | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const result = await refetch();
    const balance = result.data?.balance;

    if (balance !== undefined && balance > before) {
      return balance;
    }
  }

  return null;
}
