# Putting Autevo live

From a domain you already own to an `.ipa` on your phone talking to a real server.

Work straight down the list. Each part ends with a command that either prints what it
should or tells you what is wrong, so you never move on carrying a mistake.

Everything you copy onto the server is in **`deploy/`** in this repository.

> **The domain is `autevo.mk`, and it is bought.** Everything in the repository already
> uses it — `eas.json`, the iOS workflow, the policies, the store listings and these
> files — so there is nothing to rename. It is also what justifies the bundle identifier
> `mk.autevo.app`, which can never be changed once a version ships.

---

## What you are buying, and why

| | What | Cost | Why this one |
|---|---|---|---|
| Server | **Hetzner Cloud CX22** — 2 vCPU, 4 GB RAM, 40 GB SSD, Nuremberg or Falkenstein | **€4.51/mo** | The closest cheap, reliable datacentre to Skopje (~40 ms). 4 GB is enough for PHP, MySQL and the worker for a long time. |
| Management | **Laravel Forge** | **$12/mo** | It installs and maintains nginx, PHP, MySQL, the TLS certificate, the queue worker and the cron line. You asked not to make mistakes — this is what removes most of the chances to. |
| Photo storage | **Cloudflare R2**, 10 GB free then $0.015/GB | **≈ €0** at launch | **No charge for egress.** A car marketplace serves far more image traffic than it stores; on S3 that is the bill that grows. |
| DNS | **Cloudflare**, free | €0 | Free, fast, and R2 lives there too. |

**About €16/month at launch.** Nothing here needs upgrading until the marketplace is busy.

The server also needs no separate database: MySQL runs on the same box. At this size that
is not a compromise, and it is one thing to back up instead of two.

---

## Part 1 — DNS (15 minutes, then a wait)

You own the domain; this points it at things.

1. Sign up at **cloudflare.com**, *Add a site*, enter `autevo.mk`.
2. It reads your existing records and gives you **two nameservers**.
3. At the registrar you bought the domain from, replace its nameservers with those two.
4. Wait. Usually under an hour, occasionally a day. Cloudflare emails you when it is active.

Then add these records — leave the **proxy off (grey cloud)** on `api`, because Let's
Encrypt has to reach the server directly to issue the certificate:

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `api` | your server's IPv4 (Part 2 gives you this) | **off** |
| A | `@` | the same IPv4, for now | on |
| CNAME | `www` | `autevo.mk` | on |
| CNAME | `img` | the R2 public hostname (Part 4) | on |

Check it before going on — this must answer with your server's address:

```
dig +short api.autevo.mk
```

---

## Part 2 — The server (20 minutes)

> **Do not create the server in the Hetzner console.** Forge creates it for you, through
> Hetzner's API, and picks the operating system image itself. Create one by hand as well
> and you will have two servers and two bills. The only time you build it yourself first
> is the Custom VPS route below, where Forge asks you for an IP address it cannot make.

1. **hetzner.com/cloud** → sign up → *New project*. That is all you do here, except one
   thing: **Security → API tokens → Generate API token**, permission **Read & Write**.
   Copy it; Hetzner shows it once.

2. **forge.laravel.com** → sign up → *Server Providers* → **Hetzner** → paste the token.

3. In Forge: *New server* → Hetzner → region **Nuremberg** or **Falkenstein** → size
   **CX22**, or **CPX22** if the CX line is out of stock → PHP **8.4** → database
   **MySQL 8.4** (or whichever 8.x Forge offers — nothing here cares which). Forge provisions it in about ten minutes and emails you the database
   password. **Save that email** — it is the only time it shows you the password.

4. Forge's server page shows the **IPv4**. That is the address the DNS records in Part 1
   want; go back and fill them in now.

> **Doing this without Forge?** Then you do create the server in the Hetzner console:
> Ubuntu **24.04 LTS** (not the newest release — Forge and these instructions are written
> against the LTS, and a brand-new one is where the surprises live), CX22 or CPX22,
> Nuremberg or Falkenstein, your SSH key. Then install the four files below by hand.

> The four files Forge would have written are `deploy/nginx-api.conf`, `deploy/php.ini`,
> `deploy/autevo-queue.service` and `deploy/autevo-scheduler.cron`. Install them, then
> carry on from Part 5.

---

## Part 3 — The site (10 minutes)

