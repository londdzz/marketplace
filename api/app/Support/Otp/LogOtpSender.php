<?php

declare(strict_types=1);

namespace App\Support\Otp;

use App\Contracts\OtpSender;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Log;

/**
 * Writes the code to the application log instead of sending it. Local
 * development only: it must never be the configured driver in production.
 */
final class LogOtpSender implements OtpSender
{
    public function send(string $phone, string $code, string $locale): void
    {
        Log::info('OTP code generated', [
            'phone' => PhoneNumber::mask($phone),
            'code' => $code,
            'locale' => $locale,
        ]);
    }
}
