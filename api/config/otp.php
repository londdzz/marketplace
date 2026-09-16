<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Delivery driver
    |--------------------------------------------------------------------------
    |
    | How one-time codes reach the user. "log" writes the code to the
    | application log and sends nothing, which is what local development and
    | the test suite use. "whatsapp" sends an authentication template through
    | the WhatsApp Cloud API.
    |
    | WhatsApp covers Kosovo and Albania well. Viber is the everyday messenger
    | in Bulgaria and Serbia, so a second channel will be needed there before
    | launch; adding one means writing another OtpSender, nothing more.
    |
    */

    'driver' => env('OTP_DRIVER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Code shape and lifetime
    |--------------------------------------------------------------------------
    */

    'length' => (int) env('OTP_LENGTH', 6),

    'ttl_minutes' => (int) env('OTP_TTL_MINUTES', 5),

    // Wrong guesses allowed against a single code before it is burned.
    'max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 5),

    /*
    |--------------------------------------------------------------------------
    | Request rate limits
    |--------------------------------------------------------------------------
    |
    | Three codes per phone number every fifteen minutes, ten per IP address
    | per hour.
    |
    */

    'rate_limits' => [
        'per_phone' => [
            'attempts' => (int) env('OTP_LIMIT_PHONE_ATTEMPTS', 3),
            'minutes' => (int) env('OTP_LIMIT_PHONE_MINUTES', 15),
        ],
        'per_ip' => [
            'attempts' => (int) env('OTP_LIMIT_IP_ATTEMPTS', 10),
            'minutes' => (int) env('OTP_LIMIT_IP_MINUTES', 60),
        ],
        'verify_per_ip' => [
            'attempts' => (int) env('OTP_LIMIT_VERIFY_ATTEMPTS', 30),
            'minutes' => (int) env('OTP_LIMIT_VERIFY_MINUTES', 60),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | WhatsApp Cloud API
    |--------------------------------------------------------------------------
    |
    | Authentication templates have to be approved by Meta in every language
    | before they can be sent, and the template must carry exactly one body
    | parameter: the code. A copy-code button is optional but is what makes
    | one-tap autofill work on both platforms.
    |
    */

    'whatsapp' => [
        'base_url' => env('WHATSAPP_BASE_URL', 'https://graph.facebook.com'),
        'api_version' => env('WHATSAPP_API_VERSION', 'v21.0'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        'template' => env('WHATSAPP_OTP_TEMPLATE', 'otp_code'),
        'copy_code_button' => (bool) env('WHATSAPP_OTP_COPY_CODE_BUTTON', true),
        'timeout' => (int) env('WHATSAPP_TIMEOUT', 10),

        // Application locale to WhatsApp template language. A locale that is
        // missing here falls back to the value under "default".
        'languages' => [
            'sq' => 'sq',
            'mk' => 'mk',
            'sr' => 'sr',
            'bg' => 'bg',
            'en' => 'en',
            'default' => 'en',
        ],
    ],

];
