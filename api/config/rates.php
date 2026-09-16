<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Exchange rate provider
    |--------------------------------------------------------------------------
    |
    | "none" leaves the seeded starting rates alone and logs that no provider is
    | configured. "http" fetches from a JSON endpoint that answers with rates
    | per euro, in the shape { "rates": { "ALL": 100.5, ... } }, which is what
    | exchangerate.host and openexchangerates return.
    |
    | Careful when choosing one: the European Central Bank publishes neither the
    | Albanian lek nor the Macedonian denar, so an ECB-backed feed cannot cover
    | three of our five markets.
    |
    */

    // Deliberately "none" rather than "null": Laravel reads the literal string
    // "null" in an env file as a real null.
    'driver' => env('RATES_DRIVER') ?: 'none',

    'http' => [
        'url' => env('RATES_URL'),
        'key' => env('RATES_KEY'),
        'timeout' => (int) env('RATES_TIMEOUT', 10),
    ],

    /*
    |--------------------------------------------------------------------------
    | Currencies
    |--------------------------------------------------------------------------
    |
    | Kosovo uses the euro, so it needs no rate of its own beyond the identity.
    |
    */

    'base' => 'EUR',

    'currencies' => ['ALL', 'MKD', 'RSD', 'BGN'],

];
