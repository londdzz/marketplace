<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\OtpSender;
use App\Data\OtpChallenge;
use App\Exceptions\AccountBlockedException;
use App\Exceptions\InvalidOtpException;
use App\Exceptions\OtpAttemptsExhaustedException;
use App\Exceptions\OtpDeliveryException;
use App\Models\Country;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Phone verification. Codes are only ever stored as a hash, expire quickly,
 * survive a limited number of wrong guesses, and are burned once used.
 */
final class OtpService
{
    private const OUTCOME_VERIFIED = 'verified';

    private const OUTCOME_INVALID = 'invalid';

    private const OUTCOME_EXHAUSTED = 'exhausted';

    public function __construct(private readonly OtpSender $sender) {}

    /**
     * Issue a code and hand it to the delivery channel.
     *
     * Any code still outstanding for the number is retired first, so only the
     * most recent one can ever be used.
     *
     * @throws OtpDeliveryException
     */
    public function request(string $phone, ?string $locale = null): OtpChallenge
    {
        $code = $this->generateCode();
        $expiresAt = Carbon::now()->addMinutes($this->ttlMinutes());

        DB::transaction(function () use ($phone, $code, $expiresAt): void {
            OtpCode::query()
                ->where('phone', $phone)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => Carbon::now()]);

            OtpCode::query()->create([
                'phone' => $phone,
                'code_hash' => Hash::make($code),
                'expires_at' => $expiresAt,
                'attempts' => 0,
            ]);
        });

        // Sent inline rather than queued: a queued payload would put the plain
        // code in the jobs table, and the user is waiting for it anyway.
        $this->sender->send($phone, $code, $locale ?? app()->getLocale());

        return new OtpChallenge($phone, $expiresAt, $this->codeLength());
    }

    /**
     * Check a code and return the user behind the number, creating the account
     * on first successful verification.
     *
     * @throws InvalidOtpException|OtpAttemptsExhaustedException|AccountBlockedException
     */
    public function verify(string $phone, string $code, ?string $countryCode = null, ?string $locale = null): User
    {
        // The outcome is decided inside the transaction but acted on outside
        // it. Throwing from within would roll back the very attempt counter
        // that has just been incremented, handing an attacker unlimited
        // guesses against one code.
        $outcome = DB::transaction(function () use ($phone, $code): string {
            $record = OtpCode::query()
                ->where('phone', $phone)
                ->whereNull('consumed_at')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            if (! $record instanceof OtpCode || $record->isExpired()) {
                return self::OUTCOME_INVALID;
            }

            if ($record->attempts >= $this->maxAttempts()) {
                $record->forceFill(['consumed_at' => Carbon::now()])->save();

                return self::OUTCOME_EXHAUSTED;
            }

            if (! Hash::check($code, $record->code_hash)) {
                $record->forceFill(['attempts' => $record->attempts + 1]);

                if ($record->attempts >= $this->maxAttempts()) {
                    $record->forceFill(['consumed_at' => Carbon::now()]);
                    $record->save();

                    return self::OUTCOME_EXHAUSTED;
                }

                $record->save();

                return self::OUTCOME_INVALID;
            }

            $record->forceFill(['consumed_at' => Carbon::now()])->save();

            return self::OUTCOME_VERIFIED;
        });

        match ($outcome) {
            self::OUTCOME_INVALID => throw new InvalidOtpException,
            self::OUTCOME_EXHAUSTED => throw new OtpAttemptsExhaustedException,
            default => null,
        };

        $user = $this->resolveUser($phone, $countryCode, $locale);

        if ($user->isBlocked()) {
            throw new AccountBlockedException;
        }

        return $user;
    }

    /**
     * Find the account for a number, or open one on first sign-in.
     */
    private function resolveUser(string $phone, ?string $countryCode, ?string $locale): User
    {
        $user = User::query()->where('phone', $phone)->first();

        if ($user instanceof User) {
            if ($user->phone_verified_at === null) {
                $user->forceFill(['phone_verified_at' => Carbon::now()])->save();
            }

            return $user;
        }

        $user = User::query()->create([
            'phone' => $phone,
            'phone_verified_at' => Carbon::now(),
            'country_code' => $countryCode ?? $this->countryForPhone($phone),
            // The language the account signed up in: what the caller asked
            // for, or the language this request was negotiated in.
            'preferred_language' => $locale ?? app()->getLocale(),
        ]);

        // Read the row back so the database defaults, the seller type and the
        // zero credit balance, are on the model the response is built from.
        $user->refresh();
        $user->wasRecentlyCreated = true;

        return $user;
    }

    /**
     * Work the country out from the dialling prefix, longest prefix first.
     *
     * Diaspora numbers are common across all five markets, so a number that
     * belongs to none of them still gets an account; it lands on the default
     * country and the owner can correct it from their profile.
     */
    private function countryForPhone(string $phone): string
    {
        $match = Country::query()
            ->where('active', true)
            ->orderByRaw('CHAR_LENGTH(phone_prefix) DESC')
            ->get()
            ->first(fn (Country $country): bool => str_starts_with($phone, $country->phone_prefix));

        return $match?->code ?? (string) config('app.default_country');
    }

    private function generateCode(): string
    {
        $length = $this->codeLength();

        return str_pad(
            (string) random_int(0, (10 ** $length) - 1),
            $length,
            '0',
            STR_PAD_LEFT,
        );
    }

    private function codeLength(): int
    {
        return (int) config('otp.length', 6);
    }

    private function ttlMinutes(): int
    {
        return (int) config('otp.ttl_minutes', 5);
    }

    private function maxAttempts(): int
    {
        return (int) config('otp.max_attempts', 5);
    }
}
