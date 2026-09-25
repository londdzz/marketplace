# Where each credential comes from

Everything in `PLACEHOLDERS.md` in the order it should be collected, because some of these
take a day and some take three weeks. Each one says where to click, what it costs, what the
value looks like when you have it, and which file it goes in.

**Hand them over safely.** `api/.env`, `app/.env` and the two key files are ignored by git and
never leave the server. Paste values into the chat and I will put them where they belong —
except the two marked **do not paste**, which you should place on the production server
yourself.

---

## Order of work

```
week 1   company + domain + email      ← everything else needs these
week 1   Apple Developer, Google Play  ← identity checks take days
week 1   Meta business verification    ← the slowest, start it first
week 2   Firebase, APNs key, RevenueCat
week 2   hosting + S3 + the domain pointing at it
week 3   store products, screenshots, closed testing starts
week 5   submit
```

---

## 1. The company, the domain, the addresses

Nothing else can be finished without them, and both stores check the name matches.

| What | Where | Notes |
|---|---|---|
| Legal entity | Central Register of North Macedonia (crm.com.mk), or through an accountant | A DOOEL is the usual form. You need the registered name and address for the policies, and a bank account for payouts. |
| `autevo.mk` domain | Any MARnet-accredited registrar (list at marnet.mk) | .mk registration asks for a local entity or a trademark. If that is slow, `Autevo.com.mk` or a `.com` works — but the bundle id `mk.autevo.app` is easier to justify with the domain. |
| privacy@autevo.mk, support@autevo.mk | Google Workspace, Zoho Mail (free tier), Fastmail | Real mailboxes a person reads. They are printed in the policies. |

Goes in: `docs/privacy-policy.*.md`, `docs/terms.*.md` (the `[COMPANY LEGAL NAME]` and
`[REGISTERED ADDRESS]` placeholders), and the store listings.

## 2. Apple Developer Program — $99/year

