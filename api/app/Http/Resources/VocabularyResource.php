<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The closed vocabularies a listing is validated against: body types,
 * drivetrains, colours and feature keys.
 *
 * Keys only. The apps hold the wording, in five languages, and the API holds
 * what is allowed, which is the only copy that can reject anything.
 *
 * @property-read array<string, array<int, string>> $resource
 */
class VocabularyResource extends JsonResource
{
    /**
     * @return array<string, array<int, string>>
     */
    public function toArray(Request $request): array
    {
        return [
            'vehicle_types' => array_values($this->resource['vehicle_types']),
            'body_types' => array_values($this->resource['body_types']),
            'motorcycle_types' => array_values($this->resource['motorcycle_types']),
            'drivetrains' => array_values($this->resource['drivetrains']),
            'colors' => array_values($this->resource['colors']),
            'features' => array_values($this->resource['features']),
        ];
    }
}
