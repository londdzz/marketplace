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
    | the WhatsApp Cloud API. "messaggio" sends over SMS, Viber or WhatsApp
    | through one aggregator.
    |
    | Messaggio is what the launch market uses, because the WhatsApp Cloud API
    | needs Meta business verification, which takes weeks, and because a
    | Macedonian buyer is likelier to be reached on Viber or SMS than on
    | WhatsApp. WhatsApp coverage is strong in Kosovo and Albania, which is
    | what the Cloud API driver was written for and what it is still there for.
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
    | A code that lets anybody in
    |--------------------------------------------------------------------------
    |
    | For handing a test build to people without relaying a code to each of
    | them. Set it and that code verifies any number, creating the account the
    | same way a real one does.
    |
    | It is exactly as dangerous as it sounds: anyone who can reach the API can
    | sign in as any number, and a seller's telephone number is behind an
    | account. It is refused outright when APP_ENV is production, every use is
    | logged as a warning, and it must be empty before anybody real uses this.
    | Make it something unguessable rather than 123456 — the code field takes
    | six digits, so that is a million tries against the rate limiter, and a
    | memorable number is the first thing tried.
    |
    */

    'universal_code' => env('OTP_UNIVERSAL_CODE'),

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

    /*
    |--------------------------------------------------------------------------
    | Messaggio
    |--------------------------------------------------------------------------
    |
    | One request reaches several networks. "channels" is a list in order of
    | preference, and Messaggio falls through it: "viber,sms" tries Viber and
    | sends an SMS only to people it could not reach, which is how the cheap
    | channel gets used without leaving anybody out. Viber costs roughly a
    | third of an SMS in the region, so the order is worth getting right.
    |
    | "ttl" is how many seconds Messaggio waits for the Viber message to be
    | delivered before giving up and falling back. Long enough to be a real
    | attempt, short enough that nobody is left staring at an empty code box:
    | the code itself only lives five minutes.
    |
    | The sender name has to be registered with Messaggio before it will send
    | anything, and registration is not instant. Their support asks for
    | company details, the same way a sender ID does everywhere else.
    |
    */

    'messaggio' => [
        'base_url' => env('MESSAGGIO_BASE_URL', 'https://msg.messaggio.com'),
        'login' => env('MESSAGGIO_LOGIN'),

        // Their documentation names only this header. If they issue you a key
        // under another name, set it here rather than editing the driver.
        'auth_header' => env('MESSAGGIO_AUTH_HEADER', 'Messaggio-Login'),

        'sender' => env('MESSAGGIO_SENDER', 'Autevo'),
        'channels' => array_values(array_filter(array_map(
            trim(...),
            explode(',', (string) env('MESSAGGIO_CHANNELS', 'sms')),
        ))),
        'ttl' => (int) env('MESSAGGIO_TTL', 60),
        'timeout' => (int) env('MESSAGGIO_TIMEOUT', 10),
    ],

];
