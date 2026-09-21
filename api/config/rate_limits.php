<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Rate limits
|--------------------------------------------------------------------------
|
| Laravel 11 applies no throttling to the API by default, so anything not
| named here is unlimited. These are the ceilings, in requests per window,
| and they are here rather than in the code so a limit can be raised on a
| busy evening without a deploy.
|
| Everything is keyed by account where there is one and by address where
| there is not, in separate buckets, so one scraper with an account cannot
| use up the allowance of everybody browsing from the same address.
|
| The signed-out ceiling is deliberately the loosest of them. A mobile
| carrier puts thousands of subscribers behind a single address, and guests
| browse without an account, so a tight per-address limit would throttle
| real people in Skopje against each other rather than an attacker. It can
| afford to be loose because the one piece of personal data the marketplace
| holds — the seller's telephone number — needs an account to see at all.
|
| The OTP limits are not here: they live in config/otp.php with the rest of
| the sign-in settings.
|
*/

return [

    /*
     * The backstop under every route. Generous enough for the app at its
     * busiest — the thread polls every five seconds and the list every
     * fifteen, and the home screen opens with a handful of requests at once.
     */
    'global' => [
        'signed_in_per_minute' => (int) env('RATE_LIMIT_SIGNED_IN', 120),
        'signed_out_per_minute' => (int) env('RATE_LIMIT_SIGNED_OUT', 300),
    ],

    /*
     * Search runs a fulltext match and, with a radius, a haversine over the
     * results. It is the most expensive query in the application and the one
     * worth hammering, so it gets its own lower ceiling.
     */
    'search' => [
        'signed_in_per_minute' => (int) env('RATE_LIMIT_SEARCH_SIGNED_IN', 40),
        'signed_out_per_minute' => (int) env('RATE_LIMIT_SEARCH_SIGNED_OUT', 90),
    ],

    /*
     * Starting a conversation is capped per day in config/listings.php. This
     * is the other half: how fast messages can be sent into threads that
     * already exist, which that cap does nothing about.
     */
    'messages' => [
        'per_minute' => (int) env('RATE_LIMIT_MESSAGES', 20),
        'per_day' => (int) env('RATE_LIMIT_MESSAGES_DAILY', 500),
    ],

    /*
     * One upload can carry fifteen photographs of twelve megabytes each, and
     * every one of them is decoded and re-encoded twice on our CPU. It is the
     * most expensive thing an account can ask for.
     */
    'photos' => [
        'per_hour' => (int) env('RATE_LIMIT_PHOTOS', 60),
    ],

    /*
     * Drafts are free — publishing is what costs a credit — so nothing else
     * stops an account from filling the table with them.
     */
    'drafts' => [
        'per_hour' => (int) env('RATE_LIMIT_DRAFTS', 30),
    ],

    /*
     * Enough to report a run of bad listings in one sitting, not enough to
     * bury a competitor's cars under complaints.
     */
    'reports' => [
        'per_hour' => (int) env('RATE_LIMIT_REPORTS', 20),
    ],

];
