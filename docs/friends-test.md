# Handing the build to friends

Everything to do the evening before, in order, and what to tell the people
testing. About forty minutes, most of it waiting for a build.

Nothing here is guesswork about the server — each step says how to check it
from your own machine, and three of them are already done.

---

## Already true, checked from outside

| | |
|---|---|
| ✅ | **The API answers**, with a valid certificate, at `https://api.autevo.mk` |
| ✅ | **The manufacturer marks are on the bucket and attached.** `logo_url` is a real `img.autevo.mk` URL and the file is served |
| ✅ | **Uploads over a megabyte are accepted.** nginx used to refuse them with an HTML page a JSON client read as "unexpected character" |
| ✅ | **The duplicate model ranges are gone** — `Series 3` and `3 Series` were both in the picker |
| ✅ | **Sign-in codes go to Discord**, so relaying one is reading a phone |

---

## 1. Deploy (5 minutes)

The server is behind on code. Three things are waiting in it, and the first one
is the reason no photograph has ever reached the bucket from a listing.

**Forge → Sites → api.autevo.mk → Deploy Now.**

> **If the deploy script is an old copy**, which it was, `models:prune` and
> `makes:logos` never run. Paste the current `deploy/deploy.sh` into
> *Site → Deploy Script* first. It is safe to run again.

Without Forge, over SSH:

```bash
cd /home/forge/api.autevo.mk && git pull origin main
cd api && composer install --no-dev --optimize-autoloader
php artisan migrate --force && php artisan config:cache && php artisan route:cache
```

**What this brings**: `league/flysystem-aws-s3-v3`, without which nothing can
be written to R2 at all; the empty-category cards; the three-state home screen.

## 2. Two settings (2 minutes)

**Forge → Site → Environment**, or `nano .env` over SSH:

```
BROWSE_SHOW_EMPTY=true
```

Without it the home screen has no "Browse by need" and no "Browse by shape" at
all, because every category counts zero and an empty one is normally hidden.
With it they are drawn dimmed, reading "No offers", and cannot be tapped.

Then, and this is the step that is easy to forget:

```bash
php artisan config:cache
```

**The cache beats `.env`.** Save the file and nothing changes until this runs.

## 3. Give yourself credits (1 minute)

Publishing spends one, and the account has none. Store purchases do not work in
a sideloaded build — that entitlement needs a paid Apple account — so this is
how a test listing gets published at all:

```bash
cd /home/forge/api.autevo.mk/api
php artisan credits:grant +389XXXXXXXX 20
```

It goes through the ledger like any other grant, so the credits page shows it
honestly as an admin grant.

## 4. Publish two or three cars yourself (15 minutes)

**Do this before anybody else opens the app.** An empty marketplace is a
marketplace nobody can tell is working, and it is the only thing that turns the
home screen from a set of empty shelves into a product.

Easiest from the website, on a keyboard, where the sell form is one page.
Use real photographs from your phone — four is the minimum to publish.

This is also **the first end-to-end test of the photo pipeline**. The logo copy
proved writes to R2 work; a listing proves the resize, the thumbnail and the
EXIF strip do too. If a photograph comes out rotated, grey or missing, that is
worth knowing tonight rather than from a friend tomorrow.

Then clear the cached home screen, or it stays empty for up to an hour:

```bash
php artisan cache:clear
```

## 5. Check it from your own machine (2 minutes)

```bash
# Marks attached — wants an img.autevo.mk URL, not null.
curl -s https://api.autevo.mk/api/v1/makes | head -c 200

# Categories drawn — wants a long answer, not two empty arrays.
curl -s https://api.autevo.mk/api/v1/browse | head -c 200

# Your cars are live — wants a total above zero.
curl -s https://api.autevo.mk/api/v1/listings | head -c 200

# Uploads pass nginx — wants 422 (validation), never 413.
head -c 3000000 /dev/urandom > /tmp/b.bin
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://api.autevo.mk/api/v1/auth/otp/request \
  -H "Accept: application/json" -F "f=@/tmp/b.bin"
```

## 6. Get the `.ipa` onto their phones (20 minutes, mostly waiting)

GitHub → **Actions** → *iOS unsigned IPA* → the newest green run → download
**`autevo-unsigned-ipa`** from the Artifacts box.

Each phone needs **Sideloadly** or **AltStore** on a computer and the owner's
own free Apple ID. `docs/device-testing.md` is that part step by step.

Three things to say up front, because all three will otherwise be reported as
bugs:

- **It expires after seven days.** Re-sign the same file; nothing is lost.
- **Notifications do not arrive**, and **buying credits does not work.** Both
  entitlements need a paid Apple Developer account. The app already says so
  rather than pretending.
- **The sign-in code will not arrive on their phone.** You read it and send it.

---

## What to tell them

> Autevo is a used-car marketplace for North Macedonia. It is real — the cars,
> the messages and the accounts are all live — but it is not finished, and the
> sign-in code comes from me rather than from a text message.
>
> **To sign in**: type your number, then message me. I will send you the
> six-digit code within a few seconds. It lasts five minutes.
>
> **Please try to**: search for a car, save one, save a search, message a
> seller, and list something of your own — even a made-up one, with any
> photographs. Listing is what I most need tried.
>
> **Expect**: no notifications, no buying credits, and the app stopping after
> seven days. Everything else is the real thing.
>
> **Tell me**: anything that looked broken, anything you could not find, and
> anything you tapped that did nothing.

## While they are testing

Keep the Discord channel open — every code lands there with the number beside
it, so you can see who is trying to get in and how often.

```bash
# What has been listed.
curl -s https://api.autevo.mk/api/v1/listings | head -c 400

# Anything erroring, as it happens.
tail -f /home/forge/api.autevo.mk/api/storage/logs/laravel.log
```

## Afterwards

`BROWSE_SHOW_EMPTY` and the Discord driver are both test-build settings. Neither
ships. `PLACEHOLDERS.md` lists them and what each one costs until it is replaced.