apple.com → developer.apple.com/programs → Enrol. Enrolling as a company needs a **D-U-N-S
number** (free, from Apple's own lookup form; allow up to five working days). Personal
enrolment is instant but puts your own name on the store listing.

Once in, collect:

| Value | Where exactly | Looks like | Goes in |
|---|---|---|---|
| Apple ID | The email you sign in with | `you@example.com` | `app/eas.json` → `submit.production.ios.appleId` |
| Team ID | developer.apple.com → Account → Membership details | `A1B2C3D4E5` | `app/eas.json` → `appleTeamId`, and `APNS_TEAM_ID` in `api/.env` |
| App Store Connect App ID | appstoreconnect.apple.com → My Apps → Autevo → App Information → "Apple ID" | ten digits, `6478123456` | `app/eas.json` → `ascAppId` |
| APNs key (`.p8`) | developer.apple.com → Certificates, Identifiers & Profiles → **Keys** → + → tick "Apple Push Notifications service (APNs)" | one file, downloadable **once** | `api/storage/app/apns.p8` — **do not paste**, upload to the server |
| Key ID | shown next to that key | `ABC1234DEF` | `APNS_KEY_ID` in `api/.env` |

Create the app itself in App Store Connect with bundle id `mk.autevo.app`, then enrol in the
**Apple Small Business Program** (App Store Connect → Agreements, Tax and Banking) before the
first sale: 15% instead of 30%, and it is not applied retroactively.

## 3. Google Play — $25 once

play.google.com/console → create a developer account. Identity verification takes a few days;
organisations also need a D-U-N-S number. Create the app with package `mk.autevo.app`.

The service account, for `eas submit`:

1. Play Console → Setup → **API access** → link a Google Cloud project.
2. In Google Cloud → IAM & Admin → Service Accounts → create one, e.g. `eas-submit`.
3. On that service account → **Keys** → Add key → JSON → download.
4. Back in Play Console → Users and permissions → invite the service account's email address →
   give it release permissions for the app.

| Value | Looks like | Goes in |
|---|---|---|
| Service account JSON | `{"type":"service_account",...}` | `app/google-play-service-account.json` — **do not paste**, keep it on your machine |

Also in the console: Data safety (answers in `store/data-safety.md`), content rating, and the
three in-app products from `store/iap-products.md`.

## 4. Firebase, for Android push

console.firebase.google.com → Add project (reuse the Google Cloud project from step 3 if you
like) → Add app → **Android** → package `mk.autevo.app`.

| Value | Where | Goes in |
|---|---|---|
| `google-services.json` | offered right after adding the Android app | `app/google-services.json`, then add `"googleServicesFile": "./google-services.json"` under `android` in `app.json` |
| Service account JSON | Project settings → **Service accounts** → Generate new private key | `api/storage/app/firebase.json` — **do not paste** |
| Project ID | Project settings → General → "Project ID" | `FCM_PROJECT_ID` in `api/.env` |

Then set `PUSH_DRIVER=stores` in `api/.env`. Until it is set, the API writes what it would
have sent to the log.

## 5a. Messaggio, for the sign-in code — this is the one in use

messaggio.com. One account reaches SMS, Viber and WhatsApp, which is why it is
here rather than a WhatsApp-only integration that cannot be turned on for weeks.

| Value | Where | Goes in |
|---|---|---|
| Project login | Messaggio account → the project | `MESSAGGIO_LOGIN` |
| Sender name | Register it with their support — company details, not instant | `MESSAGGIO_SENDER` |

Then choose the channels. `MESSAGGIO_CHANNELS` is a preference order and
Messaggio falls through it:

| Setting | What happens | Roughly |
|---|---|---|
| `sms` | everyone gets an SMS | €0.02 a sign-in |
| `viber,sms` | Viber first, SMS only for whoever it could not reach | €0.007 for most of them |

`viber,sms` is the cheaper of the two and leaves nobody out, but the Viber
sender needs registering separately. Start on `sms`, move when it is approved.

`MESSAGGIO_TTL` is how many seconds it waits for Viber before falling back to
SMS. Sixty is a real attempt without leaving somebody staring at an empty code
box; the code itself only lives five minutes.

> **Do not use an unofficial WhatsApp gateway** — the kind that asks you to scan
> a QR code and drives a linked personal account. It is cheaper per month and it
> breaks WhatsApp's terms, so the number gets banned, and the day it does
> *nobody can sign in at all*. It also means a third party with no obligation to
> you is reading every sign-in code on the marketplace.

## 5b. WhatsApp Cloud API — the slowest thing on this list, start it early

developers.facebook.com → My Apps → Create app → **Business** → add the **WhatsApp** product.
Then in Meta Business Suite: verify the business (company documents, can take days to weeks)
and add a phone number that is **not already on WhatsApp**.

| Value | Where exactly | Looks like | Goes in |
|---|---|---|---|
| Phone number ID | WhatsApp → API Setup → "Phone number ID" | fifteen digits | `WHATSAPP_PHONE_NUMBER_ID` |
| Access token | Business Settings → **System users** → add one → assign the app and the WhatsApp account with full control → Generate token with `whatsapp_business_messaging` and `whatsapp_business_management` | long string starting `EAA…` | `WHATSAPP_ACCESS_TOKEN` |
| Template name | WhatsApp Manager → Message templates → Create → category **Authentication**, one body parameter (the code), copy-code button, in Macedonian and English | `otp_code` | `WHATSAPP_OTP_TEMPLATE` |

The temporary token on the API Setup page expires in 24 hours — useful for a first test, no
good for production. Set `OTP_DRIVER=whatsapp` once the token is the permanent one.

Authentication messages are billed per message and the rate differs by country; check Meta's
current rate card for North Macedonia before you budget for it.

**If verification drags on**, an SMS provider can be dropped in behind the same interface —
`App\Contracts\OtpSender` — without touching anything else. Infobip is a regional option,
Twilio and MessageBird are the usual alternatives. Sending to Macedonian numbers may need a
registered sender ID, which is its own short wait.

## 6. RevenueCat, for purchases

app.revenuecat.com — free until roughly $2,500 a month in tracked revenue.

1. Create a project, then add both apps.
   - **App Store**: needs the bundle id and an **In-App Purchase Key** (App Store Connect →
     Users and Access → Integrations → In-App Purchase) or the App-Specific Shared Secret.
   - **Play Store**: needs a service account JSON with financial-data permission — the same one
     from step 3 works if you grant it "View financial data" in Play Console.
2. Import `credits_1`, `credits_8`, `credits_25` and put all three in one **offering**.
3. Integrations → Webhooks → URL `https://api.autevo.mk/api/v1/webhooks/revenuecat`, and an
   Authorization header value you invent: `openssl rand -hex 32` gives a good one.

| Value | Where | Looks like | Goes in |
|---|---|---|---|
| iOS public SDK key | Project settings → API keys → public app-specific | `appl_AbCdEf…` | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` in `app/.env` |
| Android public SDK key | same page | `goog_AbCdEf…` | `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` in `app/.env` |
| Webhook secret | the value you invented | 64 hex characters | `REVENUECAT_WEBHOOK_SECRET` in `api/.env` **and** the RevenueCat webhook header |

The public SDK keys are safe to paste here — they ship inside the app anyway. The webhook
secret is not: it is the only thing standing between a stranger and free credits.

## 7. Hosting, the database and photo storage

The API needs PHP 8.2+, MySQL 8, a queue worker and cron (`php artisan schedule:run` every
minute). Hetzner with Laravel Forge is the cheap, boring choice; DigitalOcean App Platform and
Fly.io also work.

Photos need any S3-compatible bucket — Hetzner Object Storage, DigitalOcean Spaces, Cloudflare
R2, AWS S3:

| Value | Goes in `api/.env` |
|---|---|
| Access key | `AWS_ACCESS_KEY_ID` |
| Secret | `AWS_SECRET_ACCESS_KEY` — **do not paste** |
| Region | `AWS_DEFAULT_REGION` |
| Bucket | `AWS_BUCKET` |
| Endpoint (anything that is not AWS) | `AWS_ENDPOINT` |

Then `FILESYSTEM_DISK=s3`, and point `api.autevo.mk` at the server. The app's production
builds already expect `https://api.autevo.mk/api/v1` (`app/eas.json`).

## 8. Exchange rates — not needed yet

Prices are euro only, so `RATES_DRIVER=none` is correct. When a market that does not use the
euro opens: exchangerate.host or openexchangerates.org, free tiers, JSON shaped
`{"rates":{"MKD":61.5}}` with the euro as base. The ECB feed cannot be used — it publishes
neither the denar nor the lek.

## 9. EAS

Run `eas init` from `/app` once you have an Expo account (free). It writes the real project id
into `app.json` over the zeroes that are there now. Nothing to paste.

---

## One thing that still needs code

App review needs an account a reviewer can sign into, and every sign-in here sends a one-time
code to a real phone. A reviewer cannot receive that. Before submitting, the API needs a single
review account whose code is fixed — a number and a code in configuration, accepted only for
that number, never generated for anyone else. It is about twenty lines and a test. Say the word
and I will build it; without it, Apple cannot get past the first screen.
