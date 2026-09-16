<?php

declare(strict_types=1);

return [
    'failed' => 'These credentials do not match our records.',
    'password' => 'The provided password is incorrect.',
    'throttle' => 'Too many login attempts. Please try again in :seconds seconds.',
    'unauthenticated' => 'You need to sign in to continue.',
    'blocked' => 'This account has been blocked.',
    'logged_out' => 'You have been signed out.',
    'account_deleted' => 'Your account and all of its data have been deleted.',
    'otp' => [
        'sent' => 'We have sent you a code.',
        'invalid' => 'That code is not valid. Check it and try again, or ask for a new one.',
        'too_many_attempts' => 'Too many wrong codes. Ask for a new one.',
        'delivery_failed' => 'We could not send your code right now. Please try again.',
        'rate_limited' => 'Too many code requests. Please wait before trying again.',
        'message' => 'Your verification code is :code. It expires in :minutes minutes.',
    ],
];
