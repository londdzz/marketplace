<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Data\OtpChallenge;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Tells the app what to show on the code entry screen. It never carries the
 * code itself.
 *
 * @mixin OtpChallenge
 */
class OtpChallengeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'phone' => PhoneNumber::mask($this->phone),
            'code_length' => $this->codeLength,
            'expires_at' => $this->expiresAt->toIso8601String(),
            'expires_in_seconds' => $this->expiresInSeconds(),
        ];
    }
}
