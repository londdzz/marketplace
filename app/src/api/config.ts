import Constants from 'expo-constants';

/**
 * Where the API lives.
 *
 * Overridden per build with EXPO_PUBLIC_API_URL. The fallback points at a
 * Laravel server on this machine, which is what development and the screenshot
 * harness use.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://127.0.0.1:8000/api/v1';
