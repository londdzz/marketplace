<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Make;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
            'models' => VehicleModelResource::collection($this->whenLoaded('models')),
        ];
    }
}
