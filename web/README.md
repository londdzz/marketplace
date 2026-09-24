# Autevo for the desktop

The website half of the product, the way mobile.de has an app and a site. React
and Vite in `/web`, talking to the same Laravel API the app talks to.

```
npm install
npm run dev        # http://localhost:5174
npm run build      # dist/
```

`VITE_API_URL` points it at an API; without one it uses
`https://api.autevo.mk/api/v1`. For a local API:

```
VITE_API_URL=http://127.0.0.1:8000/api/v1 npm run dev
```

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

Those copies carry a header saying so and are overwritten on every build —
**edit them in the app, not here.**

Not shared, because they genuinely differ: the transport (`src/api/client.ts`
is `fetch` plus `localStorage`, the app's is the same shape over its own
storage), and every screen.

The design tokens in `src/styles/tokens.css` are hand-copied from
`app/src/theme` — same petrol, same azure, same 4/8/12/16/20/24/32/40/56
spacing, same 6/10/16 radii. They are values rather than code, so they cannot
be imported, and a change to the app's theme has to be brought across by hand.

## What the website does, and what it sends to the app

Browsing is the whole of it, which is what a desktop visitor came for:

- **Home** — collections, the newest cars, body shapes, each with a count the
  API measured against live listings
- **Search** — filters beside the results, in the address bar so back, forward
  and sending somebody a link all work
- **A car** — gallery with a full-size viewer, specification, seller
- **Saved** — the shortlist, for a signed-in buyer
- **Sign in** — phone and a code, the same two steps the app uses
- **Privacy, terms, support, delete account** — the pages both stores require
  to be reachable at a public URL

**Selling and messaging stay in the app**, and the site says which rather than
drawing a control that cannot work. A listing needs four photographs and they
come off a phone. When that changes, the API is already there: nothing here
would need a new endpoint.
