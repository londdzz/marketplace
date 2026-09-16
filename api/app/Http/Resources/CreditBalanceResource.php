<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Data\CreditBalance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CreditBalance
 */
class CreditBalanceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'balance' => $this->balance,
            'packs' => $this->packs,
            'history' => [
                'data' => CreditTransactionResource::collection($this->history->items()),
                'meta' => [
                    'current_page' => $this->history->currentPage(),
                    'last_page' => $this->history->lastPage(),
                    'per_page' => $this->history->perPage(),
                    'total' => $this->history->total(),
                ],
            ],
        ];
    }
}
