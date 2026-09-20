<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The ways into the catalogue that are not a search box: curated collections
 * and body shapes, each with the number of live cars behind it.
 *
 * Keys and filters, never wording. A collection's filters travel with it so
 * the app can put them straight into the search it already runs, rather than
 * keeping its own second copy of what "a family car" means.
 *
 * @property-read array{collections: array<int, array<string, mixed>>, body_types: array<int, array<string, mixed>>} $resource
 */
class BrowseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'collections' => array_map(static fn (array $entry): array => [
                'key' => $entry['key'],
                'filters' => (object) $entry['filters'],
                'count' => $entry['count'],
                'photo_url' => $entry['photo'],
            ], $this->resource['collections']),

            'body_types' => array_map(static fn (array $entry): array => [
                'key' => $entry['key'],
                'count' => $entry['count'],
                'photo_url' => $entry['photo'],
            ], $this->resource['body_types']),
        ];
    }
}
