<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\OtpSender;
use App\Support\Otp\LogOtpSender;
use App\Support\Otp\WhatsAppOtpSender;
use App\Support\PhoneNumber;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(OtpSender::class, static function (): OtpSender {
            $driver = (string) config('otp.driver');

            return match ($driver) {
                'whatsapp' => new WhatsAppOtpSender,
                'log' => new LogOtpSender,
                default => throw new InvalidArgumentException("Unknown OTP driver [{$driver}]."),
            };
        });
    }

    public function boot(): void
    {
        $this->configureRateLimiters();
    }

    /**
     * Three codes per phone number every fifteen minutes and ten per IP address
     * per hour, so neither a single number nor a single machine can be used to
     * pump out messages we pay for.
     */
    private function configureRateLimiters(): void
    {
        RateLimiter::for('otp-request', static function (Request $request): array {
            $phone = PhoneNumber::normalize((string) $request->input('phone', '')) ?? 'unparsable';
            $perPhone = config('otp.rate_limits.per_phone');
            $perIp = config('otp.rate_limits.per_ip');

            return [
                Limit::perMinutes($perPhone['minutes'], $perPhone['attempts'])->by('otp-request:phone:'.$phone),
                Limit::perMinutes($perIp['minutes'], $perIp['attempts'])->by('otp-request:ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('otp-verify', static function (Request $request): Limit {
            $verify = config('otp.rate_limits.verify_per_ip');

            return Limit::perMinutes($verify['minutes'], $verify['attempts'])
                ->by('otp-verify:ip:'.$request->ip());
        });
    }
}
