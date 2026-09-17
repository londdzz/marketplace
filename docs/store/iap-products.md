# In-app purchases — credit packs

Three products, **consumable** in both stores. A consumable is bought, granted, spent, and can
be bought again; a non-consumable or a subscription would be wrong here and cannot be changed
after the fact, so check this before creating them.

| Product ID | Credits | Price (EUR) | Marked |
|---|---|---|---|
| `credits_1` | 1 | 1.50 | — |
| `credits_8` | 8 | 9.99 | Most popular |
| `credits_25` | 25 | 24.99 | — |

The product IDs are the contract between the stores, RevenueCat and our API: they appear in
`api/config/credits.php`, and the app matches a pack to a store product by that identifier. They
must match exactly, in all three places.

## App Store Connect

1. Features → In-App Purchases → **Consumable** for each of the three.
2. Reference name: `Credits 1`, `Credits 8`, `Credits 25`. Product ID exactly as above.
3. Price: pick the tier nearest the euro price for the **Macedonia** storefront; the store
   charges in the buyer's currency and that number is what the buyer sees, not ours.
4. Localisations in Macedonian and English:
   - `credits_1` — "1 credit" / "1 кредит" — "One listing, live for two weeks."
   - `credits_8` — "8 credits" / "8 кредити" — "Eight listings, two weeks each."
   - `credits_25` — "25 credits" / "25 кредити" — "Twenty-five listings, two weeks each."
5. Review screenshot: the credits sheet with the packs visible (see `screenshots.md`).
6. Attach all three to the first build submitted for review, or they are not reviewed with it.
7. Join the **Apple Small Business Program** before the first sale if annual proceeds are under
   1 million USD: it is 15% instead of 30%, and it is not retroactive.

## Google Play Console

1. Monetise → Products → In-app products → create each with the same product IDs.
2. Set price per product for North Macedonia; activate each one.
3. Google's equivalent reduced rate is 15% on the first 1M USD of annual earnings, applied
   automatically once the account is enrolled — confirm enrolment under Payments profile.
4. A licence tester account is needed to test purchases without being charged:
   Setup → License testing.

## RevenueCat

1. One project, two apps (App Store, Play Store).
2. Import the three products; put all three into one **offering** with three packages. The app
   reads `offerings.current.availablePackages` and matches on `product.identifier`.
3. Webhook → our API: `POST https://api.autevo.mk/api/v1/webhooks/revenuecat`, with the shared
   secret in the Authorization header. The same value goes in `REVENUECAT_WEBHOOK_SECRET`.
   Without it the webhook rejects every delivery, which is deliberate.
4. Public SDK keys go into `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` for the build.

## What must be true before release

- Credits are granted **only** by the webhook. The app never adds a credit locally; it refetches
  the balance and waits. Do not "fix" a slow grant by granting on the device.
- `credit_transactions.store_transaction_id` is unique, so a webhook that arrives twice grants
  once. Retries are normal and must stay harmless.
- There is no way to buy credits outside the stores — no web checkout, no bank transfer, no
  "contact us to top up". That is a rejection in both stores.
