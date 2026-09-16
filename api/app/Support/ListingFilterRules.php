<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\FuelType;
use App\Enums\Transmission;
use Illuminate\Validation\Rule;

/**
 * The search filters, in one place.
 *
 * The search endpoint validates them at the top level; a saved search validates
 * the same set nested under "filters", so a saved search can never hold a
 * filter the search endpoint would reject.
 */
final class ListingFilterRules
{
    /**
     * @return array<string, mixed>
     */
    public static function rules(string $prefix = ''): array
    {
        $key = static fn (string $name): string => $prefix === '' ? $name : $prefix.'.'.$name;

        return [
            $key('q') => ['sometimes', 'nullable', 'string', 'max:120'],
            $key('make_id') => ['sometimes', 'nullable', 'integer', Rule::exists('makes', 'id')],
            $key('model_id') => ['sometimes', 'nullable', 'integer', Rule::exists('models', 'id')],
            $key('year_min') => ['sometimes', 'nullable', 'integer', 'min:'.config('listings.year_min')],
            $key('year_max') => ['sometimes', 'nullable', 'integer', 'min:'.config('listings.year_min')],
            $key('price_min') => ['sometimes', 'nullable', 'numeric', 'min:0'],
            $key('price_max') => ['sometimes', 'nullable', 'numeric', 'min:0'],
            $key('mileage_max') => ['sometimes', 'nullable', 'integer', 'min:0'],
            $key('fuel') => ['sometimes', 'nullable', 'array'],
            $key('fuel').'.*' => [Rule::enum(FuelType::class)],
            $key('transmission') => ['sometimes', 'nullable', Rule::enum(Transmission::class)],
            $key('body_type') => ['sometimes', 'nullable', Rule::in(config('listings.body_types'))],
            $key('countries') => ['sometimes', 'nullable', 'array'],
            $key('countries').'.*' => ['string', 'size:2', Rule::exists('countries', 'code')],
            $key('city_id') => ['sometimes', 'nullable', 'integer', Rule::exists('cities', 'id')],
            $key('radius_km') => ['sometimes', 'nullable', 'numeric', 'min:1', 'max:'.config('listings.search.max_radius_km')],
            $key('lat') => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            $key('lng') => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            $key('sort') => ['sometimes', 'nullable', Rule::in(['relevance', 'price_asc', 'price_desc', 'newest', 'mileage_asc'])],
        ];
    }
}
