import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Where the API lives.
 *
 * The address is fixed at build time with EXPO_PUBLIC_API_URL, because that is
 * what a released app wants: one server, decided once, not something a buyer
 * can point somewhere else.
 *
 * A build made for testing on a real phone wants the opposite. It talks to a
 * PC on the same wifi, whose address is whatever the router handed out that
 * morning, and baking it in means a twenty-minute rebuild every time the lease
 * changes or the phone joins a different network. So a build may be made with
 * EXPO_PUBLIC_ALLOW_API_OVERRIDE=1, and then — and only then — the address can
 * be changed on the device.
 *
 * Production builds do not set that flag, so `API_URL_IS_SETTABLE` is false,
 * the screen that changes it is never shown, and any value left in storage is
 * ignored. An app that could be pointed at somebody else's server by anyone
 * who reached one screen would be a way to harvest sign-in codes.
 */
const BUILT_IN =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://127.0.0.1:8000/api/v1';

const STORAGE_KEY = 'dev.api-url.v1';

export const API_URL_IS_SETTABLE = process.env.EXPO_PUBLIC_ALLOW_API_OVERRIDE === '1';

/** The address this build was made with, which Reset goes back to. */
export const BUILT_IN_API_URL = BUILT_IN;

let override: string | null = null;

/** Where requests actually go. Read per request, never captured. */
export function apiUrl(): string {
  return API_URL_IS_SETTABLE && override ? override : BUILT_IN;
}

/** True when the app is talking to something other than the built-in address. */
export function apiUrlIsOverridden(): boolean {
  return API_URL_IS_SETTABLE && override !== null;
}

/**
 * Read the saved address. Must finish before the first request, which is why
 * it is awaited at the top of the launch rather than left to a screen.
 */
export async function loadApiUrlOverride(): Promise<void> {
  if (!API_URL_IS_SETTABLE) {
    return;
  }

  try {
    override = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    override = null;
  }
}

/** Save a new address, or pass null to go back to the built-in one. */
export async function setApiUrlOverride(value: string | null): Promise<void> {
  if (!API_URL_IS_SETTABLE) {
    return;
  }

  const trimmed = value?.trim().replace(/\/+$/, '') || null;
  override = trimmed;

  try {
    if (trimmed) {
      await AsyncStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // It still applies for this run; it simply will not survive a restart.
  }
}
