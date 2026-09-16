<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Prices are euro only. The apps convert to the local currency at display time
 * from GET /exchange-rates, which is why no converted amount appears here.
 *
 * @mixin Listing
 */
class ListingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'make_id' => $this->make_id,
            'model_id' => $this->model_id,
            'make' => MakeResource::make($this->whenLoaded('make')),
            'model' => VehicleModelResource::make($this->whenLoaded('model')),
            'variant' => $this->variant,
            'year' => $this->year,
            'mileage_km' => $this->mileage_km,
            'fuel' => $this->fuel?->value,
            'transmission' => $this->transmission?->value,
            'body_type' => $this->body_type,
            'engine_cc' => $this->engine_cc,
            'power_hp' => $this->power_hp,
            'drivetrain' => $this->drivetrain,
            'color' => $this->color,
            'doors' => $this->doors,
            'seats' => $this->seats,
            'price_eur' => $this->price_eur,
            'price_negotiable' => $this->price_negotiable,
            'vat_deductible' => $this->vat_deductible,
            'customs_cleared' => $this->customs_cleared,
            'description' => $this->description,
            'features' => $this->features ?? [],
            'country_code' => $this->country_code,
            'city_id' => $this->city_id,
            'city' => CityResource::make($this->whenLoaded('city')),
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'photos' => ListingPhotoResource::collection($this->whenLoaded('photos')),
            'photo_count' => $this->whenCounted('photos'),
            'seller' => SellerResource::make($this->whenLoaded('user')),
            'view_count' => $this->view_count,
            'contact_count' => $this->contact_count,
            'is_featured' => $this->isFeatured(),
            'published_at' => $this->published_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'bumped_at' => $this->bumped_at?->toIso8601String(),
            'featured_until' => $this->featured_until?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
