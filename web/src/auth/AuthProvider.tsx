import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authApi } from '../api/auth';
import { tokenStorage } from '../api/storage';
import type { User } from '../api/types';
import i18n, { SUPPORTED_LANGUAGES, setLanguage, type Language } from '../i18n';

/**
 * The account's language wins over this browser's.
 *
 * The app does the same on every launch, and it has to hold here too or the
 * API — which answers in the account's language before it looks at
 * Accept-Language — would put a Macedonian validation message on an English
 * page. A language the site does not ship yet is left alone.
 */
function adoptLanguage(user: User): void {
  const wanted = user.preferred_language;

  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(wanted) && wanted !== i18n.language) {
    setLanguage(wanted as Language);
  }
}

type AuthState = {
  user: User | null;
  /** True until the saved token has been checked, so nothing flashes. */
  restoring: boolean;
  signIn: (phone: string, code: string, phonePrefix?: string) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const token = tokenStorage.read();

      if (!token) {
        if (!cancelled) {
          setRestoring(false);
        }

        return;
      }

      try {
        const me = await authApi.me();

        if (!cancelled) {
          setUser(me);
          adoptLanguage(me);
        }
      } catch {
        tokenStorage.clear();
      } finally {
        if (!cancelled) {
          setRestoring(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (phone: string, code: string, phonePrefix?: string) => {
      // The device name lands on the token, so a session can be told apart
      // from the ones the app holds.
      const session = await authApi.verifyOtp(phone, code, 'Autevo web', phonePrefix);

      tokenStorage.save(session.token);
      setUser(session.user);
      adoptLanguage(session.user);
      // Everything cached was fetched as somebody else, including the public
      // queries: a search result depends on who is asking, because blocking
      // hides cars as well as people.
      queryClient.clear();

      return session.user;
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // A token the server has already forgotten is still gone from here.
    }

    tokenStorage.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      // Left as it was; the next request will surface a real failure.
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, restoring, signIn, signOut, refresh }),
    [user, restoring, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
