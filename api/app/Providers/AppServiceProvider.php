<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\ExchangeRateProvider;
use App\Contracts\OtpSender;
use App\Contracts\PushSender;
use App\Support\Otp\DiscordOtpSender;
use App\Support\Otp\LogOtpSender;
use App\Support\Otp\MessaggioOtpSender;
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
                'messaggio' => new MessaggioOtpSender,
                'whatsapp' => new WhatsAppOtpSender,
                'discord' => new DiscordOtpSender,
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
     * Who a request counts against.
     *
     * An account where there is one, the address where there is not, and never
     * the same bucket for both — otherwise one scraper signed in from a
     * carrier network would spend the allowance of everyone browsing from
     * behind the same address, which on a mobile network is thousands of
     * people.
     */
    private static function signature(Request $request, string $bucket): string
    {
        $user = $request->user();

        return $user !== null
            ? $bucket.':user:'.$user->getAuthIdentifier()
            : $bucket.':ip:'.$request->ip();
    }

    /**
     * A limit from the pair in config, picking the signed-in or signed-out
     * ceiling to match who is asking.
     *
     * @param  array{signed_in_per_minute: int, signed_out_per_minute: int}  $limits
     */
    private static function perMinuteFor(Request $request, array $limits, string $bucket): Limit
    {
        $allowance = $request->user() !== null
            ? $limits['signed_in_per_minute']
            : $limits['signed_out_per_minute'];

        return Limit::perMinute($allowance)->by(self::signature($request, $bucket));
    }

    /**
     * Three codes per phone number every fifteen minutes and ten per IP address
     * per hour, so neither a single number nor a single machine can be used to
     * pump out messages we pay for.
     *
     * Everything else is limited too. Laravel 11 throttles nothing by default,
     * so a route not named here has no ceiling at all: `api` is the backstop
     * under every one of them, and the rest are the handful worth holding
     * tighter than that.
     */
    private function configureRateLimiters(): void
    {
        RateLimiter::for('api', static fn (Request $request): Limit => self::perMinuteFor(
            $request,
            config('rate_limits.global'),
            'api',
        ));

        RateLimiter::for('search', static fn (Request $request): Limit => self::perMinuteFor(
            $request,
            config('rate_limits.search'),
            'search',
        ));

        // Two windows together: the minute stops a burst, the day stops a
        // patient sender who stays under it all afternoon.
        RateLimiter::for('send-message', static function (Request $request): array {
            $limits = config('rate_limits.messages');
            $key = self::signature($request, 'send-message');

            return [
                Limit::perMinute($limits['per_minute'])->by($key),
                Limit::perDay($limits['per_day'])->by($key),
            ];
        });

        RateLimiter::for('upload-photos', static fn (Request $request): Limit => Limit::perHour(
            (int) config('rate_limits.photos.per_hour'),
        )->by(self::signature($request, 'upload-photos')));

        RateLimiter::for('create-draft', static fn (Request $request): Limit => Limit::perHour(
            (int) config('rate_limits.drafts.per_hour'),
        )->by(self::signature($request, 'create-draft')));

        RateLimiter::for('report-listing', static fn (Request $request): Limit => Limit::perHour(
            (int) config('rate_limits.reports.per_hour'),
        )->by(self::signature($request, 'report-listing')));

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
