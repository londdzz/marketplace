import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { tokenStorage } from '../api/storage';
import type { AuthSession, User } from '../api/types';

type AuthState = {
  /** Null until the stored token has been checked on launch. */
  user: User | null;
  /** True while the app is working out whether it is already signed in. */
  restoring: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

  const signIn = useCallback(async (session: AuthSession) => {
    await tokenStorage.save(session.token);
    setUser(session.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // A token the server has already forgotten is still worth clearing here.
    }

    await tokenStorage.clear();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthenticated) {
        await tokenStorage.clear();
        setUser(null);

        return;
      }

      throw error;
    }
  }, []);

  // On launch, a stored token is verified against the API rather than trusted,
  // so a revoked or deleted account does not appear signed in.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const token = await tokenStorage.read();

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
        }
      } catch {
        await tokenStorage.clear();
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

  const value = useMemo<AuthState>(
    () => ({ user, restoring, signIn, signOut, refresh }),
    [user, restoring, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth was called outside AuthProvider.');
  }

  return context;
}
