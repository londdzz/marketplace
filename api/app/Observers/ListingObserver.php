<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\City;
use App\Models\Listing;
use App\Models\Make;
use App\Models\VehicleModel;
use App\Support\TextNormalizer;

/**
 * Keeps a listing's searchable text in step with the listing.
 *
 * Everything a buyer might type is flattened into one normalized, script
 * insensitive column, which is the column search queries against. A query in
 * Cyrillic and the same query in Latin both normalize to the same tokens, so
 * both find the same cars.
 */
class ListingObserver
{
    /**
     * Names looked up while handling one request, so saving many listings in a
     * row does not re-query the same make over and over.
     *
     * @var array<string, string|null>
     */
    private array $names = [];

    /**
     * The fields the searchable text is built from.
     *
     * @var array<int, string>
     */
    private const SOURCES = [
        'make_id',
        'model_id',
        'variant',
        'year',
        'body_type',
        'fuel',
        'transmission',
        'color',
        'description',
        'city_id',
        'country_code',
    ];

    public function saving(Listing $listing): void
    {
        if ($listing->exists && $listing->search_text !== null && ! $listing->isDirty(self::SOURCES)) {
            return;
        }

        $listing->search_text = $this->build($listing);
    }

    public function build(Listing $listing): string
    {
        return TextNormalizer::normalizeParts([
            $this->makeName($listing->make_id),
            $this->modelName($listing->model_id),
            $listing->variant,
            $listing->year === null ? null : (string) $listing->year,
            $listing->body_type,
            $listing->fuel?->value,
            $listing->transmission?->value,
            $listing->color,
            $this->cityName($listing->city_id),
            $listing->country_code,
            $listing->description,
        ]);
    }

    private function makeName(?int $id): ?string
    {
        return $this->remember('make', $id, fn (): ?string => Make::query()->whereKey($id)->value('name'));
    }

    private function modelName(?int $id): ?string
    {
        return $this->remember('model', $id, fn (): ?string => VehicleModel::query()->whereKey($id)->value('name'));
    }

    private function cityName(?int $id): ?string
    {
        return $this->remember('city', $id, fn (): ?string => City::query()->whereKey($id)->value('name'));
    }

    /**
     * @param  \Closure(): (string|null)  $callback
     */
    private function remember(string $kind, ?int $id, \Closure $callback): ?string
    {
        if ($id === null) {
            return null;
        }

        $key = $kind.':'.$id;

        return $this->names[$key] ??= $callback();
    }
}
