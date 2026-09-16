# Car Marketplace API

Laravel 11 backend for the used-car marketplace covering Kosovo (XK), Albania (AL),
North Macedonia (MK), Serbia (RS) and Bulgaria (BG).

See `../CLAUDE.md` for the full product specification, the hard rules and the phase plan.

## Requirements

- PHP 8.2+
- MySQL 8 (MariaDB 10.11+ works for local development)

## Local setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
```

The test suite runs against a separate database, `marketplace_test`, configured in
`phpunit.xml`. Create it once before running the tests:

```bash
mysql -e "CREATE DATABASE marketplace_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
./vendor/bin/pest
./vendor/bin/pint
```

## Conventions

- `declare(strict_types=1);` at the top of every PHP file.
- Business logic lives in `app/Services`, never in controllers.
- Credits only ever change through `App\Services\CreditService`.
- Anything searchable is written through `App\Support\TextNormalizer` into a
  `*_normalized` (or `search_text`) column, which is the column we query.
- Prices are stored in EUR only, as `decimal(10,2)`.
- User-facing strings are translation keys, never literals. Languages: sq (default),
  mk, sr, bg, en.
