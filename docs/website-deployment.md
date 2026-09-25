# Putting the website online

`api.autevo.mk` is the API. This is about **`autevo.mk`**, the thing a person
opens in a browser: `/web`, React and Vite, talking to that same API.

It is a **static site**. `npm run build` produces `web/dist` — HTML, JavaScript,
CSS and fonts, nothing that runs on a server — so there is no PHP, no database
and no queue worker to look after. That is why the first option below is free.

Fifteen minutes, whichever route you take.

---

## Decide which of the two

**Cloudflare Pages** is the recommended one. Free with no traffic ceiling worth
worrying about, served from Cloudflare's network rather than one box in
Nuremberg, rebuilds itself on every push to `main`, and your DNS and the photo
bucket are already at Cloudflare. It also leaves the API's 2 vCPU entirely to
the API.

**A second Forge site** on the same server is the other. One box, one place to
look, no second account. It costs the server a little CPU on each deploy, and
a visitor in Skopje is fetching from Germany rather than from a nearby edge.

Both serve exactly the same files.

---

## Route 1 — Cloudflare Pages

### 1. Create the project

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
**Connect to Git**, and pick `londdzz/marketplace`.

### 2. Build settings

This is a monorepo, so the root directory matters:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | `web` |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |

### 3. Environment variables

If the build fails on a syntax error inside a dependency, add this under
**Settings → Environment variables → Production**:

| Name | Value |
|---|---|
| `NODE_VERSION` | `22` |

Vite 7 needs Node 20 or newer, and an older builder image defaults to 18 with
an error that does not say so. Newer ones detect Node 22 on their own — the
log's `Detected the following tools` line tells you which you got.

You do **not** need `VITE_API_URL`. It falls back to
`https://api.autevo.mk/api/v1`, which is where you want it. Set it only if you
ever point the site at a different API.

### 4. The SPA fallback — where it comes from here

**Do not add a `_redirects` file.** Cloudflare now deploys this kind of project
as a **Worker** with static assets rather than as classic Pages, and Workers
Assets serves `index.html` at `/` — so the usual `/*  /index.html  200` rule
resolves back onto itself and the deploy is **rejected**:

```
✘ [ERROR] Invalid _redirects configuration:
  Line 10: Infinite loop detected in this rule. [code: 100324]
```

The build succeeds and every asset uploads; it fails on the very last step,
which makes it look like a deploy problem rather than a config one.

Workers' own answer is `not_found_handling`, and `wrangler` sets it for you the
first time it configures the project:

```jsonc
"assets": { "not_found_handling": "single-page-application" }
```

That is the fallback. Nothing else is needed, and the `_redirects` rule was
redundant as well as refused.

### 5. Deploy, then check the preview URL

The first build takes two or three minutes. It ends at something like
`autevo-marketplace.pages.dev` — open it and click about before touching DNS.

### 6. Point the domain at it

**Pages project → Custom domains → Set up a custom domain**, add `autevo.mk`,
then repeat for `www.autevo.mk`. Cloudflare rewrites the DNS records itself and
issues the certificate.

> `autevo.mk` currently answers **525** — a TLS handshake failure — because
> its record points at the API server, which has no certificate for that name.
> Adding the custom domain replaces that record and the 525 goes with it.

Every push to `main` rebuilds from here on. Nothing else to run.

---

## Route 2 — a second site on the Forge box

### 1. Add the site

Forge → your server → **Sites** → **Add Site**.

| Field | Value |
|---|---|
| Root domain | `autevo.mk` |
| Aliases | `www.autevo.mk` |
| Project type | **Static HTML / Nuxt.js** — not PHP |
| Web directory | `/web/dist` |

`/web/dist`, with the leading slash, for the same reason the API's is
`/api/public`: this is a monorepo and each app is a subdirectory of the clone.

### 2. Install the repository

Site → **Apps** → Git, `londdzz/marketplace`, branch `main`. Leave **Install
Composer dependencies** unticked — there is no PHP here.

### 3. Deploy script

Site → **Deploy Script**, replacing what Forge generated:

```bash
cd /home/forge/autevo.mk
git pull origin main
cd web
npm ci
npm run build
```

`npm ci` rather than `npm install`, so the lock file decides and a deploy
cannot quietly pick up a different version of something.

### 4. Nginx, for deep links

**This is the step that is easy to miss and breaks the thing people do most.**
The site is one HTML file and a router: ask nginx for `/listing/<uuid>` — which
is exactly the URL somebody pastes into a chat — and it looks for a directory of
that name, finds none and answers 404. The car never loads.

Site → **Edit Nginx Configuration**, and replace the `location /` block Forge
wrote with the two blocks in **`deploy/autevo.mk.nginx.conf`**. Leave
everything else alone.

### 5. Certificate

Site → **SSL** → **LetsEncrypt**, both `autevo.mk` and `www.autevo.mk`. If
Cloudflare is proxying the record (an orange cloud), set its SSL mode to **Full
(strict)** — anything less and you are back to a 525 or a redirect loop.

### 6. Deploy

Site → **Deploy Now**.

---

## Check it properly, either way

The first two anyone would try. The third is the one that is actually broken
when the fallback is missing, and it passes silently if you only ever click
links inside the site:

```bash
# 1. The site answers and is served over TLS.
curl -sI https://autevo.mk | head -1

# 2. It is reaching the API. Should list North Macedonia.
curl -s https://api.autevo.mk/api/v1/countries | head -c 200

# 3. A deep link cold-loads rather than 404ing. THIS is the one.
curl -sI https://autevo.mk/search | head -1
curl -sI https://autevo.mk/listing/any-id-at-all | head -1
```

All three of those must be `200`. Then in a browser: open a car, copy the URL
from the address bar, paste it into a new tab. If that shows the car, the
fallback is right.

**CORS needs nothing.** The API answers `access-control-allow-origin: *` and
its preflight already allows the `authorization` header, so a browser on
`autevo.mk` can sign in and carry a token with no change on the API side.

---

## What the website can and cannot do

Everything the app does — search, a car, the shortlist, sign-in, selling,
messaging, my listings, the profile, reporting, blocking, promoting — against
the same endpoints. A car published from a keyboard is the same row as one
published from a phone.

**It cannot sell credits**, and that is deliberate: both stores require a
digital good used inside an app to be bought through their own purchase, so the
credits page lists the packs and says where to buy rather than drawing a button
that would get the app rejected.

**Sign-in uses the same OTP driver as everything else.** While `OTP_DRIVER` is
`log` or `discord`, a code typed on the website arrives wherever the API is
configured to put it, not on the visitor's phone — see `PLACEHOLDERS.md`.

---

## When something breaks

| It looks like | It usually is |
|---|---|
| 525 from `autevo.mk` | DNS still points at the API server, which has no certificate for this name |
| The home page works, `/search` 404s on refresh | The SPA fallback — `not_found_handling` on Workers, the nginx blocks on Forge |
| Build succeeds, deploy fails with "Infinite loop detected in this rule" | A `_redirects` file. Workers rejects `/* /index.html 200`; delete the file and let `not_found_handling` do it |
| Build fails on Cloudflare with a syntax error in a dependency | `NODE_VERSION` is unset, so it built on Node 18 |
| Every panel says it could not load | `VITE_API_URL` is set to something wrong; unset it and it defaults correctly |
| A stale version after a deploy | `index.html` is being cached; it must be `no-cache`, only `/assets/` is immutable |
| Build fails on `check-keys` | A translation key used by the site exists in no language file. Real failure — fix the key, do not skip the check |
