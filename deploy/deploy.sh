#!/usr/bin/env bash
#
# Deploy the API. Forge runs this as the site's deploy script; by hand, run it
# on the server as the forge user.
#
# This is a monorepo: the git clone is the whole repository and Laravel lives
# in its api/ subdirectory. That is why the site's web directory is
# /api/public and every artisan command below runs from $LARAVEL, not $REPO.
#
# It is safe to run again: migrations that have run are skipped, and the
# reference seeders only fill in what is missing.
set -euo pipefail

REPO=/home/forge/api.autevo.mk
LARAVEL="$REPO/api"

# Forge sets FORGE_PHP to the binary for the PHP version the site is pinned to.
# Plain `php` is whatever the system default happens to be, which is the same
# thing today and the wrong thing the day a second PHP version is installed.
PHP="${FORGE_PHP:-php}"

# Deliberately unquoted below. FORGE_COMPOSER is not a path — Forge sets it to
# a command line, "php8.4 /usr/local/bin/composer", so it has to word-split.
# Quoted, bash hunts for one file with a space in its name and the deploy dies
# at the first composer call.
# shellcheck disable=SC2086
COMPOSER="${FORGE_COMPOSER:-composer}"

cd "$LARAVEL"
"$PHP" artisan down --retry=60 || true
trap '"$PHP" artisan up || true' EXIT

cd "$REPO"
git pull origin main
cd "$LARAVEL"

$COMPOSER install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# --force is what lets a migration run without a confirmation prompt. Without
# it the deploy hangs waiting for an answer nobody is there to give.
"$PHP" artisan migrate --force

# Countries, cities, makes and models. The seeders are idempotent, so this is
# safe on every deploy and is what picks up newly seeded models.
"$PHP" artisan db:seed --force

# The seeder only ever adds and updates, which is what makes the line above
# safe and what leaves a renamed range behind under its old name: rewriting
# BMW's "Series 3" as "3 Series" put both in the picker. This removes what the
# data files no longer name, and never removes a model a listing points at —
# those it reports instead, because that row is what gives a real car its name.
"$PHP" artisan models:prune

# Compiled config, routes and views. Never cache config before .env is final:
# the cache wins over the file, and editing .env afterwards changes nothing
# until config:cache runs again.
"$PHP" artisan config:cache
"$PHP" artisan route:cache
"$PHP" artisan view:cache
"$PHP" artisan event:cache

# Manufacturer marks. The 143 files live in api/resources/make-logos and this
# copies them onto whichever disk is configured — the R2 bucket in production —
# before attaching each one to its make. It used to be a one-time step done by
# hand, because the marks were generated rather than committed; they are
# committed now, so it belongs here and is safe to repeat.
"$PHP" artisan makes:logos

# The worker holds the old code in memory until it is told otherwise.
"$PHP" artisan queue:restart

"$PHP" artisan up
trap - EXIT

echo "Deployed. Now check: curl -s https://api.autevo.mk/api/v1/countries"
