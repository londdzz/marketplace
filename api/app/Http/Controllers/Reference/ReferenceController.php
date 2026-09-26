<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reference;

use App\Enums\VehicleType;
use App\Http\Controllers\Controller;
use App\Http\Resources\BrowseResource;
use App\Http\Resources\CityResource;
use App\Http\Resources\CountryResource;
use App\Http\Resources\ExchangeRateResource;
use App\Http\Resources\MakeResource;
use App\Http\Resources\SponsorResource;
use App\Http\Resources\VehicleModelResource;
use App\Http\Resources\VocabularyResource;
use App\Models\City;
use App\Models\Country;
use App\Models\ExchangeRate;
use App\Models\Make;
use App\Models\VehicleModel;
use App\Services\BrowseService;
use App\Services\SponsorService;
use Illuminate\Http\JsonResponse;
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

        // Only towns in a market that is open. `countries.active` decides
        // everywhere else — /countries, creating a listing, the dialling
        // prefixes — and an unfiltered /cities was the one place it did not,
        // so the sell form offered Tirana and the API then refused it.
        $cities = $this->remember('cities:'.($country ?? 'all'), fn () => City::query()
            ->whereHas('country', fn ($query) => $query->where('active', true))
            ->when($country, fn ($query, $code) => $query->where('country_code', $code))
            ->orderByDesc('population')
            ->orderBy('name')
            ->get());

        return CityResource::collection($cities);
    }

    /**
     * The makes that sell the kind of vehicle being asked about, the ones that
     * lead the picker first.
     *
     * Which makes lead is a different answer per kind — Suzuki is an also-ran
     * among cars here and one of the first names in bikes — so both the filter
     * and the ordering follow the type.
     */
    public function makes(Request $request): AnonymousResourceCollection
    {
        $type = $this->vehicleType($request);

        $makes = $this->remember('makes:'.$type->value, fn () => Make::query()
            ->selling($type)
            ->orderByDesc($type === VehicleType::Motorcycle ? 'popular_motorcycles' : 'popular')
            ->orderBy('name')
            ->get());

        return MakeResource::collection($makes);
    }

    public function models(Request $request, Make $make): AnonymousResourceCollection
    {
        $type = $this->vehicleType($request);

        $models = $this->remember('models:'.$make->getKey().':'.$type->value, fn () => VehicleModel::query()
            ->where('make_id', $make->getKey())
            ->where('vehicle_type', $type)
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
     * The closed vocabularies behind the sell flow's pickers.
     *
     * They come from configuration rather than the database, so they are not
     * cached: reading them costs nothing.
     */
    public function vocabularies(): VocabularyResource
    {
        return VocabularyResource::make([
            'vehicle_types' => VehicleType::values(),
            'body_types' => (array) config('listings.body_types'),
            // A motorcycle's shape goes in the same column and is validated
            // against its own list, so both lists are served and the sell flow
            // shows whichever belongs to what is being sold.
            'motorcycle_types' => (array) config('listings.motorcycle_types'),
            'drivetrains' => (array) config('listings.drivetrains'),
            'colors' => (array) config('listings.colors'),
            'features' => (array) config('listings.features'),
        ]);
    }

    /**
     * The home screen's ways in: curated collections and body shapes, each
     * with the number of live cars behind it.
     *
     * Counted rather than cached against a guess, and the count is the point:
     * a category that says how many cars are in it is a category a buyer can
     * decide about before tapping.
     */
    public function browse(Request $request, BrowseService $browse): BrowseResource
    {
        return BrowseResource::make($browse->sections($request->user(), $this->vehicleType($request)));
    }

    /**
     * The advertisements booked for the home screen, by slot.
     *
     * Read only, and there is no companion that writes: a sponsor is added on
     * the server with `sponsors:add`. An advertisement anybody could submit is
     * an advertisement nobody is checking.
     *
     * Public, like the rest of the reference data — a buyer with no account
     * sees the same sponsors as one with.
     */
    public function sponsors(Request $request, SponsorService $sponsors): JsonResponse
    {
        $slots = $sponsors->forHome($this->vehicleType($request));

        return response()->json([
            'data' => array_map(
                static fn ($booked): array => SponsorResource::collection($booked)->resolve(),
                $slots,
            ),
        ]);
    }

    /**
     * Which kind of vehicle a reference request is about, cars unless told
     * otherwise. An unknown value is rejected rather than quietly read as a
     * car, so a typo in a client shows up as a typo.
     */
    private function vehicleType(Request $request): VehicleType
    {
        $validated = $request->validate([
            'type' => ['sometimes', 'nullable', Rule::enum(VehicleType::class)],
        ]);

        return VehicleType::tryFrom((string) ($validated['type'] ?? '')) ?? VehicleType::Car;
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
