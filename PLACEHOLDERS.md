# Placeholders — real values still needed

Everything on this list is wired up and working against a stand-in. Each entry says
what to replace, where it lives, and what breaks until it is real.

Nothing here blocks development. All of it blocks store submission.

Update this file whenever a placeholder is added or replaced.

---

## 1. WhatsApp OTP delivery — phase 2

| What | Where |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | `api/.env` |
| `WHATSAPP_ACCESS_TOKEN` | `api/.env` |
| `WHATSAPP_OTP_TEMPLATE` | `api/.env`, currently `otp_code` |
| `OTP_DRIVER` | `api/.env`, set to `whatsapp` once the above are real |

Needs a Meta Business account, a verified business, a WhatsApp Business number, and an
approved authentication template in sq, mk, sr, bg and en. The template must take exactly
one body parameter, the code, and should carry a copy-code button for one-tap autofill.

Until then `OTP_DRIVER=log` writes codes to `api/storage/logs/laravel.log` and sends
nothing. **Never ship with the log driver.**

Still open: WhatsApp is weak in Bulgaria and Serbia, where Viber leads. A second
`App\Contracts\OtpSender` driver is needed before launching those two markets.

## 2. RevenueCat — phase 4

| What | Where |
|---|---|
| `REVENUECAT_WEBHOOK_SECRET` | `api/.env`, currently empty |
| Product identifiers and prices | `api/config/credits.php` |

Set the same secret in the RevenueCat dashboard, which sends it as the Authorization
header on every delivery. The webhook fails closed: while the secret is empty it rejects
every delivery, including real ones, so no purchase grants anything until it is set.

The products `credits_1`, `credits_8` and `credits_25` must exist in App Store Connect
and Play Console as CONSUMABLES at EUR 1.50, 9.99 and 24.99. The store is what actually
charges the buyer; the prices in config are only used for the ledger and for copy, so
they have to be kept in step by hand.

## 3. Push notifications — phase 7

| What | Where |
|---|---|
| `PUSH_DRIVER` | `api/.env`, currently `log`; set to `stores` once the rest is real |
| Firebase service account JSON (Android, FCM v1) | `api/storage/app/firebase.json`, path in `FCM_CREDENTIALS` |
| `FCM_PROJECT_ID` | `api/.env` |
| APNs `.p8` key | `api/storage/app/apns.p8`, path in `APNS_KEY_PATH` |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` | `api/.env` |
| `APNS_PRODUCTION` | `api/.env`, `false` uses Apple's sandbox |

Both senders are written and tested against fakes. Until the credentials are real,
`PUSH_DRIVER=log` writes what would have been sent to the log and sends nothing. Keep the
service account JSON and the .p8 key out of version control.

## 4. Exchange rates — phase 7

| What | Where |
|---|---|
| `RATES_DRIVER` | `api/.env`, currently `none`; set to `http` once a provider is chosen |
| `RATES_URL`, `RATES_KEY` | `api/.env` |

Seeded rates for ALL, MKD, RSD and BGN are approximate starting values, not live ones. The
daily job leaves them alone until a provider is configured, and overwrites them after.

Choose the provider with care: the European Central Bank publishes neither the Albanian lek
nor the Macedonian denar, so an ECB-backed feed cannot cover three of the five markets. The
provider must answer JSON shaped `{ "rates": { "ALL": 98.5, ... } }` with the euro as base,
which is what exchangerate.host and openexchangerates return.

## 5. Production storage

| What | Where |
|---|---|
| S3-compatible bucket, key, secret, region, endpoint | `api/.env` |

Development stores photos on the local disk. Production needs the S3 disk.

## 6. App and store — phases 8 and 12

| What | Where | What it breaks |
|---|---|---|
| EAS project id, currently all zeroes | `app/app.json` → `extra.eas.projectId` | `eas build` cannot start; `eas init` writes the real one |
| Apple ID, App Store Connect app id, team id | `app/eas.json` → `submit.production.ios` | `eas submit` for iOS |
| Google Play service account JSON | `app/google-play-service-account.json`, named in `eas.json` | `eas submit` for Android |
| RevenueCat public SDK keys | `app/.env` | The credits sheet lists packs but cannot sell one |
| Production API URL | `app/eas.json` build profiles, currently `https://api.vetura.mk` | Builds point at a host that does not exist |
| `[COMPANY LEGAL NAME]`, `[REGISTERED ADDRESS]` | `docs/privacy-policy.*.md`, `docs/terms.*.md` | Both stores require a real entity |
| `vetura.mk` domain and its `/privacy`, `/terms`, `/support`, `/delete-account` pages | `docs/`, store listings | The privacy URL must be public before review |
| privacy@vetura.mk, support@vetura.mk | `docs/` | The addresses are printed in policies people will use |
| Apple Developer and Google Play accounts | store consoles | Nothing ships |
| Demo account for review (number and fixed code) | App Store Connect review notes | A phone-OTP app is unreviewable without one |

The bundle identifier and package name are set to `mk.vetura.app` in `app/app.json`. **Neither
can be changed after the first release**, so confirm the domain before the first upload.

Icons and the splash mark are real, generated by `app/scripts/make-brand-assets.js` from the
brand colours. Replace them only if a designer draws something better.

## 6b. In-app purchases — phase 10

| What | Where |
|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | `app/.env` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | `app/.env` |
| An offering in RevenueCat exposing `credits_1`, `credits_8`, `credits_25` | RevenueCat dashboard |

The app matches a pack to a store product by its identifier, so those three products must
exist in App Store Connect and Play Console **as consumables** and be attached to the
current RevenueCat offering. Until the keys are set the credits sheet lists the packs at
their euro prices and says purchases are not available, and nothing can be bought.

Credits are granted only by the RevenueCat webhook, never by the app, so the webhook secret
in section 2 has to be real before a purchase can ever add anything.

## 6c. Blocking another user — not built

Apple's Guideline 1.2 and Play's UGC policy both require that a user can **block** another
user, on top of the reporting we already have. There is no `user_blocks` table and no block
action in the app. It is the most likely reason a first App Store submission is rejected, and
it is written up at the top of `docs/store/pre-submission-checklist.md`.

## 7. Content that is representative, not final

- Listing photographs come from `DevListingSeeder`, which generates coloured panels rather
  than photographs of real cars.
- **Manufacturer marks are generated, not committed.** `node scripts/fetch-make-logos.js`
  from /api pulls them from Simple Icons and renders flat PNGs into `storage/app/public/makes`,
  then `php artisan makes:logos` links them to the makes. Storage is not in the repository, so
  run both after any fresh checkout or deploy. Thirty-four of the forty seeded makes have a
  mark; Dodge, Lancia and Lexus have none published, and those tiles fall back to a monogram.

  The Simple Icons files are CC0, but the marks themselves remain their owners' trademarks.
  Using a maker's mark to identify the car being sold is nominative use and is what every
  marketplace in the region does — **confirm it with your own lawyer before launch**, and
  replace the set with licensed artwork if they advise it.
- Seeded cities are the thirty largest across the five markets, with real coordinates.
- Seeded makes and models cover the ten popular makes. The long tail gets filled in from
  real listing data after launch.
- Credit pack prices in copy (1 for EUR 1.50, 8 for EUR 9.99, 25 for EUR 24.99) must match
  what is actually configured in App Store Connect and Play Console.
