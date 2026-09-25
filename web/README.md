# Autevo for the desktop

The website half of the product, the way mobile.de has an app and a site. React
and Vite in `/web`, talking to the same Laravel API the app talks to.

```
npm install
npm run dev        # http://localhost:5174
npm run build      # dist/
```

`.env.development` points the dev server at `http://127.0.0.1:8000/api/v1`,
which is what `php artisan serve` answers on. Put your own address in
`.env.local` if the API is somewhere else — your PC's own address, say, as
`docs/local-api-on-windows.md` describes. The production build takes
`VITE_API_URL` from the deploy and falls back to `https://api.autevo.mk/api/v1`.

## Why a separate app and not the Expo web build

The app already builds for web — it is how its screens get checked in a
browser. Three things ruled it out as the website:

- **It would have put the app at risk.** The app is being sideloaded and
  tested while this was written. Reworking its layouts for a wide screen is
  exactly the kind of change that breaks a phone in ways a browser does not
  show.
- **A phone-first layout stretched to 1440px is not a desktop site.** What a
  desktop buys is two things at once — filters beside results, photographs
  beside the specification — and that is a different arrangement, not a wider
  one.
- **React Native Web renders only on the client.** A used-car marketplace
  lives on search traffic, and this can be given server rendering later. That
  is not a road the app's build is on.

## The SPA fallback, and why there is no `_redirects`

The site is one HTML file and a router, so a cold load of `/listing/<uuid>` —
the URL somebody pastes into a chat — has to be answered with `index.html`
rather than a 404. Clicking around inside the site never shows this missing,
because the router is already running by then; only a refresh or a pasted link
does.

Every host does it its own way, and **nothing in `public/` handles it**:

| Host | Where the fallback lives |
|---|---|
| Cloudflare Workers, which `autevo.mk` runs on | `not_found_handling: "single-page-application"`, in the Wrangler config |
| nginx, on the Forge box | `deploy/autevo.mk.nginx.conf` |
| Cloudflare Pages, Netlify | a `public/_redirects` holding `/*  /index.html  200` |

A `_redirects` file was added here first, and **Workers refused to deploy with
it**. Workers Assets serves `index.html` at `/`, so `/*  /index.html  200`
resolves back onto itself:

```
Line 10: Infinite loop detected in this rule. [code: 100324]
```

`not_found_handling` is Workers' own answer to the same problem, so the rule
was not only rejected, it was redundant. Add the file back only for a host in
the third row — not while this deploys to Workers.

## What is shared, and what is not

Drift between an app and a website is the usual way one product starts
looking like two. So the parts that can be shared are copied at build time by
`scripts/sync-locales.js`, from the app and from `/docs`:

| Shared | From |
|---|---|
| Every translation, all five languages | `app/src/i18n/locales` |
| `types.ts`, `listings.ts`, `reference.ts`, `auth.ts`, `messaging.ts`, `blocks.ts` | `app/src/api` |
| `formatEur`, `formatKm`, `listingTitle`, … | `app/src/format` |
| The privacy policy and terms | `/docs` |
| The collection art and body-shape cut-outs | `app/assets/collections`, `app/assets/shapes` |

Those copies carry a header saying so and are overwritten on every build —
**edit them in the app, not here.**

Not shared, because they genuinely differ: the transport (`src/api/client.ts`
is `fetch` plus `localStorage`, the app's is the same shape over its own
storage), and every screen.

Two small things travel by hand rather than by the sync, because they are
values and not files: the design tokens, below, and the `carRatio` of each
collection's cut-out car in `src/components/CollectionCard.tsx`, which comes
from `app/src/hooks/useBrowse.ts`. A low saloon drawn at an SUV's proportions
is a squashed saloon, so if one changes there it has to be carried across.

The design tokens in `src/styles/tokens.css` are hand-copied from
`app/src/theme` — same petrol, same azure, same 4/8/12/16/20/24/32/40/56
spacing, same 6/10/16 radii. They are values rather than code, so they cannot
be imported, and a change to the app's theme has to be brought across by hand.

## What the website does

Everything the app does, against the same endpoints — a car published from a
keyboard is the same row as one published from a phone, and a block made in a
browser hides that seller on both.

- **Home** — collections, the newest cars, body shapes, each with a count the
  API measured against live listings
- **Search** — filters beside the results, in the address bar so back, forward
  and sending somebody a link all work
- **A car** — gallery with a full-size viewer, specification, seller, and the
  four things that need an account: call, message, report, block
- **Saved** and **my searches** — the shortlist and the searches kept
- **Sell** — the app's eleven screens as one form, because a phone can hold one
  question at a time and a desktop can hold the lot. The draft is still written
  after every answer, and `?draft=` picks up one started on the phone
- **Messages** — both panes at once, polled as the app polls: the open thread
  every five seconds, the list every fifteen
- **My listings** — renew, mark sold, promote
- **Credits** — the balance and the ledger
- **Profile** — name, dealer, language, blocked people, delete account
- **Sign in** — phone and a code, the same two steps the app uses
- **Privacy, terms, support, delete account** — the pages both stores require
  to be reachable at a public URL

**The one thing a browser cannot do is buy credits.** Both stores require a
digital good used inside an app to be bought through their own purchase, so
the packs are listed with their prices and the page says where to buy. Drawing
a Buy button here would get the app rejected.

## Two things that are the website's own problem

A phone downloads the app once. A browser downloads the site on every first
visit, so two things the app can be careless about are not free here:

- **The typefaces are served from our own domain**, not hotlinked from Google,
  whose CDN would otherwise see every visitor's address on every page load.
  `src/styles/fonts.ts` imports the Latin and Cyrillic subsets of Onest and the
  Latin of Sora — about 65 kB, against 350 kB for the whole families.
- **Only Macedonian and English are bundled.** All five are synced in, because
  the sync copies what the app has, but `src/i18n/index.ts` imports the two the
  site can show. The other three are 80 kB nobody would ever read.
- **Home, search, a car and the shortlist are the first bundle**; everything
  else is a chunk fetched on the click that needs it. Somebody following a link
  to a car should not have to download the sell form and the privacy policy
  first.
