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

## The quality bar

This is a product real money is going into, and real sellers will pay per listing. It has to
look and behave like something built by people who care, not like a demo. Every session
holds to this:

- **Nothing on screen is inert.** If it looks like a button, it does something. No control
  is drawn just because the reference had one. When a feature is not built yet, the screen
  says so plainly rather than pretending.
- **Every screen that fetches has three states**: loading, empty, and failed. An empty list
  says what to do next. A failure says what went wrong and offers the retry.
- **No lorem ipsum, no "Example Ltd", no placeholder copy ships.** Stand-in data lives in a
  development seeder and is named as such in PLACEHOLDERS.md.
- **Forms show the API's own message.** Validation errors land on the field that caused
  them. The apps never invent an error the server did not give.
- **Money and counts are never faked.** A credit balance, an offer count and an expiry date
  come from the API or they are not shown.
- **Real devices decide.** The web preview is for judging layout. Fonts, safe areas, the
  keyboard, the keychain, push and in-app purchases only tell the truth on a phone.
- **Slow is a bug.** Lists paginate, images are thumbnails until they need to be full size,
  and reference data is cached.
- **If something is half-finished, it does not merge without being written down** in
  PLACEHOLDERS.md or the phase notes.

## Working rules for every session

- Read this file at the start of every session.
- Complete only the current phase. Commit in logical steps with clear messages.
- Run the test suite and Pint before finishing.
- End every session by reporting what was built, what was tested, and what the next phase needs
  from the user (API keys, store accounts, and so on).
- If anything is unspecified, ask rather than guess.

## Scope as it stands

The specification above describes five markets and five languages. That is the
plan; it is not what launches. **Launch is North Macedonia alone, in Macedonian
and English, with prices in euro only.** Nothing for the other markets has been
deleted — all of it is closed rather than removed:

- **Markets**: `countries.active` decides. Kosovo, Albania, Serbia and Bulgaria
  are seeded inactive, with their cities, dialling prefixes and currencies.
  Flipping one to active is the whole job: `/countries` starts returning it, its
  dialling prefix appears on the sign-in screen, listings can be created there,
  and the country chooser reappears in search, in the filter sheet and in the
  sell flow, because all of those are driven by what the API answers.
- **Languages**: `config('app.supported_locales')` in the API and
  `SUPPORTED_LANGUAGES` in the app. Albanian, Serbian and Bulgarian are fully
  translated and still bundled, listed as planned. Shipping one is a line in
  each place.
- **Currency**: `SHOW_LOCAL_CURRENCY` in `app/src/market.ts` is off, so prices
  are euro only. The exchange-rate job, the endpoint and the formatting all
  still work; turn it on when a market that does not use the euro opens.
- Store availability for phase 12 is **MK only**, not the five originally listed.

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
- Phase 10: complete (sell flow, photos, credits sheet, My Listings).
- Phase 11: complete (conversations, thread, profile, language switcher, account deletion).
- Phase 12: complete (app.json, EAS, icons, push registration, /docs, store copy, screenshots,
  privacy and data-safety answers, pre-submission checklist). **All twelve phases are done.**
- Blocking another user is built (Apple 1.2 / Play UGC), after phase 12.
- **Going live is `docs/deployment.md`**: Hetzner CX22 + Laravel Forge + Cloudflare R2,
  about €16/month, with the server files in `deploy/`. Two things there fail silently and
  are the first place to look when the marketplace "just stops" — the queue worker and the
  scheduler, which four jobs depend on and none of them complains about. The site's web
  directory is `/api/public`, not `/public`: this is a monorepo and Laravel is a
  subdirectory of it.
- Before submitting anything, read `docs/store/pre-submission-checklist.md`. Two things still
  block a release: every credential in `PLACEHOLDERS.md` is a placeholder, and nothing has run
  on a real phone.
- The web build is previewed by a headless browser in `tour.js`, which signs up and walks
  every screen. It is not a substitute for running on a device: native fonts, safe areas
  and the keychain only behave properly there.

## Running on a device