In Forge → your server → *Sites* → **New Site**:

- Root domain: **`api.autevo.mk`**
- Project type: **General PHP / Laravel**
- Web directory: **`/api/public`** ← **not** `/public`

That last one is the single most common mistake here. This is a monorepo: the clone
contains `api/`, `app/` and `docs/`, and Laravel is in `api/`. Point it at `/public` and
you get a 404 on every request with nothing in the log to explain it.

Then *Install Repository*: `londdzz/marketplace`, branch `main`, and **untick "Install
Composer dependencies"** — the deploy script does it from the right directory.

Now set the deploy script: Site → *Deploy Script*, and paste the contents of
**`deploy/deploy.sh`**.

---

## Part 4 — Photo storage (15 minutes)

Photographs must not live on the server. The server is disposable; the photographs are the
product.

1. Cloudflare dashboard → **R2** → *Create bucket* → name it `autevo-photos`, location
   **EEUR** (eastern Europe).
2. Bucket → *Settings* → **Public access** → *Connect a custom domain* → `img.autevo.mk`.
   Cloudflare adds the CNAME itself.
3. **R2 → Manage API tokens** → *Create token* → **Object Read & Write**, this bucket only.
   It shows you an access key id, a secret, and an endpoint like
   `https://<account-id>.r2.cloudflarestorage.com`. **The secret is shown once.**

Those four values go into `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT` and
`AWS_URL` in the next part.

---

## Part 5 — The environment file (20 minutes)

In Forge → Site → *Environment*, replace everything with
**`deploy/.env.production.example`** and fill in the blanks.

The ones that will stop you dead if they are wrong:

| Key | Get it wrong and |
|---|---|
| `APP_KEY` | nothing runs. Forge → Site → Commands: `php artisan key:generate --force` |
| `APP_DEBUG` | must be **`false`**. `true` prints your database password on an error page. |
| `APP_URL` | photo URLs are built from it. No trailing slash. |
| `DB_PASSWORD` | from the Forge provisioning email |
| `AWS_URL` | wrong and every photo URL points somewhere private — the app loads but no picture ever appears |
| `OTP_DRIVER` | **must be `whatsapp`**. `log` writes sign-in codes to the log file, so anyone who can read it can sign in as anybody. |
| `REVENUECAT_WEBHOOK_SECRET` | empty means every purchase is rejected and no credit is ever granted |

`OTP_DRIVER`, push and RevenueCat need credentials you may not have yet —
**`docs/credentials.md`** says where each one comes from and how long it takes. You can go
live for your own testing with `OTP_DRIVER=log` and read the code out of the log; you can
never **ship** that way.

Then deploy: Forge → Site → **Deploy Now**. Watch the output.

### One-time: the manufacturer marks

The VW, BMW and Škoda marks on the search screen are generated rather than committed, so a
fresh server has none and every make falls back to a monogram. This is a **one-time** step,
not part of a deploy, and the order matters: `makes:logos` links files that are *already on
the configured disk*, which in production is R2.

On the server, via Forge → Commands, or over SSH in `/home/forge/api.autevo.mk/api`:

```bash
node scripts/fetch-make-logos.js          # writes storage/app/public/makes

# Upload them to the bucket. Install the AWS CLI first: sudo apt install awscli
aws s3 sync storage/app/public/makes s3://autevo-photos/makes   --endpoint-url "$AWS_ENDPOINT"

php artisan makes:logos                   # links what is now in the bucket
```

Expect `Linked 34 logos.` Dodge, Lancia and Lexus have no mark published and keep their
monogram, which is by design.

---

## Part 6 — The two background processes (10 minutes)

**These are the parts that fail silently.** Everything looks fine without them and the
marketplace quietly stops working.

**Queue worker** — Forge → Server → *Daemons* → New Daemon:

```
Command:   php artisan queue:work --sleep=3 --tries=3 --max-time=3600
Directory: /home/forge/api.autevo.mk/api
User:      forge
```

**Scheduler** — Forge adds this when the site is created. **Verify it.** Server →
*Scheduler*, and there must be a job running every minute:

```
cd /home/forge/api.autevo.mk/api && php artisan schedule:run
```

Without it: expired listings stay live for ever, sellers are never warned their listing is
about to run out, and saved searches never match or notify. Four jobs, none of which
complains when it is not running.

