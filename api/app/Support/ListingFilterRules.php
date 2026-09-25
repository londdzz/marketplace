<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\FuelType;
use App\Enums\Transmission;
use App\Enums\VehicleType;
use Illuminate\Validation\Rule;

/**
 * The search filters, in one place.
 *
 * The search endpoint validates them at the top level; a saved search validates
 * the same set nested under "filters", so a saved search can never hold a
 * filter the search endpoint would reject.
 *
 * The shapes allowed depend on what kind of vehicle is being searched for: a
 * car comes in a saloon or an estate, a motorcycle in a naked or a scooter, and
 * neither vocabulary means anything applied to the other.
 */
final class ListingFilterRules
{
    /**
     * @param  string  $prefix  where the filters sit in the payload, empty for
     *                          the top level and "filters" for a saved search
     * @return array<string, mixed>
     */
    public static function rules(string $prefix = '', ?VehicleType $type = null): array
    {
        $key = static fn (string $name): string => $prefix === '' ? $name : $prefix.'.'.$name;
        $type ??= VehicleType::Car;

        return [
            $key('q') => ['sometimes', 'nullable', 'string', 'max:120'],
            // Absent means cars. Everything in the catalogue was a car until
            // motorcycles arrived, and a search that does not say which it
            // wants means what it has always meant.
            $key('vehicle_type') => ['sometimes', 'nullable', Rule::enum(VehicleType::class)],
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
            // A list, like fuel: a buyer looking for a city car means a
            // hatchback or a coupé, not one or the other.
            $key('body_type') => ['sometimes', 'nullable', 'array'],
            $key('body_type').'.*' => [Rule::in($type->bodyTypes())],
            $key('countries') => ['sometimes', 'nullable', 'array'],
            $key('countries').'.*' => ['string', 'size:2', Rule::exists('countries', 'code')],
            $key('city_id') => ['sometimes', 'nullable', 'integer', Rule::exists('cities', 'id')],
            $key('radius_km') => ['sometimes', 'nullable', 'numeric', 'min:1', 'max:'.config('listings.search.max_radius_km')],
            $key('lat') => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            $key('lng') => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            $key('sort') => ['sometimes', 'nullable', Rule::in(['relevance', 'price_asc', 'price_desc', 'newest', 'mileage_asc'])],
        ];
    }

    /**
     * Which kind of vehicle a payload is asking about, whatever it sent.
     *
     * This runs before validation, to pick the vocabulary the shape filter is
     * then checked against, so it has to cope with a value that is about to be
     * rejected. Anything unrecognised resolves to cars and the enum rule is
     * what reports it.
     */
    public static function type(mixed $value): VehicleType
    {
        return VehicleType::tryFrom(is_string($value) ? $value : '') ?? VehicleType::Car;
    }
}
