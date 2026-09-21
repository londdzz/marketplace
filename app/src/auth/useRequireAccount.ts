import { useRouter } from 'expo-router';

import { useAuth } from './AuthProvider';

/**
 * The things a buyer cannot do without an account.
 *
 * Each is here because it involves another person, not because it is worth
 * something: selling puts a car in front of the country, messaging and calling
 * reach a real seller, and reporting acts against one. Browsing, keeping a
 * shortlist and saving a search involve nobody and need no account.
 */
export type AccountReason = 'sell' | 'message' | 'call' | 'report' | 'block';

/**
 * Ask for an account only at the moment one is genuinely needed, and say why.
 *
 * Nothing is hidden from a guest and nothing fails silently: the control is
 * there, it is pressable, and pressing it explains what signing in is for
 * rather than refusing. A button that does nothing, or one that vanishes for
 * some people, is worse than being asked a question.
 */
export function useRequireAccount() {
  const { user } = useAuth();
  const router = useRouter();

  return {
    signedIn: Boolean(user),

    /**
     * Run the action when there is an account, otherwise open sign-in with the
     * reason in front of them.
     */
    require: (reason: AccountReason, action: () => void): void => {
      if (user) {
        action();

        return;
      }

      router.push({ pathname: '/(auth)/phone', params: { reason } });
    },
  };
}