---

## Part 7 — TLS, then prove it works (10 minutes)

Forge → Site → *SSL* → **Let's Encrypt** → Obtain Certificate. It renews itself.

Now check, in this order. Each one tests something the next depends on:

```bash
# 1. The certificate is valid and the API answers.
curl -s https://api.autevo.mk/api/v1/countries | head -c 300
#    Expect JSON with North Macedonia in it, active:true.

# 2. Reference data seeded.
curl -s https://api.autevo.mk/api/v1/makes | head -c 200
#    Expect Volkswagen, Audi, BMW…  An empty list means db:seed did not run.

# 3. Debug is off. This MUST NOT show a stack trace.
curl -s https://api.autevo.mk/api/v1/listings/does-not-exist | head -c 200

# 4. The scheduler is alive. Over SSH, as the forge user:
#      ssh forge@<server ip>
#      cd /home/forge/api.autevo.mk/api
php artisan schedule:list
#    Expect four jobs with their next run times.

# 5. The worker is alive:
ps aux | grep '[q]ueue:work'
#    Expect one process owned by forge. Forge → Processes → Background
#    processes should show it green too.
```

> **Forge's Commands tab may show you nothing.** It has a habit of reporting
> `cat: /home/forge/.forge/provision-NNNN.output: No such file or directory`
> while claiming the command finished. The command usually did run; you simply
> cannot see what it said. Use SSH for anything whose output matters.

If 1 fails but `dig` was right, it is almost always the web directory: `/api/public`.

---

## Part 8 — The app, and the .ipa

The API is live. Now point the app at it and build.

1. GitHub → this repository → **Actions** → **iOS unsigned IPA** → *Run workflow*.
2. API URL: **`https://api.autevo.mk/api/v1`** (already the default).
3. It takes about 20 minutes on a macOS runner. Download the
   **`autevo-unsigned-ipa`** artifact.
4. Install it with **Sideloadly** or **AltStore** and your free Apple ID.
   **`docs/device-testing.md`** has that part step by step.

What that build can and cannot do, so nothing surprises you:

- **Works:** sign-in, search, listing detail, the whole sell flow, photo upload, messaging,
  favourites, saved searches, the profile, account deletion — all against the real server.
- **Cannot work:** push notifications and in-app purchases. Both need entitlements only a
  **paid** Apple Developer account carries. The app already handles their absence rather
  than pretending: push registration failures are swallowed at sign-in, and the credits
  sheet says purchases are unavailable.
- **Expires after seven days.** Re-sign the same file or run the workflow again.

Once the $99 Apple Developer account exists, none of this applies: `eas build` signs it,
installs it over the air, and push and purchases start working.

---

## Before you submit to a store

Not part of getting it running, but do not lose track of them:

- **`docs/store/pre-submission-checklist.md`** — read it start to finish.
- **`PLACEHOLDERS.md`** — every credential in it is still a stand-in.
- **The legal pages have nowhere to live yet.** Both stores require a public privacy
  policy URL before review. `docs/privacy-policy.mk.md` and the rest are written, but
  nothing serves them at `autevo.mk/privacy`. That is a small, separate piece of work —
  ask me for it when the server is up.
- **`app/src/app/design.tsx`** is the developer gallery, and it is the one screen in the
  app with buttons that do nothing. Delete it or gate it behind `__DEV__` before shipping.
- **`storage/app/dev-photos` never goes near production** — those photographs are other
  people's, some under share-alike licences. Production photographs are the sellers' own.

---

## When something breaks

| It looks like | It usually is |
|---|---|
| 404 on every endpoint | web directory is `/public`, should be `/api/public` |
| 500 with no detail | `storage/` not writable, or `APP_KEY` empty. Read `api/storage/logs/laravel.log`. |
| Photos upload then never appear | `AWS_URL` unset or wrong |
| Upload fails at about 1 MB | `client_max_body_size` — `deploy/nginx-api.conf` |
| Changing `.env` does nothing | config is cached. `php artisan config:cache` again. |
| Listings never expire, no alerts arrive | the scheduler is not running (Part 6) |
| Sign-in codes never arrive | `OTP_DRIVER` is still `log`, or WhatsApp credentials are wrong |
| Purchases take money, grant nothing | `REVENUECAT_WEBHOOK_SECRET` does not match the dashboard |
