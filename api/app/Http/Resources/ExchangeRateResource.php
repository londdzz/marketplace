<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ExchangeRate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * How many units of this currency one euro buys. Prices are stored in euro and
 * converted only for display.
 *
 * @mixin ExchangeRate
 */
class ExchangeRateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'currency' => $this->currency,
            'rate_per_eur' => $this->rate_per_eur,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
