<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Driver
    |--------------------------------------------------------------------------
    |
    | "log" writes what would have been sent to the application log and sends
    | nothing, which is what development uses. "stores" sends for real, through
    | Firebase Cloud Messaging on Android and APNs on iOS.
    |
    */

    'driver' => env('PUSH_DRIVER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Firebase Cloud Messaging, for Android
    |--------------------------------------------------------------------------
    |
    | The v1 API authenticates with a service account. Point credentials at the
    | JSON file Firebase issues and keep it out of version control.
    |
    */

    'fcm' => [
        'project_id' => env('FCM_PROJECT_ID'),
        'credentials' => env('FCM_CREDENTIALS', storage_path('app/firebase.json')),
        'endpoint' => env('FCM_ENDPOINT', 'https://fcm.googleapis.com/v1/projects/:project/messages:send'),
        'token_endpoint' => env('FCM_TOKEN_ENDPOINT', 'https://oauth2.googleapis.com/token'),
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'timeout' => (int) env('FCM_TIMEOUT', 10),
    ],

    /*
    |--------------------------------------------------------------------------
    | Apple Push Notification service, for iOS
    |--------------------------------------------------------------------------
    |
    | Token-based authentication: a .p8 key, its key id, and the team id. APNs
    | speaks HTTP/2 only.
    |
    */

    'apns' => [
        'key_id' => env('APNS_KEY_ID'),
        'team_id' => env('APNS_TEAM_ID'),
        'key_path' => env('APNS_KEY_PATH', storage_path('app/apns.p8')),
        'bundle_id' => env('APNS_BUNDLE_ID', 'mk.autevo.app'),
        'production' => (bool) env('APNS_PRODUCTION', false),
        'endpoints' => [
            'production' => 'https://api.push.apple.com/3/device/',
            'sandbox' => 'https://api.sandbox.push.apple.com/3/device/',
        ],
        'timeout' => (int) env('APNS_TIMEOUT', 10),
    ],

    /*
    |--------------------------------------------------------------------------
    | Housekeeping
    |--------------------------------------------------------------------------
    |
    | A device token that a store reports as gone is deleted rather than kept
    | and retried forever.
    |
    */

    'delete_unregistered_tokens' => true,

];