- **Testing against your own PC**: `docs/local-api-on-windows.md`. Laragon for PHP and
  MySQL, `php artisan serve --host=0.0.0.0`, a firewall rule for port 8000, and
  `APP_URL` set to the PC's own address — get that last one wrong and the app loads
  but every photograph is a grey box, because the phone is asking itself for them.
- **The API address is settable on the phone** for a build made with
  `EXPO_PUBLIC_ALLOW_API_OVERRIDE=1` (the iOS workflow's `settable_api` input, on by
  default). Profile → Server. A PC on a home network is whatever address the router
  handed out that morning, and without this every new lease meant another
  twenty-minute build. Saving checks the address before keeping it and puts the old one
  back if nothing answers. **Released builds never set the flag**, so the screen is not
  drawn and any saved value is ignored — an app anyone could point at another server
  would be a way to harvest sign-in codes.

- **The iOS build works, on Xcode 26.2 and nothing else.** Expo SDK 57's
  `expo-modules-jsi` does not compile as shipped on any Xcode the runner carries: 26.0
  and 26.1 reject `weak let`, which the package needs because those classes are Sendable
  and the property cannot be a `var`; 26.2 takes it but rejects the package's own Swift 6
  language mode with eight data-race errors; 26.3 adds a C++ interop error on top.
  `app/scripts/patch-expo-jsi.js` runs from `postinstall` and drops the package to
  language mode v5 — then puts back `BareSlashRegexLiterals` and `IsolatedDefaultValues`,
  because v5 switches off *everything* Swift 6 turns on and the sources use those two
  (a regex guarding `eval`, and a stored-property default calling an actor-isolated
  initialiser). So the only thing loosened is the data-race checking. Every edit is
  idempotent and stops applying the day Expo fixes it upstream.
- **Because of that patch, the iOS build takes `EXPO_USE_PRECOMPILED_MODULES=0`.**
  Expo ships six modules as prebuilt xcframeworks — ExpoModulesCore, ExpoImage,
  ExpoFont, ExpoFileSystem, ExpoImageManipulator, ExpoModulesWorklets — while
  ExpoModulesJSI is the one package always built from source. That mix only holds while
  our JSI build is ABI-identical to the one Expo compiled those binaries against, and
  changing the Swift language mode changes **symbol mangling**: prebuilt
  ExpoModulesCore asked for `JavaScriptActor.runIsolated` under its Swift 6 name, the
  framework we built exported the Swift 5 one, and nothing noticed until the phone
  launched it, because `-undefined dynamic_lookup` defers every React and JSI symbol to
  load time. dyld killed it at launch: `Symbol missing`. Compiling everything together
  removes the coupling. **A build that compiles is not a build that runs** — this one
  linked clean and died on the device, and only the `.ips` crash log said why.

Development happens on Windows, where no iOS code can be compiled and the simulator does
not exist. `docs/device-testing.md` is the way round it: `.github/workflows/ios-unsigned-ipa.yml`
builds an unsigned `.ipa` on a GitHub macOS runner, and Sideloadly or AltStore signs it
with a free Apple ID on the way onto the phone. That build cannot do push or in-app
purchases — both entitlements need the paid Apple Developer Program — and it expires after
seven days, but everything else is real. The app already degrades for both: push
registration failures are swallowed at sign-in, and the credits sheet says purchases are
unavailable rather than pretending. Once the paid account exists, `eas build` signs and
installs over the air and none of this applies.

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
  what being featured buys — it is a paid placement, confirmed as such — and it matches
  the specified default of featured first, then bumped_at descending. One name for it
  everywhere, `search:top`, on the ribbon at every card size; "special offer" implied a
  discount, which a promotion is not. **Nothing can be promoted from inside the app yet**:
  it is sold from My listings, where `PromoteSheet` lets a seller set a budget and
  everything follows from it: `credits.promote.days_per_credit` (two) turns credits into
  days, and `ListingService::promote()` spends through CreditService like publish and
  renew. Time still running is added to rather than overwritten, the same bargain renewing
  makes. **The benchmark is measured, never estimated.** `PromotionBenchmark` reads the
  ledger for the quartiles of what other sellers spent, and returns null until
  `benchmark_min_sample` promotions exist — the sheet then shows no comparison at all,
  because a made-up range would be advice about someone's money.
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
- **The product is called Autevo**, a coined name rather than a word in any of the
  region's languages, so it reads the same in Macedonian and English and nothing has to
  be translated. It is the app name, the slug and the wordmark in the header, and the
  store listings, bundle identifier (`mk.autevo.app`) and domain are all built on it.
