# Pre-submission checklist

Work top to bottom. Everything above "Ready to submit" has to be true before the first build
goes to either store. The blockers are first because they are the ones that get an app rejected
or, worse, launched and then pulled. One of the three is now done.

---

## Blockers — these are not optional

### ~~1. Blocking another user~~ — built

An app with user-generated content and user-to-user messaging must offer **all** of: filtering
objectionable material, a way to report content, a way to block abusive users, and published
contact details for the developer. All four are now in place:

- **Report** — the report action on a listing (`POST /listings/{id}/report`).
- **Block** — `POST /blocks`, from the listing and from the message thread. It hides both ways:
  their cars leave your search and yours leave theirs, the thread closes for both of you, and
  neither can start a new one. Nothing is deleted, so unblocking restores all of it.
- **Unblock** — Profile → Blocked people.
- **Contact** — support@autevo.mk on the listing and in the terms.
- **Removal** — we can take down a listing and block an account from our side
  (`users.blocked_at`), which is what a report leads to.

Mention all of this in the review notes: reviewers look for it and often miss it.

### 2. Every placeholder in `PLACEHOLDERS.md` is still a placeholder

The app cannot sign anybody in without the WhatsApp credentials, cannot grant a credit without
the RevenueCat secret, and cannot send a notification without FCM and APNs keys. Read that file
and work it to zero. `eas.json` and `app.json` carry obvious `REPLACE_WITH_…` values and a
zeroed EAS project id; `eas init` fixes the last one.

### 3. Nothing has run on a real phone yet

Everything so far has been checked in a headless browser against a local API. Fonts, safe
areas, the keyboard, the keychain, the photo picker, push permission and in-app purchase behave
differently on a device and some of them only work there. Build with EAS, install on an iPhone
and an Android phone, and walk the whole app before anything is submitted.

---

## Accounts and enrolment

- [ ] Apple Developer Program, €99/year, company or sole trader — the legal entity that appears
      on the listing and in the terms.
- [ ] **Apple Small Business Program**: 15% instead of 30% under 1M USD a year. Apply before the
      first sale; it is not applied retroactively.
- [ ] Google Play developer account, 25 USD once. Identity verification can take days.
- [ ] Google's reduced rate (15% on the first 1M USD a year) — confirm it is applied to the
      payments profile.
- [ ] Both accounts on the same legal entity as the privacy policy and the terms.

## Store setup

- [ ] Bundle identifier `mk.autevo.app` and Play package `mk.autevo.app` created. **Neither can
      ever be changed.**
- [ ] Availability: **North Macedonia only**, both stores.
- [ ] Listing copy from `listing.mk.md` and `listing.en.md`, Macedonian as the default language.
- [ ] Screenshots from `screenshots/` uploaded per language; Play feature graphic uploaded.
- [ ] Privacy policy URL live and reachable **without signing in**: `https://autevo.mk/privacy`.
- [ ] Terms URL live: `https://autevo.mk/terms`.
- [ ] Play account-deletion URL live: `https://autevo.mk/delete-account`.
- [ ] Support URL and support email working, and monitored by a person.
- [ ] App Privacy questionnaire filled from `app-privacy.md`.
- [ ] Play Data safety form filled from `data-safety.md`.
- [ ] Content rating questionnaire answered (user-generated content: yes; communication: yes).

## In-app purchases

- [ ] `credits_1`, `credits_8`, `credits_25` created in both stores as **consumables**.
- [ ] Prices set for the Macedonia storefront; the amounts match what `config/credits.php` says
      and what the copy claims.
- [ ] All three attached to the build submitted for review (App Store Connect).
- [ ] RevenueCat offering contains all three, and the app reads it.
- [ ] Webhook secret set on both sides, and a test event granted a credit in the ledger.
- [ ] **Sandbox purchase tested on a real device, both stores**: buy, see the balance rise after
      the webhook lands, publish a listing with it, check `credit_transactions`.
- [ ] Buy the same pack twice and confirm the second webhook delivery grants once.
- [ ] No way to buy credits outside the stores anywhere in the app, the website, or the emails.

## Release process

- [ ] **Google Play closed testing: 12 testers, opted in, for 14 continuous days** before
      production access is granted for a new personal developer account. Start this early; it is
      two weeks of calendar time that cannot be compressed.
- [ ] TestFlight build tested by someone who is not the developer.
- [ ] `eas build --profile production` for both platforms; `eas submit` configured.
- [ ] Version 1.0.0, iOS build number 1, Android versionCode 1, incrementing from there.
- [ ] Production API deployed with HTTPS, the S3 disk configured, the scheduler running
      (`php artisan schedule:work` or cron), and the queue worker running.
- [ ] `node scripts/fetch-make-logos.js` and `php artisan makes:logos` run on production, since
      the marks are generated and not committed.
- [ ] Database backed up on a schedule, and a restore tried once.

## Things reviewers check that are easy to miss

- [ ] **Account deletion in two taps**: Profile → Delete my account. It is there; confirm it
      still is in the submitted build, and mention where it is in the review notes.
- [ ] Sign-in works for the reviewer. A phone-OTP app needs a **demo account** with a number the
      reviewer can use, or codes will never arrive for them. Put the number and a fixed code in
      App Store Connect's review notes, and make sure the account has credits and a listing.
- [ ] **`OTP_DRIVER` is `messaggio` or `whatsapp`** on the server the submitted build talks to.
      `log` and `discord` both deliver the code somewhere other than the phone that asked for
      it, so with either one anybody who can read that file or that channel signs in as anybody.
      Check the running value, not just `.env` — the deploy caches config:
      `php artisan tinker --execute="echo config('otp.driver');"`
- [ ] **`OTP_DISCORD_WEBHOOK_URL` and `OTP_UNIVERSAL_CODE` are both empty.** Either one left set
      is a way into any account.
- [ ] The app does not crash with no network. Every screen has a failure state; check on a plane.
- [ ] No placeholder text, no "Lorem", no test listings visible in production.
- [ ] Permission prompts appear only when the feature is used, and the strings say why in the
      device's language (`app/locales/mk.json`, `app/locales/en.json`).
- [ ] The app does not ask for tracking permission, because it does not track.
- [ ] Nothing in the app links out to a web page that sells anything.

## Ready to submit

- [ ] Both remaining blockers cleared (credentials, and a real device).
- [ ] Sandbox purchase verified on a real device.
- [ ] 14-day closed test complete on Play.
- [ ] Someone other than the developer has used the app for a day and reported nothing broken.
