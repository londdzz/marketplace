import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

/**
 * In-app purchases, through RevenueCat.
 *
 * Credits are never granted here. A successful purchase only tells the app to
 * refetch its balance; the RevenueCat webhook is the single thing that grants,
 * because the app is on a device we do not control and the webhook is not.
 */

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

let configured = false;

export function isConfigured(): boolean {
  return Boolean(API_KEY);
}

/**
 * @param appUserId the account id, so a purchase reaches the right ledger
 */
export async function configure(appUserId: string): Promise<void> {
  if (!API_KEY || configured) {
    return;
  }

  if (__DEV__) {
    await Purchases.setLogLevel(LOG_LEVEL.WARN);
  }

  await Purchases.configure({ apiKey: API_KEY, appUserID: appUserId });
  configured = true;
}

/**
 * The credit packs, priced by the store rather than by us, so a buyer sees the
 * amount in their own currency exactly as the store will charge it.
 */
export async function loadPackages(): Promise<PurchasesPackage[]> {
  if (!API_KEY) {
    return [];
  }

  const offerings = await Purchases.getOfferings();

  return offerings.current?.availablePackages ?? [];
}

/**
 * Returns true when the store reported a completed purchase. Credits appear
 * once the webhook has been processed and the balance is refetched.
 */
export async function purchase(pack: PurchasesPackage): Promise<boolean> {
  await Purchases.purchasePackage(pack);

  return true;
}

export type { PurchasesPackage };
