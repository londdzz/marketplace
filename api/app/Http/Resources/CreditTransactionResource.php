<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CreditTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CreditTransaction
 */
class CreditTransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'delta' => $this->delta,
            'reason' => $this->reason->value,
            'balance_after' => $this->balance_after,
            'listing_id' => $this->listing_id,
            'store' => $this->store?->value,
            'price_paid_eur' => $this->price_paid_eur,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
