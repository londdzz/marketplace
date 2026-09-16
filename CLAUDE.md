=== PROJECT SPEC ===
Car marketplace
A used-car marketplace for Kosovo (XK), Albania (AL), North Macedonia (MK), Serbia (RS) and Bulgaria (BG). Sellers pay per listing with credits bought through in-app purchase. Buyers search across all five countries in one place. We never handle the car, the money for the car, or any paperwork — we connect buyer and seller.
Differentiator: one search covering all five countries, with cross-border results clearly marked.
Repository layout — monorepo
/api      Laravel 11 backend + SEO website
/app      Expo (React Native) iOS + Android app
/docs     store assets, privacy policy, terms

Stack — do not substitute
Backend: PHP 8.2+, Laravel 11, MySQL 8, Sanctum token auth (not session cookies), Pest for tests, Laravel Storage for images (local in dev, S3-compatible in production), database queue driver in dev.
App: Expo SDK 51+ with TypeScript, Expo Router, TanStack Query, react-hook-form + zod, i18next, react-native-purchases (RevenueCat), expo-image-picker, expo-image-manipulator, expo-notifications, @gorhom/bottom-sheet.
Never in /api: Breeze, Jetstream, Inertia, Livewire, Vue, React, Tailwind config beyond Blade basics.
Never in /app: Redux, styled-components, NativeBase, web-only libraries.
Hard rules — violating any of these is a bug
	1.	Credits change ONLY through App\Services\CreditService, inside a DB transaction using lockForUpdate, writing a credit_transactions row with balance_after on every change. No controller ever touches users.credits directly.
	2.	Store purchases must be idempotent. credit_transactions.store_transaction_id is unique. A repeat of the same ID returns success without granting again. Payment webhooks retry — assume every webhook arrives at least twice.
	3.	Money is never a float. decimal(10,2) in the database, cast 'decimal:2' on the model.
	4.	All prices stored in EUR only. Local currency is computed at display time from exchange_rates. Never store a local-currency price.
	5.	Search must be script-insensitive. Serbian, Macedonian and Bulgarian use Cyrillic. Searching "Пасат" must return listings written "Passat". Everything searchable passes through App\Support\TextNormalizer::normalize() (lowercase, strip diacritics, transliterate Cyrillic to Latin) into a dedicated normalized column, which is the column we query. Incoming queries are normalized identically. This cannot be added later without reindexing everything.
	6.	Authorization via Laravel Policies, never if-statements in controllers. A user can only read or modify their own listings, drafts and conversations.
	7.	The client can never set listing status. A listing becomes active only via ListingService::publish(), which spends a credit.
	8.	All input validated in Form Request classes. No request->all()).
	9.	Every endpoint returns an API Resource, never a raw model.
	10.	Zero hardcoded user-facing strings in either /api or /app. Everything is a translation key. Languages: sq, mk, sr, bg, en. Default sq.
	11.	declare(strict_types=1); at the top of every PHP file. Business logic in app/Services, never in controllers.
	12.	The app must never grant credits locally on purchase success. Only the webhook grants credits; the app refetches the balance.
