<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Photos
    |--------------------------------------------------------------------------
    |
    | The app resizes before uploading, but the server never trusts that and
    | resizes again. The long edge is capped at 1600px with a 400px thumbnail.
    |
    */

    'photos' => [
        'max_per_listing' => 15,
        'min_to_publish' => 4,
        'max_upload_kilobytes' => 12288,
        'full_long_edge' => 1600,
        'thumb_long_edge' => 400,
        'quality' => 82,
        'directory' => 'listings',
        // GD cannot decode HEIC, and the app converts to JPEG before
        // uploading anyway, so HEIC is not accepted rather than accepted and
        // then failed on.
        'accepted_mimes' => ['jpg', 'jpeg', 'png', 'webp'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Lifetime
    |--------------------------------------------------------------------------
    |
    | One credit buys one listing, active for two weeks.
    |
    */

    'active_days' => 14,

    /*
    |--------------------------------------------------------------------------
    | Vehicle bounds
    |--------------------------------------------------------------------------
    */

    'year_min' => 1950,
    'mileage_max' => 2_000_000,
    'price_eur_max' => 9_999_999.99,
    'engine_cc_max' => 12_000,
    'power_hp_max' => 2_000,

    /*
    |--------------------------------------------------------------------------
    | Closed vocabularies
    |--------------------------------------------------------------------------
    |
    | These are keys, never free text. The apps render them through their own
    | translation files, which is why no wording lives here.
    |
    */

    'body_types' => [
        'sedan',
        'hatchback',
        'estate',
        'suv',
        'coupe',
        'convertible',
        'minivan',
        'pickup',
        'van',
        'other',
    ],

    /*
    | A motorcycle has a shape too, and it is not one of a car's. The column is
    | the same `body_type`; only the vocabulary allowed in it changes with the
    | listing's `vehicle_type`, which is what App\Enums\VehicleType::bodyTypes()
    | answers. Mopeds and quads are in the list because they are sold here, and a
    | seller with one would otherwise have to file it as something it is not.
    */

    'motorcycle_types' => [
        'sport',
        'naked',
        'touring',
        'adventure',
        'cruiser',
        'scooter',
        'moped',
        'enduro',
        'motocross',
        'supermoto',
        'trike',
        'quad',
        'other',
    ],

    'drivetrains' => [
        'fwd',
        'rwd',
        'awd',
    ],

    'colors' => [
        'white',
        'black',
        'grey',
        'silver',
        'blue',
        'red',
        'green',
        'brown',
        'beige',
        'yellow',
        'orange',
        'gold',
        'other',
    ],

    'features' => [
        'air_conditioning',
        'climate_control',
        'leather_seats',
        'heated_seats',
        'navigation',
        'parking_sensors',
        'rear_camera',
        'cruise_control',
        'adaptive_cruise',
        'sunroof',
        'panoramic_roof',
        'alloy_wheels',
        'bluetooth',
        'apple_carplay',
        'android_auto',
        'keyless_entry',
        'start_stop',
        'xenon_lights',
        'led_lights',
        'fog_lights',
        'isofix',
        'tow_bar',
        'roof_rails',
        'abs',
        'esp',
        'electric_windows',
        'electric_mirrors',
        'central_locking',
        'service_history',
        'first_owner',
        'non_smoker',
    ],

    /*
    |--------------------------------------------------------------------------
    | Browse collections
    |--------------------------------------------------------------------------
    |
    | Saved searches nobody had to save: the handful of things buyers come
    | looking for, each one a set of filters the search endpoint already
    | accepts. Keys only, like every other vocabulary here — the apps hold the
    | wording, and the chips under a collection's name are drawn from its own
    | filters rather than written out again.
    |
    | A collection is only as real as its count, which is measured against live
    | listings every time. One with nothing in it is not shown at all: a
    | category that opens an empty list is worse than no category.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Browsing
    |--------------------------------------------------------------------------
    |
    | "show_empty" draws a collection or a body shape that no live listing
    | matches. Off by default and it should stay off in a real market, because
    | a category promising nothing is a tap that goes nowhere and its count is
    | a promise the catalogue cannot keep.
    |
    | Turn it on while a server is being handed to testers. With no cars in the
    | database every category counts zero, so both rails disappear and the home
    | screen reads as broken rather than as empty. Off again before anybody
    | real arrives — PLACEHOLDERS.md carries it.
    |
    */

    'browse' => [
        'show_empty' => (bool) env('BROWSE_SHOW_EMPTY', false),

        /*
        | Which shapes get a tile on the home screen.
        |
        | Not the same question as which shapes exist. The vocabulary above is
        | untouched: a seller can still say their car is a convertible, search
        | still filters for one, and a listing already filed as a van keeps
        | its shape. This is only about which are worth a card on a rail a
        | thumb flicks through — a van and a pickup are a rounding error in
        | this market, and "other" is not a thing anybody sets out to buy.
        |
        | Leave a kind out, or give it an empty list, and every shape it has
        | gets a tile.
        */
        'body_types' => [
            'car' => ['sedan', 'hatchback', 'estate', 'suv', 'coupe'],
        ],
    ],

    'collections' => [
        'car' => [
            'family' => [
                'body_type' => ['estate', 'suv', 'minivan'],
                'year_min' => 2014,
                'price_max' => 20000,
            ],
            'first_car' => [
                'price_max' => 7000,
                'mileage_max' => 220000,
            ],
            'premium' => [
                'price_min' => 15000,
                'year_min' => 2018,
            ],
            'city' => [
                'body_type' => ['hatchback', 'coupe'],
            ],
            'electrified' => [
                'fuel' => ['electric', 'hybrid'],
            ],
        ],

        // A motorcycle buyer arrives with a different set of questions, so the
        // ways in are their own rather than a car's borrowed. Same mechanism,
        // same counting, same rule that an empty one is not shown.
        'motorcycle' => [
            'first_bike' => [
                'price_max' => 3000,
            ],
            'two_wheel_commuter' => [
                'body_type' => ['scooter', 'moped'],
            ],
            'adventure' => [
                'body_type' => ['adventure', 'enduro'],
            ],
            'cruisers' => [
                'body_type' => ['cruiser', 'trike'],
            ],
            'track' => [
                'body_type' => ['sport', 'supermoto'],
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | View counting
    |--------------------------------------------------------------------------
    |
    | A listing's view count rises at most once per IP address per day, so a
    | refresh or a bot cannot inflate it.
    |
    */

    'view_throttle_hours' => 24,

    /*
    |--------------------------------------------------------------------------
    | Conversations
    |--------------------------------------------------------------------------
    */

    'conversations' => [
        'per_user_per_day' => (int) env('CONVERSATIONS_PER_USER_PER_DAY', 20),
    ],

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    |
    | The fulltext index will not hold a word shorter than the server's minimum
    | token size, which rules out exactly the model names buyers type most: A4,
    | Q7, X5, C3. Tokens that short are matched with LIKE instead, so the index
    | carries the long words and nothing is silently unfindable.
    |
    */

    'search' => [
        'min_token_size' => (int) env('DB_FT_MIN_TOKEN_SIZE', 3),
        'max_tokens' => 10,
        'per_page' => 20,
        'max_per_page' => 50,
        'max_radius_km' => 500,
    ],

    /*
    |--------------------------------------------------------------------------
    | Reference data caching
    |--------------------------------------------------------------------------
    */

    'reference_cache_seconds' => 3600,

];
