<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The seller as a buyer sees them. Deliberately narrower than UserResource: no
 * credit balance, no language, no email.
 *
 * @mixin User
 */
class SellerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'display_name' => $this->display_name,
            'seller_type' => $this->seller_type->value,
            'dealer_name' => $this->dealer_name,
            'phone' => $this->phone,
            'city' => CityResource::make($this->whenLoaded('city')),
            'member_since' => $this->created_at?->toIso8601String(),
        ];
    }
}
