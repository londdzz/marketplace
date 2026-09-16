import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';

/**
 * The API token lives in the device keychain.
 *
 * expo-secure-store has no web implementation, so the web build, which exists
 * only for previewing the interface, falls back to localStorage. A real device
 * always uses the keychain.
 */
async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);

    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);

    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  save: (token: string) => setItem(TOKEN_KEY, token),
  read: () => getItem(TOKEN_KEY),
  clear: () => removeItem(TOKEN_KEY),
};
