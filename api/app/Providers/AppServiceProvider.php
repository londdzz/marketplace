<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\ExchangeRateProvider;
use App\Contracts\OtpSender;
use App\Contracts\PushSender;
use App\Support\Otp\LogOtpSender;
use App\Support\Otp\WhatsAppOtpSender;
use App\Support\PhoneNumber;
use App\Support\Push\LogPushSender;
use App\Support\Push\PlatformPushSender;
use App\Support\Rates\HttpExchangeRateProvider;
use App\Support\Rates\NullExchangeRateProvider;
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

        $this->app->bind(PushSender::class, function (): PushSender {
            $driver = (string) config('push.driver');

            return match ($driver) {
                'stores' => $this->app->make(PlatformPushSender::class),
                'log' => new LogPushSender,
                default => throw new InvalidArgumentException("Unknown push driver [{$driver}]."),
            };
        });

        $this->app->bind(ExchangeRateProvider::class, function (): ExchangeRateProvider {
            $driver = (string) config('rates.driver');

            return match ($driver) {
                'http' => new HttpExchangeRateProvider,
                'none' => new NullExchangeRateProvider,
                default => throw new InvalidArgumentException("Unknown exchange rate driver [{$driver}]."),
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

        // No more than twenty new conversations a day, so a single account
        // cannot spray every seller in five countries.
        RateLimiter::for('start-conversation', static function (Request $request): Limit {
            $limit = (int) config('listings.conversations.per_user_per_day');

            return Limit::perDay($limit)
                ->by('start-conversation:'.$request->user()?->getKey())
                ->response(fn () => response()->json(['message' => __('conversation.daily_limit')], 429));
        });

        RateLimiter::for('otp-verify', static function (Request $request): Limit {
            $verify = config('otp.rate_limits.verify_per_ip');

            return Limit::perMinutes($verify['minutes'], $verify['attempts'])
                ->by('otp-verify:ip:'.$request->ip());
        });
    }
}