- **Saved vehicles are a two-column grid.** A compact card variant shrinks the type and
  the chips and shows the three specifications that earn their place at half a screen
  wide. The cross-border marker sits on the photo rather than in the text, so two cards
  side by side always line up.
- **Search is a builder, not a list.** The search tab holds the query box, a grid of the
  popular makes and collapsible sections for condition, price, technical and location. The
  button along the bottom always says how many cars the current search would return, so
  nobody has to run it to learn whether it is worth running. Results live on their own
  screen with their own header, sort control and Save search.
- **Three things in the reference are deliberately absent**, because the specification puts
  them under "do not build": the price rating bars, financing, and seller star ratings. The
  reference's vehicle-type row — car, van, motorbike, caravan — is gone too, since the
  marketplace sells cars only. Body shapes are a different thing and are on the home
  screen, below.
- **Make logos are supported but not shipped.** `makes.logo_path` holds the file,
  `MakeResource` exposes `logo_url`, `MakeTile` draws it tinted to the text colour, and
  `php artisan makes:logos` links files dropped into `makes/` on the storage disk. A make
  with no file falls back to a monogram, so logos can be added a few at a time.
- **The tab bar mirrors the reference app, not the specification's list.** The spec named
  Search, Favorites, Sell, Messages and Profile. The tabs are Search, My searches, Home,
  Saved and Sell, with messages and the profile reached from the header, which is where
  the reference app keeps them. **Home sits in the middle, drawn as a raised azure disc**
  that stands above the bar, so the way back to the front of the app is the one thing
  down there the thumb cannot miss. Because the disc is azure, the other four mark
  themselves active by going white against the muted rest — two azures in one bar and
  neither would lead. **The disc is drawn outside the navigator**, as a
  sibling of it in the tabs layout, because Android never delivers a touch to a child
  drawn outside its parent's bounds — drawn inside the bar, the part standing proud
  would be dead there. Its parent is the whole screen instead, so every pixel of it
  is live. `CentreTabButton` keeps the bar's own slot, hit area, accessibility and
  label, and the disc hides itself from a screen reader rather than announcing the
  same tab twice. `CentreTabButton.tsx` owns the bar's vertical geometry — the height,
  the slot, the label metrics — since the disc has to land exactly on a slot it is no
  longer inside of; `CENTRE_TAB_OVERHANG` falls out of it, and anything pinned
  directly above the bar pads its own contents by that much. The profile stays two taps away, so account deletion
  inside it is the second tap and the App Store requirement still holds.
