<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'display_name' => $this->display_name,
            'phone' => $this->phone,
            'phone_verified_at' => $this->phone_verified_at?->toIso8601String(),
            'country_code' => $this->country_code,
            'city_id' => $this->city_id,
            'city' => CityResource::make($this->whenLoaded('city')),
            'preferred_language' => $this->preferred_language,
            'seller_type' => $this->seller_type->value,
            'dealer_name' => $this->dealer_name,
            // Not null in the database, so a model that has not read the
            // column back still reports the truthful zero.
            'credits' => (int) $this->credits,
            // Set once the home screen's one question has been answered, so
            // it knows not to ask again.
            'rated_at' => $this->rated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
