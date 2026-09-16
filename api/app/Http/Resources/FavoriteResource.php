<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Favorite;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Favorite
 */
class FavoriteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'listing_id' => $this->listing_id,
            'listing' => ListingResource::make($this->whenLoaded('listing')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
