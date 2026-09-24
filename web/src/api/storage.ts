/**
 * The API token.
 *
 * localStorage rather than a cookie because the API is Sanctum bearer tokens,
 * not sessions — there is nothing for a cookie to carry. Every read and write
 * is guarded: Safari in private browsing throws on access rather than
 * returning nothing, and a thrown storage call at boot is a blank page.
 */
const KEY = 'autevo.token';

export const tokenStorage = {
  read(): string | null {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  },

  save(token: string): void {
    try {
      globalThis.localStorage?.setItem(KEY, token);
    } catch {
      // A session that cannot be remembered still works until the tab closes.
    }
  },

  clear(): void {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      // Nothing to do: there was nothing stored.
    }
  },
};
