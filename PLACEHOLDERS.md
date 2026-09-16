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
| Firebase service account JSON (Android, FCM v1) | `api/.env`, `api/storage/app/firebase.json` |
| APNs key `.p8`, key id, team id (iOS) | `api/.env` |

Until these are real the push channel logs what it would have sent.

## 4. Exchange rates — phase 7

| What | Where |
|---|---|
| Rates provider URL and key | `api/.env` |

Seeded rates for ALL, MKD, RSD and BGN are approximate starting values, not live ones.
The daily job overwrites them once a provider is configured.

## 5. Production storage

| What | Where |
|---|---|
| S3-compatible bucket, key, secret, region, endpoint | `api/.env` |

Development stores photos on the local disk. Production needs the S3 disk.

## 6. App and store — phases 8 and 12

| What | Where |
|---|---|
| Bundle identifier and package name | `app/app.json` |
| RevenueCat public SDK keys, iOS and Android | `app/.env` |
| API base URL | `app/.env` |
| App icon, adaptive icon, splash art | `app/assets/` |
| Apple Developer and Google Play accounts | store consoles |
| Privacy policy and terms URLs, once hosted | `docs/`, `app/app.json` |
| Support email and phone shown in the stores | store listings |

## 7. Content that is representative, not final

- Seeded cities are the thirty largest across the five markets, with real coordinates.
- Seeded makes and models cover the ten popular makes. The long tail gets filled in from
  real listing data after launch.
- Credit pack prices in copy (1 for EUR 1.50, 8 for EUR 9.99, 25 for EUR 24.99) must match
  what is actually configured in App Store Connect and Play Console.
