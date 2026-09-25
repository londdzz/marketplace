# Placeholders — real values still needed

Everything on this list is wired up and working against a stand-in. Each entry says
what to replace, where it lives, and what breaks until it is real.

Nothing here blocks development. All of it blocks store submission.

**`docs/credentials.md` says where each of these comes from**, in the order they should be
collected, with what each one costs and how long it takes.

**`docs/deployment.md` says where they go** — what server to buy, how to point the domain
at it, and how to get an `.ipa` onto a phone talking to the real API. The files it tells
you to copy onto the server are in `deploy/`.

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
nothing. **Never ship with the log driver** — a code in a log file means anyone who can
read that file signs in as anybody.

It is, however, the right driver while the build is going to friends and nobody is
paying an aggregator yet, so there is a way to read a code back without hunting through
the file:

```bash
php artisan otp:recent                    # the last ten, newest at the bottom
php artisan otp:recent +38970123456       # just that number
```

It reads the log, not the database: `otp_codes` stores a hash and never the code, so the
log is the only place a code has ever existed in the clear. The log masks the number, so
the command masks the one you give it the same way before matching — two numbers sharing
their first and last three digits both match, which is what the timestamps are for.

**A friend's phone gets no message at all**, so somebody has to read the code and pass it
on. Where that is too much, `OTP_UNIVERSAL_CODE` (below) is the other way, and it needs
`APP_ENV` to be something other than `production`.

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
| Production API URL | `app/eas.json` build profiles, currently `https://api.autevo.mk` | Builds point at a host that does not exist |
| `[COMPANY LEGAL NAME]`, `[REGISTERED ADDRESS]` | `docs/privacy-policy.*.md`, `docs/terms.*.md` | Both stores require a real entity |
| ~~`autevo.mk` domain~~ **bought**. Still needed: its `/privacy`, `/terms`, `/support` and `/delete-account` pages — nothing serves them yet | `docs/`, store listings | The privacy URL must be public before review |
| privacy@autevo.mk, support@autevo.mk | `docs/` | The addresses are printed in policies people will use |
| Apple Developer and Google Play accounts | store consoles | Nothing ships |
| Demo account for review (number and fixed code) | App Store Connect review notes | A phone-OTP app is unreviewable without one |

The bundle identifier and package name are set to `mk.autevo.app` in `app/app.json`. **Neither
can be changed after the first release.** The domain `autevo.mk` is owned, which is what
justifies that identifier, so both are settled and nothing else in the repository needs
renaming: `eas.json`, the iOS workflow, the policies and the store listings already agree.

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

## 7. Content that is representative, not final

- **Listing photographs in development are other people's.** `node scripts/fetch-car-photos.js`
  from /api pulls a freely licensed photograph of each of the fourteen seeded vehicles —
  eight cars and six motorcycles — from Wikimedia Commons into `storage/app/dev-photos`,
  and `DevListingSeeder` publishes them
  through the real upload path. `storage/app/dev-photos/CREDITS.json` names the
  photographer and the licence of every one. Storage is not in the repository, so run the
  script after a fresh checkout; without it the seeder falls back to generated coloured
  panels and the app still seeds.

  Most are CC0 or public domain, but some are **CC BY** or **CC BY-SA**, which carry
  attribution and — for BY-SA — share-alike obligations. That is fine for a development
  database. It is **not** fine for anything that leaves it: **store screenshots must be
  taken against real seller photographs or artwork we have licensed**, never against
  these. `app/scripts/store-screenshots.js` captures the running app, so this is a real
  risk, not a theoretical one. In production a listing's pictures are the seller's own and
  none of this runs.
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
- **The collection art in `app/assets/collections` was supplied, not licensed by us.**
  Family cars, First car, Premium and City cars each carry a scene photograph and a cut-out
  car, and `app/assets/shapes` holds a cut-out per body shape (Saloon so far). All of them
  were given to the project rather than bought through a stock library. **Confirm the rights
  to every one before submission** — they ship inside the binary and appear on the first screen
  of the app, which is the most visible place artwork can be. Every other collection falls
  back to a real listing's photograph and needs nothing.
- **`app/src/app/design.tsx` is a developer screen with eight dead buttons.** It is the
  design-system gallery — every component at every size, for judging them side by side —
  and its buttons are `onPress={() => {}}` on purpose. Nothing in the app links to it, so
  it can only be reached by typing `/design`, but it is still in the shipped bundle. Delete
  the file before submission, or gate it behind `__DEV__`. It is the only screen in the app
  where a control does nothing when you press it.

## `OTP_UNIVERSAL_CODE` — a code that verifies any number

**Introduced**: friends' test build, after phase 12.
**What it breaks until removed**: everything phone verification exists for. Anyone
who can reach the API signs in as any number, and a seller's telephone number sits
behind an account. It is refused when `APP_ENV=production` and every use is logged
as a warning, but the only safe state for a real deployment is empty.
**Replace with**: nothing. Delete the value from `.env`. Real codes are delivered by
`OtpSender` and always were.

**To use it while the build is with friends**: it needs `APP_ENV` set to something other
than `production` — `staging` is the honest label for a server nobody real is on yet.
That is the only thing in this codebase that reads `APP_ENV`, so nothing else changes;
`APP_DEBUG=false` is what keeps stack traces off the wire, and it is a separate setting.
Then the day the label goes back to `production` for launch, the code stops working on
its own, which is the entire point of the guard. Do not relax it instead.
