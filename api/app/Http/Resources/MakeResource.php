<?php

declare(strict_types=1);

namespace App\Http\Resources;

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
            'popular' => $this->popular,
            // Null until a logo file has been added for this make; the apps
            // draw a monogram from the name in the meantime.
            'logo_url' => $this->logo_path === null
                ? null
                : Storage::disk((string) config('filesystems.default'))->url($this->logo_path),
            'models' => VehicleModelResource::collection($this->whenLoaded('models')),
        ];
    }
}
