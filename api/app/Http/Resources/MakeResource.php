<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\VehicleType;
use App\Models\Make;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Make
 */
class MakeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            // Whether this make leads the picker, for the kind of vehicle the
            // request asked about. BMW leads both; Suzuki leads only one.
            'popular' => $this->popularFor(
                VehicleType::tryFrom((string) $request->query('type')) ?? VehicleType::Car,
            ),
            'sells' => array_values(array_filter(
                VehicleType::values(),
                fn (string $type): bool => $this->sells(VehicleType::from($type)),
            )),
            // Null until a logo file has been added for this make; the apps
            // draw a monogram from the name in the meantime.
            'logo_url' => $this->logo_path === null
                ? null
                : Storage::disk((string) config('filesystems.default'))->url($this->logo_path),
            'models' => VehicleModelResource::collection($this->whenLoaded('models')),
        ];
    }
}