- **The home screen is a way in, not just a list.** Above the newest cars sit two
  sections a buyer with nothing to type can use: collections ("Family cars", "First
  car", "Electric & hybrid") and body shapes. Both come from `GET /browse`, and every
  number on them is **counted against live listings** by `BrowseService` — a category
  that says how many cars are behind it is one a buyer can judge before tapping, and an
  estimated number would be a wrong one. A collection with nothing in it is not shown
  at all, because an empty category is a worse tap than no category, and the busiest
  comes first. The collections live in `config/listings.php` like every other closed
  vocabulary, and each carries its own filters to the app, so tapping one runs the same
  search the search tab runs rather than the app keeping a second idea of what "a family
  car" means. The line under a collection's name is written from those same filters, so
  it can never describe something different from what it searches for.
- **A collection can wear commissioned art, and falls back to a real car.** The card is
  built to the reference app's shape: a scene across the top, a cut-out car standing on
  the join between the scene and the card, then the name and the filters as chips. The art
  lives in `app/assets/collections` and is listed in `collectionArt()`; each entry carries
  its cut-out's proportions, because a low saloon drawn at an SUV's is a squashed saloon.
  Family cars, First car, Premium and City cars have art. Every collection without it — and every body shape —
  shows the newest live listing matching those filters instead, photographed by whoever is
  selling it, and the card is the same height either way: without a car standing on it the
  scene simply takes the space the car would have overlapped.
- **Automatic was removed as a collection**, and Low mileage became City cars. Automatic's
  only chip repeated its own name, which is what a category that is one filter looks like;
  a collection has to describe a kind of buyer, not a checkbox. City cars is hatchbacks and
  coupés, which is why **`body_type` is a list now**, like `fuel` — somebody after a city
  car means either shape, not one of them.
- **The home screen reads: browse by need, the newest cars, browse by shape, then the one
  question.** Categories first for a buyer with nothing to type, cars next because they are
  what people came for, shapes after that, and the question last, at the bottom where it
  interrupts nothing.
- **"How are we doing?" is a real question with a real answer.** Five faces posting to
  `POST /feedback`, one row per account, which sets `users.rated_at` so it is never asked
  twice — on any device that account signs in on. A score that fails to send says so and
  leaves the faces tappable; a card that swallowed the answer would be worse than not
  asking. Nothing about it is decorative, which is the only reason it is allowed on the
  screen at all.
- **A category wears a car that is actually in it.** Where there is no commissioned art,
  the photograph on a collection or a shape card is the newest live listing matching those
  filters, taken by whoever is selling it — not a studio render of a car nobody can buy. It costs nothing to licence,
  it changes as the catalogue does, and a category whose cars were all listed without
  pictures falls back to its mark rather than borrowing another category's car.
  `BrowseService` hands each card a different car where there is one to spare, so a rail
  is not the same photograph six times. In development the seeded cars' photographs come
  from `api/scripts/fetch-car-photos.js` — see PLACEHOLDERS.md, and note that some are
  CC BY-SA and must never appear in a store screenshot.
- **Both browse rows scroll sideways.** A card and a half in view is what says there are
  more; a grid showing all of them at once is a wall to read rather than a rack to flick
  through, and it pushed the cars themselves off the bottom of the screen. The rails run
  to both edges of the display while the first card still lines up with everything above.
- **A listing gets its shape from its model, and the seller confirms it.** Nothing in the
  sell flow asked what a hatchback is and nothing set the column, so every real listing was
  shapeless: browsing by shape would have found nothing in production, the `body_type`
  search filter did nothing, and the City and Family collections would both have been
  empty. All 176 seeded models now carry the shape their range is usually built in — a Golf
  is a hatchback, a Tiguan an SUV — and `ListingService` gives a draft that shape when the
  model is picked. It is a starting point, not an answer: our list names ranges and not
  variants, so a Passat Variant would be filed as a saloon, and estates are half the cars
  in the region. So the sell flow asks, in `sell/shape`, with the model's guess already
  chosen — one more screen inside step 2, which still reads "step 2 of 7". Once the seller
  has chosen, changing the model never overwrites them.
- **A body shape shows a cut-out car where there is one, and a drawing where there is
  not.** `app/assets/shapes` holds one per shape — saloon, hatchback, estate, SUV and coupé
  so far — trimmed to the car's own edges by `app/scripts/trim-cutout.php` so every tile
  scales the same thing rather than whatever margin its canvas happened to have. They are
  studio cut-outs, never scenes: at forty-four pixels tall a photograph of a car in a
  street is unreadable, and one particular car cannot stand for every car of its shape.
  A light car reads on the petrol card and a dark one does not, which is worth remembering
  when a new one is chosen.
- **The remaining shapes are drawn, not photographed.** A photograph of a car means one
  particular car, and each of these stands for every car of its shape, so
  `BodyTypeTile` holds ten silhouettes in one 64 x 26 box on a common ground line. Each
  has to be recognisable from its roofline alone at a third of a screen wide, which is
  the only size it is ever drawn at — they were drawn against a rendered contact sheet
  rather than by eye, because the first pass made a saloon, a hatchback and an estate
  that were the same picture.
- **The app opens without an account.** Browsing, keeping a shortlist and saving a search
  involve nobody else, so none of them asks for a telephone number: the root layout no longer
  redirects a signed-out person to sign-in, and the sign-in screen has a way out. What a guest
  keeps lives on the phone (`src/guest/store.ts`, AsyncStorage) and `mergeGuestData()` uploads
  it to the account the first time they sign in, clearing the local copy only once each row is
  safely across — an interrupted merge leaves everything it did not send still on the phone.
  **A saved car keeps a copy of the card, not just its id**, because reading a listing counts a
  view against it, and a buyer opening their own shortlist must not inflate the view count of
  every car in it. `useFavorites()` and `useSavedSearches()` hide which of the two stores is
  answering, so no screen knows. `AuthProvider` empties the whole query cache whenever the
  account changes, including the public queries — a search result depends on who is asking too,
  because blocking hides cars as well as people.
- **What needs an account is what involves another person**: selling, messaging, calling and
  reporting. `useRequireAccount()` gates each one at the point it is needed and says why on the
  sign-in screen (`auth:why.*`), rather than hiding the control or letting it fail. Nothing a
  guest can see is inert: the Call button reads "Sign in to call", because the API does not send
  a guest the number and a button should say what pressing it will do.
- **A seller's telephone number needs an account to see.** Search is public and carries the
  seller on every row, so without this one walk of the pages harvested every seller in the
  country. `SellerResource` gates only the number; the name and kind of seller still show, so a
  card says who is selling. It is also the reason the signed-out rate limit can afford to be the
  loosest of them.
- **Every route is rate limited** (`config/rate_limits.php`). Laravel 11 applies no throttle by
  default and none was added until this, so only the two OTP routes and starting a conversation
  had a ceiling. Counted against the account where there is one and the address where there is
  not, in separate buckets, because a mobile carrier puts thousands of subscribers behind one
  address. The RevenueCat webhook is exempt: a dropped delivery is a purchase that granted
  nothing, and the shared secret already guards it.
- **The sign-in code has no Confirm button.** It is checked the moment the sixth digit
  lands, so nobody hunts for a button after typing something they just read off a
  notification. `CodeField` draws one box per digit over **one** real text field, not six:
  six fields each own a digit and have to hand focus back and forth, which breaks on paste,
  on held backspace and on the phone filling it in — most of how a code is actually
  entered. The caret is hidden because the lit box is the caret. A refused code turns the
  boxes red and clears them; a connection that failed keeps the digits and shows a retry,
  because throwing away six digits somebody typed correctly is not their mistake. The row
  under the boxes keeps the height the button used to take, so the screen never jumps
  between checking, failed and neither.
- **Both auth screens wear the mark.** They were the only screens in the app without it —
  every other one carries it in a header — and a bare form on a black page could belong to
  anybody. Mark at the top, form under it: centring the pair put a third of a screen of
  nothing above the mark, and on a phone a form wants to be near the thumb and clear of
  the keyboard. The terms hold the floor so the page is anchored at both ends.
- **The home screen's app bar gives up the top, and the search bar takes it.** Scrolling
  fades and lifts `TabHeader` away, and the search bar — child zero of the scroll view,
  pinned by `stickyHeaderIndices` rather than by anything we animate — settles at the top.
  **Nothing is drawn behind it**: the cars run underneath the pill, into the gutters beside
  it and through the gap above it. A strip carrying the bar reads as a box stuck to the top
  of the screen, which is the opposite of floating.
- **The search bar is solid while it is part of the page and glass once it floats.** As it
  pins, its opaque fill fades out to leave the blur that was behind it all along: `expo-blur`
  at intensity 72, tinted by the `glass` token far enough that the placeholder holds up over
  a bright photograph sliding past underneath — a see-through field nobody can read is worse
  than no effect at all. A blur alone is a smear, so a lit top edge and a raking gloss give
  the pane its thickness. There is no drop shadow: a shadow needs an opaque caster, which is
  the one thing this cannot have, and on a near-black page it cast nothing worth keeping.
  Android draws no blur at all without `experimentalBlurMethod="dimezisBlurView"`.
  `SearchBar` gained a `translucent` prop for it, so the glass behind provides the fill and
  the field does not paint its own. The gloss is fixed, not a sweep — a shimmer on every scroll would be
  the loudest thing on a screen whose job is to show cars. The faded bar is still drawn
  over the pinned search bar, so it drops `pointerEvents` once it is gone; without that the
  search bar would be dead exactly where it floats. The bar's height is measured rather
  than assumed, because the phone's text size setting decides it.
- **The home screen follows the reference app closely**: header, search bar, a wide banner
  where their advertisement sits, a section header with a Show all link, and cards with a
  small thumbnail on the left rather than a full-width photo. The banner carries a deep
  brand blue in both schemes, because a full-width block of the light accent is glaring
  against a near-black page.
- **Onest sets the app; Sora sets the wordmark.** Sora contains **no Cyrillic at all** —
  not an unloaded subset, no glyphs — so every screen in Macedonian, the launch language,
  fell back to the phone's own face, and any Latin beside it (a make, a price) stayed in
  Sora: one line, two typefaces. Onest covers both scripts, was drawn with Cyrillic as a
  first-class script, and sits within a couple of percent of Sora on the two measurements
  that decide apparent size — x-height 527 against 534, cap height 707 against 730 — so the
  12 · 13 · 15 · 17 · 22 scale carried over untouched. Sora stays for the word AUTEVO, which
  is always Latin and is the brand rather than the interface; the mark beside it is SVG
  paths and never needed a font. Check a candidate before trusting it: read the font's own
  cmap, because "supports Cyrillic" on a foundry page and 0 mapped codepoints in the file
  is exactly the gap this fell into.
- **The identity is Autevo: petrol and azure, Onest with Sora for the wordmark, dark only.** The mark is a leaning
  A with three azure motion wedges running into it, drawn by a designer and handed over
  as flattened paths — the letter already carries its nine degrees, so nothing
  transforms it. The wedges thin out as it shrinks: all three at 32 and above, two from
  20, the letter alone below that. `Wordmark.tsx` exports the paths, and the icon
  generator and the Play feature graphic draw the same ones. Petrol `#0E2E2A` carries every surface;
  azure `#1E6FD9` is the only action colour, so anything azure has to be tappable.
  Cards are flat with a one-pixel border — there are exactly two elevations, flat and
  the sheet shadow. Radii are 6 for chips and inputs, 10 for buttons, 16 for cards.
  Spacing is 4/8/12/16/20/24/32/40/56 and nothing between.
- **The app is dark whatever the phone is set to.** `useAppTheme()` returns the dark
  theme and never reads the device. The light tokens stay correct because the store
  icon and the splash tile are drawn on paper, and because switching back is one line.
- **The type scale sits a notch below the obvious one**: 12 · 13 · 15 · 17 · 22, with body
  at 15/22. Sora's cap height is most of its em, so it renders larger than a system face
  at the same point size; set at 16 and 20 the app read as a tablet layout shrunk down.
  Control heights follow it — 44 for an input, 34/42/48 for the three button sizes, 22 for
  a bar or header icon — so nothing is a touch target smaller than it looks.
- **The mark is on every screen.** Each tab wears `TabHeader` (account, wordmark, messages)
  and every screen in the stack wears `StackHeader`, which positions the wordmark absolutely
  rather than laying it out between the back arrow and the actions, so it is in the same
  place whatever sits beside it; the screen's own title goes on the line below. Two bars
  carry the mark without the word, beside the back arrow: the sell flow's, whose middle is
  the step count, and a thread's, whose middle is who it is with.
- **Nothing sets the tab bar's height by hand.** The navigator's stock bar is 49 tall and
  gives each item 7.5 of margin and 5 of padding, which leaves 25 for a 22 icon and its
  label — on a phone with no bottom inset the label is drawn outside the item and cut in
  half, and `numberOfLines` clips it rather than letting it overflow. The item's margin is
  dropped, the label is `flexShrink: 0` so it is not the thing that gives, and the height is
  56 plus whatever the device keeps below it. Every pinned bar — the sell footer, the Call
  and Message bar, the composer, the Save search pill — takes the same inset from
  `useBottomInset`, and keeps its own background to the bottom edge rather than letting the
  page show through beneath it.
- **Text follows the phone's size setting, but only to 1.3×.** iOS Dynamic Type and
  Android's font scale both reach 2× and beyond, which turns a row with a fixed height into
  a row with its label clipped.
- **Only one thing on a screen is azure.** Two outlined accent buttons side by side (the
  results row's Contact and Park, the search builder's More filters beside the offer
  count) shout equally and nothing leads, so the secondary of a pair takes the quiet
  neutral fill instead.
- **The search builder's closed sections are one card with hairlines**, not four cards
  floating apart, and an open section rules off its header. `AccordionCard`'s `bare` prop
  is what lets a section sit inside a `ListGroup`.
- **The design system was rebuilt once, in phase 10, after the first pass read
  as a wireframe.** The rules that came out of it: one button language, where
  only the primary is filled and secondary actions take a soft neutral fill
  rather than a row of outlines all shouting equally; no empty circle on an
  unselected row; a long list is one card with dividers (`ListGroup`), never
  forty floating cards; cards carry one quiet metadata line rather than chips
  that wrap and make every card a different height; neutrals carry a little of
  the accent's hue, because flat grey beside a saturated blue reads as cheap;
  and elevation is for the few things that genuinely sit above the page.
- **Manufacturer marks are real.** `api/scripts/fetch-make-logos.js` pulls them
  from Simple Icons, whose files are CC0, and renders flat PNGs that the app
  tints to the text colour, so one file works in light and dark. Run it, then
  `php artisan makes:logos`. A make with no mark still falls back to a monogram.
- **Push registration belongs to sign-in, not to first launch.** The permission prompt arrives
  once an account exists, so it has something to explain it, and the native device token — not
  an Expo push token, because the API talks to FCM and APNs directly — is sent to
  `POST /device-tokens`. Signing out and deleting an account both forget the token first.
- **Store screenshots are captured from the running app** by
  `app/scripts/store-screenshots.js`, at both store sizes and in both languages. They are never
  mock-ups, so a screenshot that looks wrong is a bug: the first run of it caught euro prices
  still carrying a denar line in the results list.
- **The icon set is generated** by `app/scripts/make-brand-assets.js`: the mark drawn as SVG,
  rendered to the icon, the Android adaptive and monochrome layers, the splash and the
  notification silhouette. No font has to be installed for it to build. The tile is petrol,
  not paper, so the Android background layer and `adaptiveIcon.backgroundColor` follow it.
  Where a platform strips colour — Android's themed icon, its notification icon — the wedges
  are dropped and the letter stands alone.
- **Blocking hides, it never deletes.** `user_blocks` is one row per direction, and everything
  asks `BlockService::eitherWay()`: search, the listing policy, the conversation policy, the
  conversations list, saved cars and the saved-search job. Unblocking gives all of it back,
  including the thread, exactly where it was. It cuts both ways on purpose — a block that only
  worked in one direction would be an invitation to carry on from the other side.
- **A bearer token counts even where none is required.** `ResolveOptionalUser` runs before
  everything else on the API routes, because search and reading a listing carry no auth
  middleware and `$request->user()` would otherwise answer from the default guard and ignore the
  token. Blocking silently did nothing on exactly those two screens until this existed.
- **Messaging is polled, not pushed.** The thread asks every five seconds while
  it is open, the list every fifteen while it is on screen, and neither costs
  anything when it is not. Opening a thread marks it read once rather than on
  every poll. Push notifications already exist for saved searches and expiring
  listings; wiring them to messages is a phase of its own.
- **A message button always reaches the same thread.** `POST
  /listings/{id}/conversations` reopens the existing one rather than starting
  another, so the button needs no state of its own.
- **The account's language follows the account.** A signed-in user's
  `preferred_language` overrides the device on every launch, and the profile
  switcher changes the app immediately and then saves it.
- **The sell flow is eleven screens counted as seven steps.** One decision per
  screen, as the specification asks, but the counter says "step 2 of 7" while the
  seller answers year, kilometres, fuel and gearbox: it is honest about how much is
  left, where "step 5 of 11" would only look longer. The bar across the top moves per
  screen, so answering anything visibly gets somewhere.
- **Every step writes the draft before it advances.** `SellProvider.save()` creates
  the listing on the first step and updates it on every one after, so closing the app
  halfway leaves a draft on the server rather than losing the work. Resuming jumps to
  the first thing still missing, not back to the beginning.
- **Sorting is a sheet, not a button that cycles.** Cycling made someone tap four times
  to reach the fourth ordering and never showed them what the others were. `SortSheet`
  lists all five with the icon that says which way each runs and a tick on the current
  one. **Save search only appears once something has been narrowed down** — a filter or a
  query — because saving a list of every car is not a search, and Show all from the home
  screen replaces the filters with the newest-first list rather than carrying whatever
  the search tab was last holding.
- **Results are paged, not endless.** A buyer comparing cars needs to know where they
  are and be able to get back to it, and an endless list gives them neither. `Pager`
  sits under the list — Back, "Page 2 of 5", Next — both in the quiet fill, because the
  screen's one filled button is Save search. Turning a page scrolls to the top of it,
  `keepPreviousData` holds the current page on screen while the next is fetched so the
  list never empties, and changing the filters resets to page one. The home screen shows
  the eight newest and sends the rest to Show all.
- **Saved searches are a real tab.** `GET /saved-searches` fills it; tapping one puts its
  filters back into the search the whole app shares and opens the results, so it runs
  exactly as it did the day it was saved. There is no endpoint for editing one, so nothing
  on the screen pretends there is: a search is run or it is deleted. A tab screen is never
  unmounted, so the list refetches on focus and saving from the results invalidates it.
- **The launch screen is held until the app has something to show.** The native splash
  stays up for the typeface, then hands over to `BootScreen`, which is drawn to match it
  exactly — same mark, same ground — so nothing flashes between the two. `useWarmUp`
  fetches the reference data and, for a signed-in account, the home screen's own cars
  while it is still up, so the app opens finished rather than filling in one panel at a
  time. It is a warm-up, not a gate: anything that fails is left to the screen that needs
  it, and after six seconds the app opens regardless, because a slow connection should
  mean a screen still loading, never a launch that never ends. The six cards above the
  fold have their photographs warmed too, since a card's text arrives with the listing
  but its photograph is a separate request. Nothing else is fetched at launch: the other
  tabs load when they are opened, each with its own three states, and a launch that
  fetched everything would make every buyer pay for screens most never open.
- **`GET /vocabularies`** serves the closed vocabularies (body types, drivetrains,
  colours, feature keys) so the app never keeps its own copy of a list the API
  validates against. Public, like the other reference endpoints.
- **Photographs upload differently on each platform.** React Native sends a file as
  `{uri, name, type}`; a browser needs the bytes, so the web build reads the blob back
  out of the picker's uri. Both send one multipart part the API reads the same way.
  The client resizes to 1600px at quality 0.8 first, and the server resizes again
  regardless.
- **Credit pack prices are shown to the cent.** `formatEur` rounds, which is right for
  cars and wrong for 1,50 €, so `formatEurExact` writes the cents the region's way.
  Where the store has told us its own price, that wins: the store is what charges.
- **The app never grants a credit.** A purchase completes on the device before
  RevenueCat has told the API, so the sheet refetches the balance until it rises, and
  says the credits are on their way if that takes longer than it should.
- **`php artisan credits:grant {phone} {amount}`** is the support tool for a purchase a
  store took but never reported. It goes through CreditService like everything else, so
  the grant lands in the ledger as an admin grant.
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

- **PHP 8.4 is the floor, not 8.2.** The specification says 8.2+, and `composer.json` said
  `^8.2`, but the lock file pins Symfony 8, which requires 8.4.1 — so the promise could not
  be kept and nobody on 8.2 or 8.3 could `composer install`. `require.php` is `^8.4` now,
  and `config.platform.php` is pinned to 8.4.1 so a future `composer update` resolves
  against what production runs rather than whatever PHP the machine doing the update
  happens to have. That drift is exactly how `^8.2` came to be locked to packages needing
  8.4.1 in the first place.

- The dev/test database is MySQL-compatible. In this container MariaDB is used; start it with
  `mysqld_safe --skip-syslog &`. Databases: `marketplace` (dev) and `marketplace_test` (Pest).
- `/api/.env.testing` points the test suite at `marketplace_test`.
- Useful commands from /api: `php artisan migrate:fresh --seed`, `./vendor/bin/pest`,
  `./vendor/bin/pint`.
