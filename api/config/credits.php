<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | What a credit buys
    |--------------------------------------------------------------------------
    |
    | One credit publishes one listing for the active period set in
    | config/listings.php, and one credit renews it for the same again.
    |
    */

    'publish_cost' => 1,

    'renew_cost' => 1,

    /*
    |--------------------------------------------------------------------------
    | Promotion
    |--------------------------------------------------------------------------
    |
    | A promoted listing leads every ordering, which is what the seller is
    | paying for. The seller chooses how many credits to spend and the days
    | follow from the rate below, so there are no tiers to keep in step — the
    | whole price list is this one number.
    |
    | `benchmark_min_sample` is how many promotions have to exist before the
    | app will tell a seller what others spend. Below it there is nothing
    | honest to say, so it says nothing.
    |
    */

    'promote' => [
        'days_per_credit' => 2,
        'min_credits' => 1,
        'max_credits' => 30,
        'benchmark_days' => 90,
        'benchmark_min_sample' => 5,
    ],

    /*
    |--------------------------------------------------------------------------
    | Credit packs
    |--------------------------------------------------------------------------
    |
    | The keys are the in-app purchase product identifiers, registered in both
    | stores as CONSUMABLES. These prices must match what is configured in App
    | Store Connect and Play Console; the store is the source of truth for what
    | the buyer is actually charged, and these values are only used for the
    | ledger and for copy.
    |
    */

    'packs' => [
        'credits_1' => [
            'credits' => 1,
            'price_eur' => '1.50',
            'most_popular' => false,
        ],
        'credits_8' => [
            'credits' => 8,
            'price_eur' => '9.99',
            'most_popular' => true,
        ],
        'credits_25' => [
            'credits' => 25,
            'price_eur' => '24.99',
            'most_popular' => false,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | RevenueCat webhook
    |--------------------------------------------------------------------------
    |
    | RevenueCat sends the value configured in its dashboard as the
    | Authorization header on every delivery. The webhook fails closed: with no
    | secret configured it rejects everything rather than trusting callers.
    |
    | Webhooks retry, so every delivery is assumed to arrive at least twice and
    | is made idempotent on the store transaction id.
    |
    */

    'webhook' => [
        'secret' => env('REVENUECAT_WEBHOOK_SECRET'),

        // Event types that grant credits. Consumables arrive as
        // NON_RENEWING_PURCHASE.
        'purchase_events' => ['NON_RENEWING_PURCHASE', 'INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE_EVENT'],
    ],

];
