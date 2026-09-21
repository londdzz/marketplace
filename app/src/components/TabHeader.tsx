import { useRouter } from 'expo-router';

import { useRequireAccount } from '../auth/useRequireAccount';
import { AppHeader } from './AppHeader';

export type TabHeaderProps = {
  /** A dot on the account icon, for anything waiting on the person. */
  accountBadge?: boolean;
  unreadMessages?: boolean;
};

/**
 * The app bar every tab wears, wired to where its two controls go.
 *
 * It exists so the five tabs cannot drift apart: the mark sits in the same
 * place on all of them, and nothing has to remember which route the account
 * icon opens.
 */
export function TabHeader({ accountBadge, unreadMessages }: TabHeaderProps) {
  const router = useRouter();
  const { require: requireAccount } = useRequireAccount();

  return (
    <AppHeader
      accountBadge={accountBadge}
      unreadMessages={unreadMessages}
      // The profile works either way: for a guest it is where signing in
      // lives, and the language switcher works without an account.
      onAccount={() => router.push('/(tabs)/profile')}
      // Messages do not. A thread needs somebody to reply to.
      onMessages={() => requireAccount('message', () => router.push('/(tabs)/messages'))}
    />
  );
}
