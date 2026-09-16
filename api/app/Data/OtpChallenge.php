<?php

declare(strict_types=1);

namespace App\Data;

use Illuminate\Support\Carbon;

/**
 * What the caller is told after a code has been sent. Never the code itself.
 */
final readonly class OtpChallenge
{
    public function __construct(
        public string $phone,
        public Carbon $expiresAt,
        public int $codeLength,
    ) {}

    public function expiresInSeconds(): int
    {
        return max(0, (int) round(now()->diffInSeconds($this->expiresAt, false)));
    }
}
