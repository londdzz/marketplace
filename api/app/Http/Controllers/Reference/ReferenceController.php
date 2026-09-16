<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reference;

use App\Http\Controllers\Controller;
use App\Http\Resources\CityResource;
use App\Http\Resources\CountryResource;
use App\Http\Resources\ExchangeRateResource;
use App\Http\Resources\MakeResource;
use App\Http\Resources\VehicleModelResource;
use App\Models\City;
use App\Models\Country;
use App\Models\ExchangeRate;
use App\Models\Make;
use App\Models\VehicleModel;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

/**
 * Public reference data behind the pickers and filters. It changes rarely, so
 * every list is cached.
 */
class ReferenceController extends Controller
{
    public function countries(): AnonymousResourceCollection
    {
        $countries = $this->remember('countries', fn () => Country::query()
            ->where('active', true)
            ->orderBy('code')
            ->get());

        return CountryResource::collection($countries);
    }

    public function cities(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'country' => ['sometimes', 'nullable', 'string', 'size:2', Rule::exists('countries', 'code')],
        ]);

        $country = isset($validated['country']) ? strtoupper((string) $validated['country']) : null;

        $cities = $this->remember('cities:'.($country ?? 'all'), fn () => City::query()
            ->when($country, fn ($query, $code) => $query->where('country_code', $code))
            ->orderByDesc('population')
            ->orderBy('name')
            ->get());

        return CityResource::collection($cities);
    }

    public function makes(): AnonymousResourceCollection
    {
        $makes = $this->remember('makes', fn () => Make::query()
            ->orderByDesc('popular')
            ->orderBy('name')
            ->get());

        return MakeResource::collection($makes);
    }

    public function models(Make $make): AnonymousResourceCollection
    {
        $models = $this->remember('models:'.$make->getKey(), fn () => VehicleModel::query()
            ->where('make_id', $make->getKey())
            ->orderBy('name')
            ->get());

        return VehicleModelResource::collection($models);
    }

    public function exchangeRates(): AnonymousResourceCollection
    {
        $rates = $this->remember('exchange-rates', fn () => ExchangeRate::query()
            ->orderBy('currency')
            ->get());

        return ExchangeRateResource::collection($rates);
    }

    /**
     * @template TValue
     *
     * @param  \Closure(): TValue  $callback
     * @return TValue
     */
    private function remember(string $key, \Closure $callback): mixed
    {
        return Cache::remember(
            'reference:'.$key,
            (int) config('listings.reference_cache_seconds'),
            $callback,
        );
    }
}
