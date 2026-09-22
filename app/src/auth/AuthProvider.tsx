import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { loadApiUrlOverride } from "../api/config";
import { tokenStorage } from "../api/storage";
import type { AuthSession, User } from "../api/types";
import { mergeGuestData } from "../guest/merge";
import i18n, { SUPPORTED_LANGUAGES, type Language } from "../i18n";
import { registerForPush, unregisterFromPush } from "../push";

/**
 * The account's chosen language wins over the device's, so signing in on a new
 * phone brings the language with it.
 */
function followAccountLanguage(user: User | null): void {
  const language = user?.preferred_language;

  if (
    language &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(language) &&
    i18n.language !== language
  ) {
    void i18n.changeLanguage(language as Language);
  }
}

type AuthState = {
  /** Null until the stored token has been checked on launch. */
  user: User | null;
  /** True while the app is working out whether it is already signed in. */
  restoring: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Take the account the API just returned, after a profile change. */
  apply: (user: User) => void;
  /** Delete the account for good, then leave the app signed out. */
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const queryClient = useQueryClient();

  /**
   * Everything cached belonged to whoever was signed in a moment ago, so all
   * of it goes when that changes. Not only the obviously personal screens: a
   * search result depends on who is asking too, because blocking hides cars
   * as well as people, and a guest's results are not a signed-in buyer's.
   *
   * The cost is one refetch of reference data that is cached for an hour
   * anyway, at a moment when the person is already waiting.
   */
  const forgetEverything = useCallback(
    () => queryClient.clear(),
    [queryClient],
  );

  const signIn = useCallback(
    async (session: AuthSession) => {
      await tokenStorage.save(session.token);

      // Before the user is set, so the token is already stored and the upload
      // below is authenticated, and so the saved tabs never render the empty
      // account list for a moment before the phone's copy arrives on it.
      await mergeGuestData().catch(() => undefined);

      forgetEverything();
      setUser(session.user);
      followAccountLanguage(session.user);

      // Asked for once the account exists, so the prompt arrives with something
      // to explain it rather than on a cold first launch.
      void registerForPush().catch(() => undefined);
    },
    [forgetEverything],
  );

  const signOut = useCallback(async () => {
    // Before the token goes, so the API knows which device to stop sending to.
    await unregisterFromPush();

    try {
      await authApi.logout();
    } catch {
      // A token the server has already forgotten is still worth clearing here.
    }

    await tokenStorage.clear();
    forgetEverything();
    setUser(null);
  }, [forgetEverything]);

  const apply = useCallback((updated: User) => {
    setUser(updated);
    followAccountLanguage(updated);
  }, []);

  const deleteAccount = useCallback(async () => {
    await unregisterFromPush();
    await authApi.deleteAccount();
    await tokenStorage.clear();
    forgetEverything();
    setUser(null);
  }, [forgetEverything]);

  const refresh = useCallback(async () => {
    try {
      const current = await authApi.me();

      setUser(current);
      followAccountLanguage(current);
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
      // Before anything asks the API where it is. A build made for testing on
      // a phone may have been pointed at a different server, and the first
      // request must already know.
      //
      // Both of these read device storage, and the keychain in particular can
      // refuse — a sideloaded build is signed by a different team than the one
      // that wrote the entry, and the entitlement no longer matches. Letting
      // that throw here left the launch screen up for ever, because nothing
      // below it ever ran. Not being able to read a token is the same as not
      // having one: the app opens signed out, which it is built to do.
      let token: string | null = null;

      try {
        await loadApiUrlOverride();
        token = await tokenStorage.read();
      } catch {
        token = null;
      }

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
    () => ({ user, restoring, signIn, signOut, refresh, apply, deleteAccount }),
    [user, restoring, signIn, signOut, refresh, apply, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth was called outside AuthProvider.");
  }

  return context;
}
