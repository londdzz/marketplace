<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A bare acknowledgement for endpoints that have nothing else to return, such
 * as logging out or deleting an account. The value is always a translated
 * string, never a literal.
 *
 * @mixin string
 */
class MessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'message' => (string) $this->resource,
        ];
    }
}
