<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\DeviceToken;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DeviceToken
 */
class DeviceTokenResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'platform' => $this->platform->value,
            'last_seen_at' => $this->last_seen_at?->toIso8601String(),
        ];
    }
}
