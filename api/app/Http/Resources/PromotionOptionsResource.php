<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * What a seller needs to choose a promotion budget: the rate, the bounds,
 * what they have to spend, and what other sellers spend.
 *
 * `typical` is null while too few promotions exist to describe honestly. The
 * app shows nothing rather than a made-up range.
 *
 * @property array{
 *     days_per_credit: int,
 *     min_credits: int,
 *     max_credits: int,
 *     balance: int,
 *     featured_until: ?string,
 *     typical: array{low: int, high: int, median: int, sample: int}|null
 * } $resource
 */
class PromotionOptionsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'days_per_credit' => $this->resource['days_per_credit'],
            'min_credits' => $this->resource['min_credits'],
            'max_credits' => $this->resource['max_credits'],
            'balance' => $this->resource['balance'],
            'featured_until' => $this->resource['featured_until'],
            'typical' => $this->resource['typical'],
        ];
    }
}
