<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Someone this account has blocked, as the block list shows them: enough to
 * recognise who it is, and nothing else.
 *
 * @mixin User
 */
class BlockedUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'display_name' => $this->display_name,
            'dealer_name' => $this->dealer_name,
            'seller_type' => $this->seller_type->value,
            'blocked_at' => $this->whenPivotLoaded('user_blocks', fn () => $this->pivot->created_at?->toIso8601String()),
        ];
    }
}
