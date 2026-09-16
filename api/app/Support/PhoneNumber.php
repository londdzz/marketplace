<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Phone numbers are the login identity, so they are stored in exactly one
 * shape: E.164, a leading plus followed by digits only.
 */
final class PhoneNumber
{
    private const MIN_DIGITS = 8;

    private const MAX_DIGITS = 15;

    /**
     * Reduce user input to E.164, or return null when it cannot be one.
     *
     * Accepts the shapes people actually type: spaces, dashes, brackets, a
     * leading double zero instead of a plus. A number written in the local
     * trunk form (starting with a single zero) is ambiguous without knowing
     * the country, so it is only accepted together with a dialling prefix.
     */
    public static function normalize(string $value, ?string $phonePrefix = null): ?string
    {
        $value = trim($value);
        $digits = preg_replace('/\D+/', '', $value) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($value, '+')) {
            $candidate = $digits;
        } elseif (str_starts_with($digits, '00')) {
            $candidate = substr($digits, 2);
        } elseif ($phonePrefix !== null) {
            // A local number such as 044 123 456 combined with its country's
            // dialling prefix. The trunk zero is dropped, which is exactly what
            // the prefix replaces.
            $candidate = ltrim($phonePrefix, '+').ltrim($digits, '0');
        } else {
            $candidate = $digits;
        }

        // No country calling code begins with a zero, so a leading zero at this
        // point means the number was never international to begin with.
        if (str_starts_with($candidate, '0')) {
            return null;
        }

        if (strlen($candidate) < self::MIN_DIGITS || strlen($candidate) > self::MAX_DIGITS) {
            return null;
        }

        return '+'.$candidate;
    }

    public static function isValid(string $value): bool
    {
        return self::normalize($value) !== null;
    }

    /**
     * The digits only, which is the shape the WhatsApp Cloud API expects.
     */
    public static function withoutPlus(string $e164): string
    {
        return ltrim($e164, '+');
    }

    /**
     * Enough of the number to recognise it, with the rest masked, for logs and
     * error reporting.
     */
    public static function mask(string $e164): string
    {
        $digits = self::withoutPlus($e164);
        $visible = 3;

        if (strlen($digits) <= $visible * 2) {
            return str_repeat('*', strlen($digits));
        }

        return '+'.substr($digits, 0, $visible)
            .str_repeat('*', strlen($digits) - ($visible * 2))
            .substr($digits, -$visible);
    }
}