Database schema
Laravel migrations, one file per table, in this order.
countries: code (char2 PK), currency (char3), phone_prefix, active (bool default true)
cities: id, country_code FK, name, name_normalized (indexed), latitude decimal(10,7), longitude decimal(10,7), population nullable
makes: id, name unique, name_normalized, popular bool default false
models: id, make_id FK, name, name_normalized, body_type nullable, unique(make_id, name)
users (modify Laravel default — make password nullable, auth is phone OTP): phone unique nullable, phone_verified_at, display_name, country_code FK, city_id FK nullable, preferred_language default 'sq', seller_type enum(private,dealer) default private, dealer_name nullable, credits unsigned int default 0, blocked_at nullable
otp_codes: id, phone, code_hash (store a HASH, never the code), expires_at, attempts default 0, consumed_at nullable, created_at, index(phone, expires_at)
listings: id uuid PK, user_id FK, status enum(draft,pending_payment,active,expired,sold,removed) default draft, make_id, model_id, variant nullable, year smallint, mileage_km unsigned int, fuel enum(diesel,petrol,hybrid,electric,lpg), transmission enum(manual,automatic), body_type nullable, engine_cc nullable, power_hp nullable, drivetrain nullable, color nullable, doors nullable, seats nullable, price_eur decimal(10,2), price_negotiable bool, vat_deductible bool, customs_cleared bool nullable, description text nullable, features json nullable (keys not free text), country_code, city_id, latitude, longitude, search_text text, view_count default 0, contact_count default 0, published_at / expires_at / bumped_at / featured_until all nullable timestamps, timestamps, softDeletes.
Indexes: fulltext(search_text); (status, expires_at); (status, price_eur); (status, bumped_at); (status, country_code); (user_id, status)
listing_photos: id uuid, listing_id FK cascade, path, thumb_path, position tinyint, width, height, timestamps
credit_transactions: id uuid, user_id FK, delta int (positive purchase / negative spend), reason enum(purchase,listing_publish,renewal,feature,refund,promo,admin_grant), listing_id nullable FK, store nullable enum(apple,google,promo,admin), store_transaction_id nullable UNIQUE, price_paid_eur nullable decimal(10,2), balance_after int, timestamps
conversations: id uuid, listing_id FK, buyer_id FK, seller_id FK, last_message_at, timestamps, unique(listing_id, buyer_id)
messages: id uuid, conversation_id FK cascade, sender_id FK, body text, read_at nullable, timestamps
favorites: user_id, listing_id, created_at, composite PK
saved_searches: id uuid, user_id FK, name nullable, filters json, notify bool default true, last_notified_at nullable, timestamps
reports: id, listing_id FK, reporter_id FK, reason enum(duplicate,wrong_category,scam_suspected,sold,offensive,other), note nullable, resolved_at nullable, timestamps
exchange_rates: currency char3 PK, rate_per_eur decimal(14,6), updated_at
device_tokens: id, user_id FK, token unique, platform enum(ios,android), last_seen_at, timestamps
API — all under /api/v1, Sanctum Bearer token where authed
Auth: POST /auth/otp/request (rate limit 3 per phone per 15min, 10 per IP per hour) · POST /auth/otp/verify (returns token + user, creates user if new) · POST /auth/logout · GET /me · PATCH /me · DELETE /me (must FULLY delete the account — Apple requires this)
Reference (public, cached): GET /countries · GET /cities?country=MK · GET /makes · GET /makes/{id}/models · GET /exchange-rates
Listings: GET /listings (params q, make_id, model_id, year_min, year_max, price_min, price_max, mileage_max, fuel[], transmission, body_type, countries[], city_id, radius_km, lat, lng, sort=relevance|price_asc|price_desc|newest|mileage_asc, page — returns only status=active, featured first then bumped_at desc) · GET /listings/{id} (increments view_count, throttled per IP per day) · POST /listings (creates draft) · PATCH /listings/{id} · POST /listings/{id}/photos (multipart, max 15, resize to 1600px long edge + 400px thumb server-side) · DELETE /listings/{id}/photos/{photoId} · PATCH /listings/{id}/photos/order · POST /listings/{id}/publish (spends 1 credit, status active, expires_at = now +14 days, 402 if no credits) · POST /listings/{id}/renew (spends 1 credit, +14 days) · POST /listings/{id}/mark-sold · DELETE /listings/{id} · GET /my/listings?status=
Credits: GET /credits (balance + history) · POST /webhooks/revenuecat (NO auth middleware — verify signature instead; idempotent on store_transaction_id)
Messaging: GET /conversations · GET /conversations/{id}/messages · POST /listings/{id}/conversations · POST /conversations/{id}/messages · POST /conversations/{id}/read — max 20 new conversations started per user per day
Other: GET|POST|DELETE /favorites · GET|POST|DELETE /saved-searches · POST /listings/{id}/report · POST /device-tokens
Scheduled jobs (routes/console.php)
Hourly: expire listings past expires_at. Daily 09:00: notify sellers expiring within 48h. Daily 06:00: refresh exchange_rates for ALL, MKD, RSD, BGN. Every 15 min: process saved-search matches and send push.
App screens
Tabs: Search · Favorites · Sell · Messages · Profile
Search: search bar, filter chips, country multi-select, results as cards (photo, price as the largest element, title, year/km/transmission, city + country, "cross-border" badge when the listing country differs from the user's). Infinite scroll. Filter bottom sheet.
Listing detail: photo carousel, price large with local-currency equivalents beneath, spec grid, description, features, seller block, Message and Call buttons, favorite toggle, report action.
Sell flow — multi-step, ONE decision per screen, saving a draft at every step: (1) make → model (2) year → mileage → fuel → transmission (3) photos, min 4 max 15, resize client-side to 1600px / quality 0.8 BEFORE upload (4) price, negotiable, customs cleared (5) location (6) description + features (7) review → publish. If credits are 0, show the credit packs sheet.
Credits sheet: 1 credit €1.50 · 8 credits €9.99 (marked most popular) · 25 credits €24.99. Copy states 1 credit = 1 listing active for 2 weeks.
Also: Messages list and thread (polling is acceptable for v1), My Listings with expiry countdown and Renew, Profile with language switcher and Delete Account.
Design system first, before any screen: /app/src/theme with spacing scale, colors, type scale, plus Button, Card, Input, Badge, Screen, EmptyState components. Every screen uses only these. Must support light and dark mode.
Do not build
VIN decoding, price estimation, financing, insurance, vehicle history, video upload, escrow, delivery, seller ratings, dealer feed imports, an admin UI framework, web payments, or any web frontend beyond SEO listing pages. All are year-two features and every one delays launch.
=== END SPEC ===

---

## Phases — one per session, STOP after each

Never work on more than one phase per session. This is the single most important
instruction in this document. Do not start the next phase until the user says so.

- **Phase 1 — Backend foundation.** Fresh Laravel 11 for MySQL in /api, plus Sanctum and Pest.
  No frontend scaffolding. `app/Enums` backed enums (ListingStatus, FuelType, Transmission,
  SellerType, CreditReason, ReportReason, Platform). `App\Support\TextNormalizer` with
  `static normalize(string): string` handling Serbian and Macedonian/Bulgarian Cyrillic including
  multi-character cases (ж→z, ч→c, ш→s, щ→st, ю→ju, я→ja, њ→nj, љ→lj, џ→dz, ѓ→gj, ќ→kj), with
  Pest tests proving Пасат / pasat / Passat match and Škoda / skoda match. Every migration from
  the schema above with all indexes. Eloquent models with relationships, casts, $fillable, UUID
  keys. Seeders: 5 countries, 30 largest cities with coordinates, 40 regional makes with popular
  flagged for VW/Audi/BMW/Mercedes/Opel/Škoda/Renault/Peugeot/Ford/Toyota, models for each
  popular make, name_normalized populated everywhere. CreditService with grant() and spend() per
  hard rules 1 and 2, with Pest tests covering: spending at zero balance fails and leaves the
  balance unchanged; the same store_transaction_id twice grants once; concurrent spends cannot go
  negative. Run migrations, seeders, tests, Pint. STOP.
- **Phase 2 — Auth.** Phone OTP request and verify with hashed codes, expiry, attempt limits and
  rate limiting. Sanctum token issue and revoke. /me endpoints including full account deletion.
  Pest tests for the full OTP flow including expiry, wrong code, attempt exhaustion and rate
  limits. STOP.
- **Phase 3 — Listings CRUD and photos.** Draft create, update, delete with Policies. Photo upload
  with server-side resize and thumbnails, ordering, deletion, the 15-photo cap. Form Requests and
  API Resources for all of it. Tests including the authorization cases. STOP.
- **Phase 4 — Publish, renew, credits.** ListingService::publish and renew spending credits.
  GET /credits. RevenueCat webhook with signature verification and idempotency. Tests covering
  publish with zero credits returning 402 and a duplicate webhook granting once. STOP.
- **Phase 5 — Search.** Search endpoint with every filter, radius via haversine, sorting,
  pagination. search_text populated on save via a model observer. Tests proving Cyrillic and Latin
  queries return identical results and that every filter narrows correctly. STOP.
- **Phase 6 — Messaging, favorites, saved searches, reports.** Those endpoints with Policies and
  the conversation rate limit. Tests. STOP.
- **Phase 7 — Scheduled jobs and push.** All four scheduled jobs. Device token registration. FCM
  and APNs sending. Tests for the expiry job. STOP.
- **Phase 8 — App foundation.** Expo with TypeScript and Expo Router in /app. Theme and base
  components FIRST. API client with token storage in expo-secure-store, TanStack Query, i18next
  with all five languages, auth screens wired to Phase 2. STOP.
- **Phase 9 — App browse.** Search tab, filter sheet, listing cards, listing detail, favorites. STOP.
- **Phase 10 — App sell flow.** Seven-step flow with draft saving, client-side image resize, credits
  sheet, RevenueCat integration, My Listings with renew. STOP.
- **Phase 11 — App messaging and profile.** Conversations, thread, profile, language switcher,
  account deletion. STOP.
- **Phase 12 — Store readiness.** app.json (bundle id, package name, version, build numbers,
  permission strings in every language, adaptive icon, splash), EAS Build config, IAP products
  credits_1 / credits_8 / credits_25 as CONSUMABLES documented for both stores, account deletion
  reachable in two taps, privacy policy and terms in /docs, App Privacy questionnaire and Play Data
  Safety answers, store copy in all five languages with screenshot specs, availability restricted to
  XK/AL/MK/RS/BG, and a pre-submission checklist (Apple Small Business Program and Google's
  equivalent at 15%, Google Play's 12-tester 14-day closed testing, no payment flow bypassing IAP,
  sandbox IAP tested on a real device). STOP and give the checklist.

## Working rules for every session

- Read this file at the start of every session.
- Complete only the current phase. Commit in logical steps with clear messages.
- Run the test suite and Pint before finishing.
- End every session by reporting what was built, what was tested, and what the next phase needs
  from the user (API keys, store accounts, and so on).
- If anything is unspecified, ask rather than guess.

## Status

- Phase 1: complete.
- Phase 2: complete.
- Phase 3: complete.
- Phase 4: complete.
- Phase 5: complete.
- Phase 6: complete.
- Phase 7: complete.
- Phase 8: complete.
- Phase 9: complete (search, filter sheet, listing detail, favorites).
- Next: Phase 10 (App sell flow).
- The web build is previewed by a headless browser in `tour.js`, which signs up and walks
  every screen. It is not a substitute for running on a device: native fonts, safe areas
  and the keychain only behave properly there.

## Placeholders

`PLACEHOLDERS.md` in the repository root lists every stand-in value that still needs a
real one, what it breaks until then, and which phase introduced it. Read it before any
release, and update it whenever a placeholder is added or replaced.

## Decisions taken along the way

- **OTP delivery is WhatsApp, behind a driver.** `App\Contracts\OtpSender` has a
  WhatsApp Cloud API driver for production and a log driver for development, chosen by
  `OTP_DRIVER`. WhatsApp authentication templates are cheaper than SMS in the region but
  are not free, and they need an approved template per language. WhatsApp coverage is
  strong in Kosovo and Albania; Viber is the everyday messenger in Bulgaria and Serbia,
  so a second channel is needed there before launch. Adding one means writing another
  `OtpSender` and nothing else.
- **Draft listings have nullable vehicle columns**, because the sell flow saves after
  every step. `ListingService::publish()` enforces completeness instead.
- **The reference endpoints** (`/countries`, `/cities`, `/makes`, `/makes/{id}/models`,
  `/exchange-rates`) belong to no phase in the plan, so they were built in phase 3 where
  the make and model pickers first need them. Public and cached for an hour.
- **`GET /listings/{id}` is phase 3** as the read half of CRUD; `GET /listings`, the
  search endpoint, stays in phase 5. `POST /listings/{id}/mark-sold` was built in phase 4
  with the other lifecycle transitions.
- **Publishing needs a complete listing**: make, model, year, mileage, fuel, transmission,
  price, country, city and at least four photos. The 422 names what is missing so the app
  can send the seller back to the right step.
- **Renewing keeps unused time.** Renewing three days into a fortnight gives seventeen
  days, not fourteen, so renewing early is never a punishment.
- **The RevenueCat webhook fails closed.** With no shared secret configured it rejects
  every delivery rather than trusting the caller. It always answers 200 for authentic
  deliveries, including replays and events it will never act on, so retries stop.
- **Short words are matched with LIKE, not the fulltext index.** InnoDB will not index a
  word shorter than its minimum token size, which is exactly the model names buyers type
  most: A4, Q7, X5, C3. Long words go through the index, short ones through LIKE, so
  nothing is silently unfindable.
- **Search tests run outside a transaction** (`tests/Search`, DatabaseTruncation). InnoDB
  only adds rows to a fulltext index when their transaction commits, so a MATCH inside the
  usual test transaction finds nothing the test just inserted.
- **Featured listings lead every ordering**, including an explicit price sort. That is
  what being featured buys, and it matches the specified default of featured first, then
  bumped_at descending.
- **A saved search is validated by the search rules.** `App\Support\ListingFilterRules`
  is shared between the search endpoint and saved searches, so a saved search can never
  hold a filter that search itself would reject.
- **Push sits behind a driver**, like OTP delivery. `App\Contracts\PushSender` has real
  FCM v1 and APNs senders and a log driver, chosen by `PUSH_DRIVER`. A token a store
  reports as gone for good is deleted; a transient failure keeps it for the next run.
- **The expiring-soon job reads a window 24 to 48 hours out.** Running daily, each listing
  passes through that window exactly once, which is what stops a seller being warned about
  the same listing every day. There is no "warned" column in the schema to do it any other
  way.
- **The saved-search job reads a half-open window**, from its last marker up to but not
  including now. Consecutive windows abut exactly, so nothing is lost between runs and
  nothing is reported twice, even though `published_at` only has one-second resolution.
- **Exchange rates: pick the provider carefully.** The European Central Bank publishes
  neither the Albanian lek nor the Macedonian denar, so an ECB-backed feed cannot cover
  three of the five markets.
- **`DevListingSeeder` publishes eight cars with photographs** for development and for the
  screenshot tour. It is never called from `DatabaseSeeder`, and it goes through
  CreditService and ListingService like any other caller, so the photo pipeline, the credit
  spend and the publish path all run for real. The photographs are generated, so the
  repository carries no image files.
- **Development stores photos on the `public` disk**, since the `local` disk is private in
  Laravel 11 and its files are not servable. Production uses S3.
- **The product is called vetura**, Albanian for "the car". It is the app name, the slug
  and the wordmark in the header, and the store listings, bundle identifier and domain
  should all be built on it.
- **Saved vehicles are a two-column grid.** A compact card variant shrinks the type and
  the chips and shows the three specifications that earn their place at half a screen
  wide. The cross-border marker sits on the photo rather than in the text, so two cards
  side by side always line up.
- **The tab bar mirrors the reference app, not the specification's list.** The spec named
  Search, Favorites, Sell, Messages and Profile. The tabs are Home, Search, My searches,
  Saved and Sell, with messages and the profile reached from the header, which is where
  the reference app keeps them. The profile stays two taps away, so account deletion
  inside it is the second tap and the App Store requirement still holds.
- **The home screen follows the reference app closely**: header, search bar, a wide banner
  where their advertisement sits, a section header with a Show all link, and cards with a
  small thumbnail on the left rather than a full-width photo. The banner carries a deep
  brand blue in both schemes, because a full-width block of the light accent is glaring
  against a near-black page.
- **Reopening a conversation is not a new contact.** The daily limit of twenty counts
  threads started, and `contact_count` only rises the first time.
- **`listings:reindex`** rebuilds every listing's searchable text. Run it after any change
  to TextNormalizer or to what goes into that text.
- **A non-euro purchase records no price.** RevenueCat reports the store front currency;
  storing a converted guess would be a number the buyer never saw.
- **Closed vocabularies live in `config/listings.php`**: body types, drivetrains, colors
  and feature keys. The API validates and returns keys; the apps translate them.
- **Photos are always re-encoded server-side**, which enforces the 1600px long edge and
  the 400px thumbnail and strips EXIF, location included. HEIC is refused because GD
  cannot decode it and the app converts to JPEG before uploading anyway.
- **`TextNormalizer` collapses repeated letters**, so Passat and Пасат agree. Digits are
  never collapsed. Cyrillic к always becomes k, so Октавија does not match Octavia.
- **A new account's country comes from the dialling prefix**, falling back to
  `app.default_country` for diaspora numbers, and the owner can change it from their
  profile. Verification also accepts an explicit `country_code`.
- **Response language**: a signed-in user's `preferred_language` wins, then
  `Accept-Language`, then Albanian.
- **`users` keeps a nullable unique `email`** next to `display_name`; there is no `name`
  column and no password login.
- Local development runs MariaDB rather than MySQL 8, since no MySQL 8 package was
  installable in the container. Production stays MySQL 8.

## Local development notes

- The dev/test database is MySQL-compatible. In this container MariaDB is used; start it with
  `mysqld_safe --skip-syslog &`. Databases: `marketplace` (dev) and `marketplace_test` (Pest).
- `/api/.env.testing` points the test suite at `marketplace_test`.
- Useful commands from /api: `php artisan migrate:fresh --seed`, `./vendor/bin/pest`,
  `./vendor/bin/pint`.
