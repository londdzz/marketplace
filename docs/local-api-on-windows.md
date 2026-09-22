# Running the API on your PC, for testing on your phone

No domain, no hosting, no monthly bill. Your PC runs the API, your phone talks to it
over your own wifi. About half an hour, most of it waiting for an installer.

This is for testing only. `docs/deployment.md` is the real thing, for when you launch.

---

## What you are building

```
   iPhone  ──wifi──▶  your PC          both on the same router
   Autevo             Laravel :8000
                      MySQL
```

The phone has to reach your PC by its **address on the network** — something like
`192.168.1.20`. Not `localhost`: on the phone, localhost is the phone.

---

## 1. Install PHP and MySQL (15 minutes)

**Laragon** puts PHP, MySQL and Composer on the machine in one installer, which on
Windows is far less painful than three separate ones.

1. **laragon.org** → download **Laragon Full** → install with the defaults.
2. Open Laragon → **Start All**. Apache and MySQL go green.
3. Check the PHP version — Laragon → Menu → PHP → Version. **It must be 8.4 or newer.**
   Laragon often installs 8.3, which is not enough: the lock file pins Symfony 8, which
   needs 8.4.1. On 8.3 `composer install` refuses with a wall of "requires php >=8.4.1".
   Menu → PHP → Version switches it; if no 8.4 is listed, Laragon → Tools → Quick add →
   PHP fetches one.

Open a terminal (Laragon → **Terminal**, which already has PHP and Composer on the path):

```
php -v          # 8.4 or newer, not 8.3
composer -V     # any version
mysql --version # any 8.x, or MariaDB
```

All three must answer. If `php` is not found, you are in the wrong terminal — use
Laragon's own.

---

## 2. Get the code and set it up (10 minutes)

```
git clone https://github.com/londdzz/marketplace.git
cd marketplace\api
composer install
copy .env.example .env
php artisan key:generate
```

Make the database. In Laragon → **Database** (opens HeidiSQL) → right-click →
Create new → Database → name it **autevo** → OK.

Now open `api\.env` in a text editor and change these five lines:

```
APP_URL=http://192.168.1.20:8000
DB_DATABASE=autevo
DB_USERNAME=root
DB_PASSWORD=
OTP_DRIVER=log
```

**`APP_URL` is the one people get wrong.** Photo URLs are built from it, so if it says
`127.0.0.1` the app loads but every car is a grey box — the phone is asking itself for
the pictures. Put your PC's address there. Part 3 says how to find it.

Then:

```
php artisan storage:link
php artisan migrate --seed
php artisan db:seed --class=DevListingSeeder
```

`storage:link` is the one nobody thinks of. Photos are written to
`storage\app\public` and served through a symbolic link that a fresh clone does not
have, so without it the cars load and every photograph is a 404 — the same grey boxes
`APP_URL` gives you, from a different cause. On Windows a symbolic link needs an
**Administrator** terminal, or Developer Mode switched on in Settings.

The last one puts eight cars with photographs in, so the app has something to show.

---

## 3. Find your PC's address

```
ipconfig
```

Look for **IPv4 Address** under your wifi adapter — `192.168.x.x` or `10.0.x.x`. That
is the number the phone needs, and the one that goes in `APP_URL`.

> It can change when the router restarts. That does not mean rebuilding the app —
> see part 6.

---

## 4. Let the phone through the firewall

Windows blocks incoming connections by default, and this is the step that silently
stops everything. In **PowerShell as Administrator**, once:

```powershell
New-NetFirewallRule -DisplayName "Autevo API" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

---

## 5. Start the API

From `marketplace\api`:

```
set PHP_CLI_SERVER_WORKERS=10
php artisan serve --host=0.0.0.0 --port=8000
```

**`--host=0.0.0.0` matters.** It is not where the server is, it is which addresses it
will answer on, and `0.0.0.0` means all of them — which includes your PC's. The default
answers only the PC itself, so the phone gets nothing. Your own address never goes here;
it goes in the app, in part 6.

**`PHP_CLI_SERVER_WORKERS` matters too.** PHP's built-in server takes one request at a
time, and the app opens by asking for reference data, a page of cars and then every
thumbnail. On one worker they queue behind each other and the app looks broken for a
reason that has nothing to do with your setup.

Check it from the PC's browser: `http://192.168.1.20:8000/api/v1/countries` should
print JSON with North Macedonia in it. Note the `/countries` on the end — `/api/v1` on
its own is a prefix, not a route, and answers 404.

Then check the same address **in Safari on the phone** — and type the `http://`
yourself. Safari silently upgrades a bare address to `https://`, which this server does
not speak: you get a failure in Safari and
`Invalid request (Unsupported SSL request)` in the terminal. That line is good news
rather than bad — it means the phone reached the PC, which is the only thing this test
was for. (Safari → Settings → Apps → Safari → Advanced → **Use Secure Connections** off
stops it happening.) If the phone cannot load it, the app will not either — it is the firewall or
the two devices are on different networks (a "guest" wifi is a different network).

Leave that terminal running. Closing it stops the API.

---

## 6. Point the app at it

The build is made with **Profile → Server** switched on, so the address lives on the
phone and is not baked into the binary.

On the phone: **Profile → Server** → type `http://192.168.1.20:8000/api/v1` → **Save**.

The first time the app reaches your PC, iOS asks whether *Autevo may find and connect to
devices on your local network*. **Allow it.** Refuse and every request fails from then
on with nothing on screen explaining why; Settings → Autevo → Local Network turns it
back on. Plain HTTP to an address like this is allowed because `app.json` sets
`NSAllowsLocalNetworking`, which permits it to private addresses only — a released build
still cannot talk to an unencrypted server on the open internet.

It checks the address before keeping it. If nothing answers it says so and puts the old
one back, rather than leaving the app pointed at nothing and looking broken.

When your PC's address changes, change it here. No rebuild.

---

## Signing in

`OTP_DRIVER=log` means no WhatsApp is needed and nothing is sent. The code is written
to the log instead. After tapping Send code, read it from the PC:

```
findstr /C:"\"code\"" api\storage\logs\laravel.log
```

The last one is yours.

---

## When it does not work

| What you see | What it is |
|---|---|
| App opens, no cars, everything fails | The phone cannot reach the PC. Test the URL in Safari on the phone first. |
| Cars load, photographs are grey boxes | `APP_URL` in `.env` is not your PC's address. Change it, then `php artisan config:clear`. |
| Safari on the phone times out | Firewall (part 4), or the devices are on different wifi networks (a "guest" wifi is a different network). |
| Safari fails and the terminal says `Unsupported SSL request` | Safari upgraded it to `https://`. Type `http://` yourself. The phone *is* reaching the PC. |
| Cars load, photographs are 404 | `php artisan storage:link` was never run, or it failed for want of an Administrator terminal. |
| App shows nothing and no prompt appeared | The local network permission was refused. Settings → Autevo → Local Network. |
| Works, then stops after a while | The `php artisan serve` terminal was closed, or the PC slept. |
| Sign-in code never arrives | It is in the log, not on WhatsApp. See above. |
| Changed `.env`, nothing happened | `php artisan config:clear` |

---

## What this build cannot do

- **Push notifications** and **in-app purchases** — both need entitlements only a paid
  Apple Developer account carries. The app handles their absence rather than pretending.
- **It expires seven days after signing.** Re-sign the same `.ipa` with Sideloadly, or
  run the workflow again.
